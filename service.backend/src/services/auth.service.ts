import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Op } from 'sequelize';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import User, { UserStatus, UserType } from '../models/User';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';
import { env } from '../config/env';

import {
  AuthResponse,
  LoginCredentials,
  PasswordResetConfirm,
  PasswordResetRequest,
  RegisterData,
} from '../types';

export class AuthService {
  private static readonly JWT_SECRET = env.JWT_SECRET;
  private static readonly JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
  private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  static async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email: userData.email.toLowerCase() } });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Validate password
      this.validatePassword(userData.password);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user (password will be hashed by User model beforeCreate hook)
      const user = await User.create({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email.toLowerCase(),
        password: userData.password,
        phoneNumber: userData.phoneNumber || undefined,
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

      // Send verification email
      try {
        const emailService = (await import('./email.service')).default;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

        await emailService.sendEmail({
          toEmail: user.email,
          templateData: {
            firstName: user.firstName,
            verificationToken,
            verificationUrl,
            expiresAt: verificationExpires.toISOString(),
          },
          type: 'transactional',
          priority: 'high',
          subject: "Verify Your Email Address - Adopt Don't Shop",
        });

        logger.info('Verification email sent', { userId: user.userId, email: user.email });
      } catch (emailError) {
        logger.error('Failed to send verification email:', emailError);
        // Don't throw error - user is still created, they can request resend
      }

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
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        await emailService.sendEmail({
          toEmail: user.email,
          toName: `${user.firstName} ${user.lastName}`,
          subject: "Password Reset Request - Adopt Don't Shop",
          htmlContent: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Password Reset Request</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Password Reset Request</h1>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding: 40px 30px;">
                          <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0;">Hi ${user.firstName},</p>

                          <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0; line-height: 1.6;">
                            We received a request to reset your password for your Adopt Don't Shop account.
                            Click the button below to create a new password.
                          </p>

                          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                            <tr>
                              <td align="center">
                                <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Your Password</a>
                              </td>
                            </tr>
                          </table>

                          <p style="font-size: 14px; color: #666666; margin: 20px 0 10px 0; line-height: 1.6;">
                            Or copy and paste this link into your browser:
                          </p>
                          <p style="font-size: 14px; color: #667eea; word-break: break-all; margin: 0 0 20px 0;">
                            ${resetUrl}
                          </p>

                          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 30px 0;">
                            <p style="font-size: 14px; color: #856404; margin: 0; line-height: 1.6;">
                              <strong>⏰ This link will expire in 1 hour</strong> for your security.
                            </p>
                          </div>

                          <p style="font-size: 14px; color: #666666; margin: 20px 0 0 0; line-height: 1.6;">
                            If you didn't request a password reset, you can safely ignore this email.
                            Your password will remain unchanged.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                          <p style="font-size: 14px; color: #6c757d; margin: 0 0 10px 0;">
                            Need help? Contact us at <a href="mailto:support@adoptdontshop.com" style="color: #667eea; text-decoration: none;">support@adoptdontshop.com</a>
                          </p>
                          <p style="font-size: 12px; color: #adb5bd; margin: 0;">
                            © ${new Date().getFullYear()} Adopt Don't Shop. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
          textContent: `
Hi ${user.firstName},

We received a request to reset your password for your Adopt Don't Shop account.

To reset your password, click the link below or copy and paste it into your browser:

${resetUrl}

This link will expire in 1 hour for your security.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

Need help? Contact us at support@adoptdontshop.com

© ${new Date().getFullYear()} Adopt Don't Shop. All rights reserved.
          `,
          templateData: {
            firstName: user.firstName,
            resetToken: resetToken,
            resetUrl: resetUrl,
            expiresAt: resetExpires.toISOString(),
          },
          type: 'transactional',
          priority: 'high',
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

      // Set new password (will be hashed by User model beforeUpdate hook)
      user.password = data.newPassword;
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
    if (!user.twoFactorSecret) {
      throw new Error('Two-factor authentication is not set up for this user');
    }

    // First try TOTP verification
    const isValidTotp = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (isValidTotp) {
      return true;
    }

    // Fall back to backup code verification
    return this.verifyBackupCode(user, token);
  }

  private static async verifyBackupCode(user: User, code: string): Promise<boolean> {
    if (!user.backupCodes || user.backupCodes.length === 0) {
      return false;
    }

    const codeIndex = user.backupCodes.indexOf(code);
    if (codeIndex === -1) {
      return false;
    }

    // Remove used backup code
    const updatedCodes = [
      ...user.backupCodes.slice(0, codeIndex),
      ...user.backupCodes.slice(codeIndex + 1),
    ];
    user.backupCodes = updatedCodes;
    await user.save();

    loggerHelpers.logSecurity('Backup code used for 2FA', {
      userId: user.userId,
      remainingCodes: updatedCodes.length,
    });

    return true;
  }

  static generateTwoFactorSecret(userEmail: string): { secret: string; otpauthUrl: string } {
    const secretObj = speakeasy.generateSecret({
      name: `Adopt Don't Shop (${userEmail})`,
      issuer: "Adopt Don't Shop",
      length: 20,
    });

    return {
      secret: secretObj.base32,
      otpauthUrl: secretObj.otpauth_url ?? '',
    };
  }

  static async generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return qrcode.toDataURL(otpauthUrl);
  }

  static verifyTwoFactorSetupToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  static generateBackupCodes(count = 10): string[] {
    return Array.from({ length: count }, () => crypto.randomBytes(4).toString('hex'));
  }

  static async enableTwoFactor(
    userId: string,
    secret: string,
    token: string
  ): Promise<{ backupCodes: string[] }> {
    // Verify the token before enabling
    const isValid = this.verifyTwoFactorSetupToken(secret, token);
    if (!isValid) {
      throw new Error('Invalid verification code. Please try again.');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const backupCodes = this.generateBackupCodes();

    user.twoFactorEnabled = true;
    user.twoFactorSecret = secret;
    user.backupCodes = backupCodes;
    await user.save();

    await AuditLogService.log({
      userId: user.userId,
      action: 'TWO_FACTOR_ENABLED',
      entity: 'User',
      entityId: user.userId,
      details: { email: user.email },
    });

    loggerHelpers.logSecurity('2FA enabled', { userId: user.userId });

    return { backupCodes };
  }

  static async disableTwoFactor(userId: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.backupCodes = null;
    await user.save();

    await AuditLogService.log({
      userId: user.userId,
      action: 'TWO_FACTOR_DISABLED',
      entity: 'User',
      entityId: user.userId,
      details: { email: user.email },
    });

    loggerHelpers.logSecurity('2FA disabled', { userId: user.userId });
  }

  /**
   * Send verification reminder emails to unverified users
   * This method should be called periodically (e.g., via cron job)
   *
   * @param hoursOld - Send reminders to users who registered X hours ago (default: 12)
   * @param maxHoursOld - Don't send reminders to users older than X hours (default: 72)
   * @returns Count of reminders sent
   */
  static async sendVerificationReminders(
    hoursOld = 12,
    maxHoursOld = 72
  ): Promise<{ sent: number; failed: number }> {
    try {
      const minDate = new Date(Date.now() - maxHoursOld * 60 * 60 * 1000);
      const maxDate = new Date(Date.now() - hoursOld * 60 * 60 * 1000);

      // Find users who:
      // 1. Are not email verified
      // 2. Have a valid verification token
      // 3. Token hasn't expired
      // 4. Registered between hoursOld and maxHoursOld ago
      const unverifiedUsers = await User.findAll({
        where: {
          emailVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
          verificationToken: { [Op.ne]: null },
          verificationTokenExpiresAt: { [Op.gt]: new Date() },
          createdAt: {
            [Op.gte]: minDate,
            [Op.lte]: maxDate,
          },
        },
      });

      logger.info(`Found ${unverifiedUsers.length} users needing verification reminders`, {
        hoursOld,
        maxHoursOld,
      });

      let sent = 0;
      let failed = 0;

      const emailService = (await import('./email.service')).default;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      for (const user of unverifiedUsers) {
        try {
          if (!user.verificationToken) {
            continue;
          }

          const verificationUrl = `${frontendUrl}/verify-email?token=${user.verificationToken}`;

          await emailService.sendEmail({
            toEmail: user.email,
            templateData: {
              firstName: user.firstName,
              verificationToken: user.verificationToken,
              verificationUrl,
              expiresAt: user.verificationTokenExpiresAt?.toISOString() ?? null,
            },
            type: 'notification',
            priority: 'medium',
            subject: "Reminder: Verify Your Email - Adopt Don't Shop",
          });

          await AuditLogService.log({
            action: 'VERIFICATION_REMINDER_SENT',
            entity: 'User',
            entityId: user.userId,
            details: { email: user.email },
            userId: user.userId,
          });

          sent++;
          logger.info('Verification reminder sent', {
            userId: user.userId,
            email: user.email,
          });
        } catch (error) {
          failed++;
          logger.error('Failed to send verification reminder', {
            userId: user.userId,
            email: user.email,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info('Verification reminders completed', {
        sent,
        failed,
        total: unverifiedUsers.length,
      });

      return { sent, failed };
    } catch (error) {
      logger.error('Failed to send verification reminders', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default AuthService;
