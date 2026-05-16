import { Request, Response } from 'express';
import { body } from 'express-validator';
import { z } from 'zod';
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  UpdateProfileRequestSchema,
} from '@adopt-dont-shop/lib.validation';
import AuthService from '../services/auth.service';
import { UserService } from '../services/user.service';
import User from '../models/User';
import { AuthenticatedRequest } from '../types';
import { validateBody } from '../middleware/zod-validate';
import { logger } from '../utils/logger';

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
};

const ACCESS_TOKEN_COOKIE = 'accessToken';
const ACCESS_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

export const authValidation = {
  register: validateBody(RegisterRequestSchema),
  login: validateBody(LoginRequestSchema),
  forgotPassword: validateBody(RequestPasswordResetSchema),
  resetPassword: validateBody(ResetPasswordSchema),
  resendVerification: validateBody(RequestPasswordResetSchema.pick({ email: true })),
  updateProfile: validateBody(UpdateProfileRequestSchema),

  // Not yet migrated to Zod — small, self-contained shapes.
  refreshToken: [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  twoFactorEnable: validateBody(
    z.object({
      secret: z.string().min(1, 'Secret is required'),
      token: z.string().length(6, 'Verification code must be 6 digits'),
    })
  ),
  twoFactorDisable: validateBody(
    z.object({
      token: z.string().length(6, 'Verification code must be 6 digits'),
    })
  ),
};

export class AuthController {
  /**
   * Register a new user.
   *
   * ADS-538: returns 201 with no auth tokens / cookies. The user must
   * verify their email and then log in normally before they can call
   * authenticated endpoints.
   */
  async register(req: Request, res: Response): Promise<void> {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.login(req.body);

      res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
      res.cookie(ACCESS_TOKEN_COOKIE, result.token, ACCESS_TOKEN_COOKIE_OPTIONS);

      const { refreshToken: _, ...responseBody } = result;
      res.json(responseBody);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Login failed:', error);

      if (
        errorMessage.includes('Invalid credentials') ||
        errorMessage.includes('Please verify your email') ||
        errorMessage.includes('Account is temporarily locked')
      ) {
        res.status(401).json({ error: errorMessage });
        return;
      }

      res.status(400).json({ error: errorMessage });
    }
  }

  /**
   * Logout user
   */
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] ?? req.body.refreshToken;
    const accessToken = req.headers.authorization?.split(' ')[1];

    await AuthService.logout(refreshToken, accessToken, req.user?.userId);

    res.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE_OPTIONS);
    res.clearCookie(ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE_OPTIONS);

    res.json({ message: 'Logged out successfully' });
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] ?? req.body.refreshToken;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    // Catch retained on purpose: any failure of the refresh flow — bad
    // token, expired token, revoked token, internal error — is collapsed
    // to a 401 so the client cannot distinguish failure modes (avoids
    // token-state oracle). Letting this propagate to the central error
    // handler would surface 500s and leak server-side detail.
    try {
      const result = await AuthService.refreshToken(refreshToken);

      res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
      res.cookie(ACCESS_TOKEN_COOKIE, result.token, ACCESS_TOKEN_COOKIE_OPTIONS);

      const { refreshToken: _, ...responseBody } = result;
      res.json(responseBody);
    } catch (error) {
      logger.error('Token refresh failed:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    const authService = new AuthService();
    const result = await authService.requestPasswordReset(req.body);
    res.json(result);
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const authService = new AuthService();
      const result = await authService.confirmPasswordReset(req.body);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Password reset confirmation failed:', error);

      if (errorMessage.includes('Invalid or expired')) {
        res.status(400).json({ error: errorMessage });
        return;
      }

      res.status(500).json({ error: 'Failed to reset password' });
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body as { token?: string };
      if (!token) {
        res.status(400).json({ error: 'Verification token is required' });
        return;
      }
      const authService = new AuthService();
      const result = await authService.verifyEmail(token);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Email verification failed:', error);

      if (errorMessage.includes('Invalid or expired')) {
        res.status(400).json({ error: errorMessage });
        return;
      }

      res.status(500).json({ error: 'Failed to verify email' });
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    const authService = new AuthService();
    const result = await authService.resendVerificationEmail(email);
    res.json(result);
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Simply return the authenticated user from the request
    res.json(req.user);
  }

  /**
   * Generate 2FA secret and QR code for setup
   */
  async twoFactorSetup(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;

    if (user.twoFactorEnabled) {
      res.status(400).json({ error: 'Two-factor authentication is already enabled' });
      return;
    }

    const { secret, otpauthUrl } = AuthService.generateTwoFactorSecret(user.email);
    const qrCodeDataUrl = await AuthService.generateQrCodeDataUrl(otpauthUrl);

    res.json({ secret, qrCodeDataUrl });
  }

  /**
   * Enable 2FA after verifying the setup token
   */
  async twoFactorEnable(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { secret, token } = req.body;

      const result = await AuthService.enableTwoFactor(userId, secret, token);
      res.json({ success: true, backupCodes: result.backupCodes });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('2FA enable failed:', error);

      if (errorMessage.includes('Invalid verification code')) {
        res.status(400).json({ error: errorMessage });
        return;
      }

      res.status(500).json({ error: 'Failed to enable two-factor authentication' });
    }
  }

  /**
   * Disable 2FA after verifying current token
   */
  async twoFactorDisable(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { token } = req.body;

    if (!req.user!.twoFactorEnabled) {
      res.status(400).json({ error: 'Two-factor authentication is not enabled' });
      return;
    }

    // Fetch user with secrets to access twoFactorSecret
    const userWithSecret = await User.scope('withSecrets').findByPk(userId);
    if (!userWithSecret || !userWithSecret.twoFactorSecret) {
      res.status(400).json({ error: 'Two-factor authentication secret not found' });
      return;
    }

    // Verify current TOTP before disabling
    const isValid = AuthService.verifyTwoFactorSetupToken(userWithSecret.twoFactorSecret, token);
    if (!isValid) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    await AuthService.disableTwoFactor(userId);
    res.json({ success: true, message: 'Two-factor authentication has been disabled' });
  }

  /**
   * Regenerate backup codes
   */
  async twoFactorRegenerateBackupCodes(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;

    if (!user.twoFactorEnabled) {
      res.status(400).json({ error: 'Two-factor authentication is not enabled' });
      return;
    }

    const backupCodes = AuthService.generateBackupCodes();

    // Need to fetch the user with write access to update
    const dbUser = await User.findByPk(user.userId);
    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    dbUser.backupCodes = backupCodes;
    await dbUser.save();

    res.json({ success: true, backupCodes });
  }

  /**
   * Update current user profile
   */
  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const updateData = req.body;

      const updatedUser = await UserService.updateUserProfile(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Update profile failed:', error);

      if (errorMessage === 'User not found') {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
}

export default new AuthController();
