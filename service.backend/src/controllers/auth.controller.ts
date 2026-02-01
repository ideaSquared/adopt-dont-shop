import { Request, Response } from 'express';
import { body } from 'express-validator';
import AuthService from '../services/auth.service';
import { UserService } from '../services/user.service';
import User from '../models/User';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

// Validation rules
export const authValidation = {
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('first_name')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name is required and must be less than 50 characters'),
    body('last_name')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name is required and must be less than 50 characters'),
    body('phone_number')
      .optional()
      .isMobilePhone('en-GB')
      .withMessage('Please provide a valid UK mobile number'),
    body('user_type')
      .optional()
      .isIn(['ADOPTER', 'RESCUE_STAFF', 'ADMIN'])
      .withMessage('Invalid user type'),
  ],

  login: [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
    body('twoFactorToken')
      .optional()
      .isLength({ min: 6, max: 8 })
      .withMessage('Two-factor token must be 6-8 characters'),
  ],

  forgotPassword: [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  ],

  resetPassword: [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
  ],

  refreshToken: [body('refreshToken').notEmpty().withMessage('Refresh token is required')],

  resendVerification: [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  ],

  twoFactorEnable: [
    body('secret').notEmpty().withMessage('Secret is required'),
    body('token').isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits'),
  ],

  twoFactorDisable: [
    body('token').isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits'),
  ],

  updateProfile: [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be 1-50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be 1-50 characters'),
    body('phoneNumber')
      .optional()
      .isMobilePhone('en-GB')
      .withMessage('Please provide a valid UK mobile number'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must be max 500 characters'),
    body('profileImageUrl').optional().isURL().withMessage('Profile image must be a valid URL'),
    body('location.city')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('City must be max 100 characters'),
    body('location.country')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Country must be max 100 characters'),
    body('location.address')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Address must be max 255 characters'),
    body('location.zipCode')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Zip code must be max 20 characters'),
  ],
};

export class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Registration failed:', error);

      if (errorMessage.includes('already exists')) {
        res.status(409).json({ error: errorMessage });
        return;
      }

      res.status(400).json({ error: errorMessage });
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      res.json(result);
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
    try {
      const refreshToken = req.body.refreshToken;
      const result = await AuthService.logout(refreshToken);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Logout failed:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
      }

      const result = await AuthService.refreshToken(refreshToken);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Token refresh failed:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const authService = new AuthService();
      const result = await authService.requestPasswordReset(req.body);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Password reset request failed:', error);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
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
      const { token } = req.params;
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
    try {
      const { email } = req.body;
      const authService = new AuthService();
      const result = await authService.resendVerificationEmail(email);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Resend verification email failed:', error);
      res.status(500).json({ error: 'Failed to resend verification email' });
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Simply return the authenticated user from the request
      res.json(req.user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Get current user failed:', error);
      res.status(500).json({ error: 'Failed to get user profile' });
    }
  }

  /**
   * Generate 2FA secret and QR code for setup
   */
  async twoFactorSetup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;

      if (user.twoFactorEnabled) {
        res.status(400).json({ error: 'Two-factor authentication is already enabled' });
        return;
      }

      const { secret, otpauthUrl } = AuthService.generateTwoFactorSecret(user.email);
      const qrCodeDataUrl = await AuthService.generateQrCodeDataUrl(otpauthUrl);

      res.json({ secret, qrCodeDataUrl });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('2FA setup failed:', error);
      res.status(500).json({ error: 'Failed to set up two-factor authentication' });
    }
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
    try {
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
    } catch (error) {
      logger.error('2FA disable failed:', error);
      res.status(500).json({ error: 'Failed to disable two-factor authentication' });
    }
  }

  /**
   * Regenerate backup codes
   */
  async twoFactorRegenerateBackupCodes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
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
    } catch (error) {
      logger.error('Backup codes regeneration failed:', error);
      res.status(500).json({ error: 'Failed to regenerate backup codes' });
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
