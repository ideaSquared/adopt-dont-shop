import { Request, Response } from 'express';
import { body } from 'express-validator';
import { z } from 'zod';
import {
  ConfirmTwoFactorRecoverySchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  RequestPasswordResetSchema,
  RequestTwoFactorRecoverySchema,
  ResetPasswordSchema,
  UpdateProfileRequestSchema,
} from '@adopt-dont-shop/lib.validation';
import AuthService from '../services/auth.service';
import { UserService } from '../services/user.service';
import User from '../models/User';
import { AuthenticatedRequest } from '../types';
import { validateBody } from '../middleware/zod-validate';
import { clearCsrfSessionCookie, rotateCsrfSessionCookie } from '../middleware/csrf';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from '../services/auditLog.service';

export const REFRESH_TOKEN_COOKIE = 'refreshToken';
export const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
};

export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const ACCESS_TOKEN_COOKIE_OPTIONS = {
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
  requestTwoFactorRecovery: validateBody(RequestTwoFactorRecoverySchema),
  confirmTwoFactorRecovery: validateBody(ConfirmTwoFactorRecoverySchema),
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
  twoFactorRegenerateBackupCodes: validateBody(
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
      const result = await AuthService.login(req.body, req.ip, req.get('user-agent'));

      res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
      res.cookie(ACCESS_TOKEN_COOKIE, result.token, ACCESS_TOKEN_COOKIE_OPTIONS);

      // ADS-547: rotate the CSRF session identifier on the auth state
      // transition (covers both password-only and 2FA-gated logins —
      // AuthService.login performs the 2FA check inline before returning a
      // token) so an attacker who pre-planted a session cookie on the
      // victim's browser cannot reuse the bound CSRF token post-login.
      rotateCsrfSessionCookie(res);

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

    await AuthService.logout(
      refreshToken,
      accessToken,
      req.user?.userId,
      req.ip,
      req.get('user-agent')
    );

    res.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE_OPTIONS);
    res.clearCookie(ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE_OPTIONS);
    // ADS-547: clear the CSRF session identifier alongside the auth tokens so
    // the next anonymous request mints a fresh identifier instead of reusing
    // the one tied to the now-terminated authenticated session.
    clearCsrfSessionCookie(res);

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

    // ADS-599: server stores the pending secret encrypted; the response
    // still includes the secret so the user can copy it into their
    // authenticator, but enableTwoFactor will *not* trust whatever the
    // client posts back.
    const { secret, otpauthUrl } = await AuthService.initiateTwoFactorSetup(
      user.userId,
      user.email
    );
    const qrCodeDataUrl = await AuthService.generateQrCodeDataUrl(otpauthUrl);

    res.json({ secret, qrCodeDataUrl });
  }

  /**
   * Enable 2FA after verifying the setup token
   */
  async twoFactorEnable(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { token } = req.body;

      // ADS-599: secret is no longer accepted from the client; the
      // pending secret stored at twoFactorSetup time is used.
      const result = await AuthService.enableTwoFactor(userId, token);
      res.json({ success: true, backupCodes: result.backupCodes });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('2FA enable failed:', error);

      if (
        errorMessage.includes('Invalid verification code') ||
        errorMessage.includes('setup has not been initiated') ||
        errorMessage.includes('setup has expired')
      ) {
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
   * Regenerate backup codes — requires a valid TOTP to prevent session-hijack abuse (ADS-593).
   */
  async twoFactorRegenerateBackupCodes(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const { token } = req.body;

    if (!user.twoFactorEnabled) {
      res.status(400).json({ error: 'Two-factor authentication is not enabled' });
      return;
    }

    const userWithSecret = await User.scope('withSecrets').findByPk(user.userId);
    if (!userWithSecret || !userWithSecret.twoFactorSecret) {
      res.status(400).json({ error: 'Two-factor authentication secret not found' });
      return;
    }

    const isValid = AuthService.verifyTwoFactorSetupToken(userWithSecret.twoFactorSecret, token);
    if (!isValid) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    const backupCodes = AuthService.generateBackupCodes();

    const dbUser = await User.findByPk(user.userId);
    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    dbUser.backupCodes = backupCodes;
    await dbUser.save();

    await AuditLogService.log({
      userId: user.userId,
      action: 'TWO_FACTOR_BACKUP_CODES_REGENERATED',
      entity: 'User',
      entityId: user.userId,
      details: { email: user.email },
    });

    loggerHelpers.logSecurity('2FA backup codes regenerated', { userId: user.userId });

    res.json({ success: true, backupCodes });
  }

  /**
   * Batch KK: request an email-bootstrapped 2FA recovery link.
   *
   * Pre-auth. Always returns the same generic 200 message regardless of
   * whether the email matches a user or whether that user has 2FA on —
   * enumeration-resistant, same shape as forgot-password.
   *
   * TODO(frontend): wire up the "Lost your 2FA device?" link on the 2FA
   * challenge page (app.client, app.admin, app.rescue) to call this
   * endpoint, and add a /auth/2fa/recover page that consumes the token
   * query param and posts to /2fa/recover/confirm below. Deferred from
   * the backend batch — see Batch KK report.
   */
  async requestTwoFactorRecovery(req: Request, res: Response): Promise<void> {
    const authService = new AuthService();
    const result = await authService.requestTwoFactorRecovery(
      req.body,
      req.ip,
      req.get('user-agent')
    );
    res.json(result);
  }

  /**
   * Batch KK: confirm a 2FA recovery token from the emailed link.
   *
   * Pre-auth. Disables 2FA + revokes all sessions atomically and emails
   * the user a heads-up so they can react if the recovery wasn't theirs.
   */
  async confirmTwoFactorRecovery(req: Request, res: Response): Promise<void> {
    try {
      const authService = new AuthService();
      const result = await authService.confirmTwoFactorRecovery(req.body);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('2FA recovery confirmation failed:', error);

      if (errorMessage.includes('Invalid or expired')) {
        res.status(400).json({ error: errorMessage });
        return;
      }

      res.status(500).json({ error: 'Failed to confirm two-factor recovery' });
    }
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
