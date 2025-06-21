import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import AuthService, { LoginCredentials, RegisterData } from '../services/auth.service';
import { logger, loggerHelpers } from '../utils/logger';

export class AuthController {
  // Registration endpoint
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const userData: RegisterData = req.body;
      const result = await AuthService.register(userData);

      loggerHelpers.logRequest(req);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Registration error:', error);

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            error: 'Registration failed',
            message: error.message,
          });
          return;
        }

        if (error.message.includes('Password must')) {
          res.status(400).json({
            error: 'Validation failed',
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Registration failed',
        message: 'An error occurred during registration',
      });
    }
  }

  // Login endpoint
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const credentials: LoginCredentials = req.body;
      const ipAddress = req.ip;

      const result = await AuthService.login(credentials, ipAddress);

      loggerHelpers.logRequest(req);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      logger.error('Login error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Invalid credentials')) {
          res.status(401).json({
            error: 'Authentication failed',
            message: 'Invalid email or password',
          });
          return;
        }

        if (error.message.includes('locked')) {
          res.status(423).json({
            error: 'Account locked',
            message: error.message,
          });
          return;
        }

        if (error.message.includes('verify your email')) {
          res.status(403).json({
            error: 'Email verification required',
            message: error.message,
          });
          return;
        }

        if (error.message.includes('Two-factor')) {
          res.status(422).json({
            error: '2FA required',
            message: error.message,
            requiresTwoFactor: true,
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login',
      });
    }
  }

  // Refresh token endpoint
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: 'Bad request',
          message: 'Refresh token is required',
        });
        return;
      }

      const result = await AuthService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Token refresh error:', error);

      res.status(401).json({
        error: 'Token refresh failed',
        message: 'Invalid refresh token',
      });
    }
  }

  // Password reset request
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { email } = req.body;
      await AuthService.requestPasswordReset({ email });

      // Always return success for security (don't reveal if email exists)
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error) {
      logger.error('Password reset request error:', error);

      res.status(500).json({
        error: 'Password reset failed',
        message: 'An error occurred while processing your request',
      });
    }
  }

  // Password reset confirmation
  static async confirmPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { token, newPassword } = req.body;
      await AuthService.confirmPasswordReset({ token, newPassword });

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Password reset confirmation error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired')) {
          res.status(400).json({
            error: 'Invalid token',
            message: error.message,
          });
          return;
        }

        if (error.message.includes('Password must')) {
          res.status(400).json({
            error: 'Validation failed',
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Password reset failed',
        message: 'An error occurred while resetting your password',
      });
    }
  }

  // Email verification
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          error: 'Bad request',
          message: 'Verification token is required',
        });
        return;
      }

      await AuthService.verifyEmail(token);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Email verification error:', error);

      if (error instanceof Error && error.message.includes('Invalid or expired')) {
        res.status(400).json({
          error: 'Verification failed',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        error: 'Verification failed',
        message: 'An error occurred during email verification',
      });
    }
  }

  // Resend verification email
  static async resendVerificationEmail(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { email } = req.body;
      await AuthService.resendVerificationEmail({ email });

      // Always return success for security
      res.status(200).json({
        success: true,
        message: 'If the email exists and is not verified, a verification email has been sent',
      });
    } catch (error) {
      logger.error('Resend verification error:', error);

      res.status(500).json({
        error: 'Email sending failed',
        message: 'An error occurred while sending the verification email',
      });
    }
  }

  // Logout endpoint (client-side token removal)
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a JWT implementation, logout is typically handled client-side
      // by removing the token. Here we can log the event.

      const userId = (req as any).userId;
      if (userId) {
        loggerHelpers.logAuth('User logged out', userId);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error:', error);

      res.status(500).json({
        error: 'Logout failed',
        message: 'An error occurred during logout',
      });
    }
  }

  // Get current user info
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            user_id: user.user_id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            user_type: user.user_type,
            status: user.status,
            email_verified: user.email_verified,
            profile_image_url: user.profile_image_url,
            created_at: user.created_at,
            last_login_at: user.last_login_at,
            roles: user.Roles,
          },
        },
      });
    } catch (error) {
      logger.error('Get current user error:', error);

      res.status(500).json({
        error: 'Failed to get user info',
        message: 'An error occurred while fetching user information',
      });
    }
  }
}

// Validation middleware
export const authValidation = {
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    body('first_name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name is required and must be less than 100 characters'),
    body('last_name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name is required and must be less than 100 characters'),
    body('phone_number')
      .optional()
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('user_type')
      .optional()
      .isIn(['adopter', 'rescue_staff', 'admin', 'moderator'])
      .withMessage('Invalid user type'),
  ],

  login: [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
    body('twoFactorToken')
      .optional()
      .isLength({ min: 6, max: 6 })
      .withMessage('Two-factor token must be 6 digits'),
  ],

  passwordReset: [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  ],

  passwordResetConfirm: [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
  ],

  resendVerification: [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  ],
};

export default AuthController;
