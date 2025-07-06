import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Op } from 'sequelize';
import User, { UserStatus, UserType } from '../models/User';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';

import {
  AuthResponse,
  LoginCredentials,
  PasswordResetConfirm,
  PasswordResetRequest,
  RegisterData,
} from '../types';

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET!;
  private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
  private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  private static readonly BCRYPT_ROUNDS = 12;

  static async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email: userData.email.toLowerCase() } });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Validate password
      this.validatePassword(userData.password);

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, this.BCRYPT_ROUNDS);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await User.create({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        phoneNumber: userData.phoneNumber,
        userType: userData.userType || UserType.ADOPTER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        verificationToken,
        verificationTokenExpiresAt: verificationExpires,
        loginAttempts: 0,
        privacySettings: {
          profileVisibility: 'public',
          showLocation: false,
          allowMessages: true,
          showAdoptionHistory: false,
        },
        notificationPreferences: {
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
        },
      });

      // Log registration with enhanced context
      await AuditLogService.log({
        userId: user.userId,
        action: 'USER_CREATED',
        entity: 'User',
        entityId: user.userId,
        details: {
          userType: userData.userType || 'ADOPTER',
          registrationMethod: 'email',
        },
      });

      loggerHelpers.logBusiness('User Registered', {
        userId: user.userId,
        email: user.email,
        userType: userData.userType || 'ADOPTER',
      });

      // Generate tokens
      const tokens = await this.generateTokens({
        userId: user.userId,
        email: user.email,
        userType: userData.userType,
      });

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      logger.error('Registration failed:', {
        error: error instanceof Error ? error.message : String(error),
        email: userData.email,
        userType: userData.userType,
      });
      throw error;
    }
  }

  static async login(credentials: LoginCredentials, ipAddress?: string): Promise<AuthResponse> {
    try {
      // Find user with password scope
      const user = await User.scope('withSecrets').findOne({
        where: { email: credentials.email.toLowerCase() },
        include: [
          {
            association: 'Roles',
            include: [
              {
                association: 'Permissions',
              },
            ],
          },
        ],
      });

      if (!user) {
        loggerHelpers.logSecurity('Login attempt with non-existent email', {
          email: credentials.email,
          ipAddress,
        });
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (user.isAccountLocked()) {
        loggerHelpers.logSecurity('Login attempt on locked account', {
          userId: user.userId,
          ipAddress,
        });
        throw new Error('Account is temporarily locked. Please try again later.');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      if (!isPasswordValid) {
        // Increment login attempts
        user.loginAttempts += 1;

        // Lock account after 5 failed attempts
        if (user.loginAttempts >= 5) {
          user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          loggerHelpers.logSecurity('Account locked due to failed login attempts', {
            userId: user.userId,
            attempts: user.loginAttempts,
            ipAddress,
          });
        }

        await user.save();
        throw new Error('Invalid credentials');
      }

      // Check if email is verified
      if (!user.emailVerified) {
        throw new Error('Please verify your email before logging in');
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled) {
        if (!credentials.twoFactorToken) {
          throw new Error('Two-factor authentication code required');
        }

        const isValidTwoFactor = await this.verifyTwoFactorToken(user, credentials.twoFactorToken);
        if (!isValidTwoFactor) {
          loggerHelpers.logSecurity('Invalid 2FA token', {
            userId: user.userId,
            ipAddress,
          });
          throw new Error('Invalid two-factor authentication code');
        }
      }

      // Reset login attempts on successful login
      user.loginAttempts = 0;
      user.lockedUntil = null;
      user.lastLoginAt = new Date();
      await user.save();

      // Log successful login
      await AuditLogService.log({
        action: 'LOGIN',
        entity: 'User',
        entityId: user.userId,
        details: { email: user.email },
        userId: user.userId,
      });

      loggerHelpers.logAuth('User logged in', {
        userId: user.userId,
        email: user.email,
        ipAddress,
      });

      // Generate tokens
      const tokens = await this.generateTokens({
        userId: user.userId,
        email: user.email,
        userType: user.userType,
      });

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      logger.error('Login failed:', {
        error: error instanceof Error ? error.message : String(error),
        email: credentials.email,
        ipAddress,
      });
      throw error;
    }
  }

  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    let decoded: { userId: string; tokenId: string } | null = null;

    try {
      decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as {
        userId: string;
        tokenId: string;
      };
      const user = await User.findByPk(decoded.userId, {
        include: [
          {
            association: 'Roles',
            include: [
              {
                association: 'Permissions',
              },
            ],
          },
        ],
      });

      if (!user || !user.canLogin()) {
        throw new Error('Invalid refresh token');
      }

      const tokens = await this.generateTokens({
        userId: user.userId,
        email: user.email,
        userType: user.userType,
      });
      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      logger.error('Token refresh failed:', {
        error: error instanceof Error ? error.message : String(error),
        userId: decoded?.userId,
      });
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: PasswordResetRequest) {
    try {
      const user = await User.findOne({
        where: { email: data.email.toLowerCase() },
      });

      if (!user) {
        // Don't reveal if email exists
        logger.info('Password reset requested for non-existent email', { email: data.email });
        return { message: 'If the email exists, a reset link has been sent' };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.resetToken = resetToken;
      user.resetTokenExpiration = resetExpires;
      await user.save();

      // Log password reset request
      await AuditLogService.log({
        action: 'PASSWORD_RESET_REQUEST',
        entity: 'User',
        entityId: user.userId,
        details: { email: user.email },
        userId: user.userId,
      });

      loggerHelpers.logAuth('Password reset requested', {
        userId: user.userId,
        email: user.email,
      });

      // Send password reset email
      try {
        const emailService = (await import('./email.service')).default;
        await emailService.sendEmail({
          toEmail: user.email,
          templateData: {
            firstName: user.firstName,
            resetToken: resetToken,
            resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
            expiresAt: resetExpires.toISOString(),
          },
          type: 'transactional',
          priority: 'high',
          subject: 'Password Reset Request',
        });

        logger.info('Password reset email sent', { userId: user.userId, email: user.email });
      } catch (emailError) {
        logger.error('Failed to send password reset email:', emailError);
        // Don't throw error - we still want to return success to user for security
      }

      return { message: 'If the email exists, a reset link has been sent' };
    } catch (error) {
      logger.error('Password reset request failed:', {
        error: error instanceof Error ? error.message : String(error),
        email: data.email,
      });
      throw error;
    }
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(data: PasswordResetConfirm) {
    try {
      const user = await User.findOne({
        where: {
          resetToken: data.token,
          resetTokenExpiration: {
            [Op.gt]: new Date(),
          },
        },
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(data.newPassword, 12);
      user.password = hashedPassword;
      user.resetToken = null;
      user.resetTokenExpiration = null;
      user.resetTokenForceFlag = false;

      await user.save();
      logger.info('Password reset completed', { userId: user.userId });

      // Log password reset
      await AuditLogService.log({
        action: 'PASSWORD_RESET',
        entity: 'User',
        entityId: user.userId,
        details: { email: user.email },
        userId: user.userId,
      });

      return { message: 'Password reset successfully' };
    } catch (error) {
      logger.error('Password reset confirmation failed:', error);
      throw error;
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string) {
    try {
      const user = await User.findOne({
        where: {
          verificationToken: token,
          verificationTokenExpiresAt: {
            [Op.gt]: new Date(),
          },
        },
      });

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      user.emailVerified = true;
      user.verificationToken = null;
      user.verificationTokenExpiresAt = null;
      user.status = UserStatus.ACTIVE;
      await user.save();

      logger.info('Email verified', { userId: user.userId });

      // Log email verification
      await AuditLogService.log({
        action: 'EMAIL_VERIFICATION',
        entity: 'User',
        entityId: user.userId,
        details: { email: user.email },
        userId: user.userId,
      });

      return { message: 'Email verified successfully' };
    } catch (error) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  static async logout(refreshToken?: string): Promise<void> {
    try {
      // TODO: Implement token blacklisting for more secure logout
      // This would involve:
      // 1. Adding the refresh token to a blacklist/revoked tokens table
      // 2. Optionally invalidating all tokens for the user
      // 3. Cleaning up expired blacklisted tokens periodically

      if (refreshToken) {
        // For now, we'll just log the logout event
        // In a production system, you'd want to blacklist the token
        logger.info('User logout requested', {
          refreshToken: refreshToken.substring(0, 10) + '...',
        });
      }

      // Future implementation would include:
      // await TokenBlacklist.create({ token: refreshToken, expires_at: tokenExpiry });
    } catch (error) {
      logger.error('Logout service error:', error);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string) {
    try {
      const user = await User.findOne({
        where: { email: email.toLowerCase() },
      });

      if (!user || user.emailVerified) {
        // Don't reveal if email exists or is already verified
        return {
          message: 'If the email exists and is unverified, a new verification link has been sent',
        };
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      user.verificationToken = verificationToken;
      user.verificationTokenExpiresAt = verificationExpires;
      await user.save();

      // Log verification email resend
      await AuditLogService.log({
        action: 'VERIFICATION_EMAIL_RESEND',
        entity: 'User',
        entityId: user.userId,
        details: { email: user.email },
        userId: user.userId,
      });

      // Send verification email
      try {
        const emailService = (await import('./email.service')).default;
        await emailService.sendEmail({
          toEmail: user.email,
          templateData: {
            firstName: user.firstName,
            verificationToken: verificationToken,
            verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
            expiresAt: verificationExpires.toISOString(),
          },
          type: 'transactional',
          priority: 'high',
          subject: 'Verify Your Email Address',
        });

        logger.info('Verification email sent', { userId: user.userId, email: user.email });
      } catch (emailError) {
        logger.error('Failed to send verification email:', emailError);
        // Don't throw error - we still want to return success to user for security
      }

      return {
        message: 'If the email exists and is unverified, a new verification link has been sent',
      };
    } catch (error) {
      logger.error('Resend verification email failed:', error);
      throw new Error('Failed to resend verification email');
    }
  }

  private static async generateTokens(payload: {
    userId: string;
    email: string;
    userType?: UserType;
  }): Promise<Omit<AuthResponse, 'user'>> {
    const jwtSecret = this.JWT_SECRET;
    const jwtRefreshSecret = this.JWT_REFRESH_SECRET;

    if (!jwtSecret || !jwtRefreshSecret) {
      throw new Error('JWT secrets not configured');
    }

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as SignOptions);

    const refreshToken = jwt.sign(payload, jwtRefreshSecret, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
    } as SignOptions);

    return {
      token,
      refreshToken,
      expiresIn: this.parseExpirationTime(this.JWT_EXPIRES_IN),
    };
  }

  private static parseExpirationTime(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000; // Default 15 minutes
    }
  }

  private static sanitizeUser(user: User): Partial<User> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, twoFactorSecret, backupCodes, resetToken, verificationToken, ...sanitized } =
      user.toJSON();
    return sanitized;
  }

  private static validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }

  private static async verifyTwoFactorToken(user: User, token: string): Promise<boolean> {
    // TODO: Implement 2FA verification (e.g., TOTP)
    // This is a placeholder implementation
    return token === '123456';
  }
}

export default AuthService;
