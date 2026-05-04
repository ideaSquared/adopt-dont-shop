import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Op, Transaction } from 'sequelize';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import User, { UserStatus, UserType } from '../models/User';
import RefreshToken from '../models/RefreshToken';
import RevokedToken from '../models/RevokedToken';
import EmailQueue, { EmailStatus, EmailType, EmailPriority } from '../models/EmailQueue';
import { logger, loggerHelpers } from '../utils/logger';
import { decryptSecret, hashToken, verifyBackupCode } from '../utils/secrets';
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
  private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '3d';

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
        userType: UserType.ADOPTER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        verificationToken,
        verificationTokenExpiresAt: verificationExpires,
        loginAttempts: 0,
        // Notification + privacy prefs auto-created by User.afterCreate
        // hook (plan 5.6) — defaults stand in.
      });

      // Log registration with enhanced context
      await AuditLogService.log({
        userId: user.userId,
        action: 'USER_CREATED',
        entity: 'User',
        entityId: user.userId,
        details: {
          userType: UserType.ADOPTER,
          registrationMethod: 'email',
        },
      });

      loggerHelpers.logBusiness('User Registered', {
        userId: user.userId,
        email: user.email,
        userType: UserType.ADOPTER,
      });

      // Send verification email
      try {
        const emailService = (await import('./email.service')).default;
        // app.client runs on :3000 in dev (see docker-compose / CORS_ORIGIN).
        // Set FRONTEND_URL in .env to override (e.g. for staging/prod).
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

        // sendEmail requires either templateId+templateData OR explicit
        // subject+htmlContent. Resolve the seeded "Email Verification"
        // template by name so this isn't bound to a hardcoded UUID.
        const template = await emailService.getTemplateByName('Email Verification');
        if (!template) {
          throw new Error("Email template 'Email Verification' not found");
        }

        await emailService.sendEmail({
          toEmail: user.email,
          templateId: template.templateId,
          templateData: {
            firstName: user.firstName,
            verificationToken,
            verificationUrl,
            expiresAt: verificationExpires.toISOString(),
          },
          type: 'transactional',
          priority: 'high',
        });

        logger.info('Verification email sent', { userId: user.userId, email: user.email });
      } catch (emailError) {
        logger.error('Failed to send verification email, queuing for retry:', emailError);
        // Queue email for retry instead of silently failing
        try {
          await EmailQueue.create({
            fromEmail: process.env.EMAIL_FROM_ADDRESS || 'noreply@adoptdontshop.com',
            toEmail: user.email,
            subject: 'Verify Your Email',
            htmlContent: `<p>Hello ${user.firstName},</p><p>Please verify your email by clicking <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}">here</a></p>`,
            type: EmailType.TRANSACTIONAL,
            priority: EmailPriority.HIGH,
            status: EmailStatus.QUEUED,
            maxRetries: 3,
            currentRetries: 0,
            userId: user.userId,
            metadata: {
              verificationToken,
              verificationExpires: verificationExpires.toISOString(),
            },
            templateData: {
              firstName: user.firstName,
              verificationToken,
              verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`,
              expiresAt: verificationExpires.toISOString(),
            },
          });
          logger.info('Verification email queued for retry', {
            userId: user.userId,
            email: user.email,
          });
        } catch (queueError) {
          logger.error('Failed to queue verification email:', queueError);
        }
      }

      // Generate tokens with rotation support
      const tokenId = crypto.randomUUID();
      const familyId = crypto.randomUUID();
      const tokens = await this.generateTokens(
        { userId: user.userId, email: user.email, userType: UserType.ADOPTER },
        tokenId
      );
      await this.storeRefreshToken(user.userId, tokenId, familyId);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      logger.error('Registration failed:', {
        error: error instanceof Error ? error.message : String(error),
        email: userData.email,
      });
      throw error;
    }
  }

  static async login(credentials: LoginCredentials, ipAddress?: string): Promise<AuthResponse> {
    try {
      // Wrap lock-check + counter increment in a transaction with SELECT FOR UPDATE so
      // concurrent failed logins cannot both read the row before either writes, which
      // would let an attacker exceed the lockout threshold in a single burst.
      const transaction = await User.sequelize!.transaction({
        isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
      });

      let user: InstanceType<typeof User> | null = null;
      try {
        user = await User.scope('withSecrets').findOne({
          where: { email: credentials.email.toLowerCase() },
          // Scope the row lock to the Users table only — Postgres rejects
          // SELECT ... FOR UPDATE that would lock rows on the nullable side
          // of the LEFT JOIN to Roles/Permissions ("FOR UPDATE cannot be
          // applied to the nullable side of an outer join").
          lock: { level: transaction.LOCK.UPDATE, of: User },
          transaction,
          include: [
            {
              association: 'Roles',
              include: [{ association: 'Permissions' }],
            },
          ],
        });

        if (!user) {
          await transaction.rollback();
          loggerHelpers.logSecurity('Login attempt with non-existent email', {
            email: credentials.email,
            ipAddress,
          });
          throw new Error('Invalid credentials');
        }

        if (user.isAccountLocked()) {
          await transaction.rollback();
          loggerHelpers.logSecurity('Login attempt on locked account', {
            userId: user.userId,
            ipAddress,
          });
          throw new Error('Account is temporarily locked. Please try again later.');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
          await user.increment('loginAttempts', { transaction });
          await user.reload({ transaction });

          if (user.loginAttempts >= 5) {
            user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
            loggerHelpers.logSecurity('Account locked due to failed login attempts', {
              userId: user.userId,
              attempts: user.loginAttempts,
              ipAddress,
            });
            await user.save({ transaction });
          }

          await transaction.commit();
          throw new Error('Invalid credentials');
        }

        // Check if email is verified
        if (!user.emailVerified) {
          await transaction.rollback();
          throw new Error('Please verify your email before logging in');
        }

        // Check 2FA if enabled
        if (user.twoFactorEnabled) {
          if (!credentials.twoFactorToken) {
            await transaction.rollback();
            throw new Error('Two-factor authentication code required');
          }

          const isValidTwoFactor = await this.verifyTwoFactorToken(
            user,
            credentials.twoFactorToken,
            transaction
          );
          if (!isValidTwoFactor) {
            await transaction.rollback();
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
        await user.save({ transaction });
        await transaction.commit();
      } catch (txError) {
        // Roll back only if the transaction is still open (not already committed/rolled back)
        try {
          await transaction.rollback();
        } catch {
          /* already settled */
        }
        throw txError;
      }

      // user is guaranteed non-null here: we only reach this line after a successful commit
      const loggedInUser = user!;

      // Log successful login
      await AuditLogService.log({
        action: 'LOGIN',
        entity: 'User',
        entityId: loggedInUser.userId,
        details: { email: loggedInUser.email },
        userId: loggedInUser.userId,
      });

      loggerHelpers.logAuth('User logged in', {
        userId: loggedInUser.userId,
        email: loggedInUser.email,
        ipAddress,
      });

      // Generate tokens with rotation support
      const tokenId = crypto.randomUUID();
      const familyId = crypto.randomUUID();
      const tokens = await this.generateTokens(
        { userId: loggedInUser.userId, email: loggedInUser.email, userType: loggedInUser.userType },
        tokenId
      );
      await this.storeRefreshToken(loggedInUser.userId, tokenId, familyId);

      return {
        user: this.sanitizeUser(loggedInUser),
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
    let decoded: { userId: string; jti: string } | null = null;

    try {
      decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as {
        userId: string;
        jti: string;
      };

      const storedToken = await RefreshToken.findByPk(decoded.jti);

      if (!storedToken) {
        throw new Error('Invalid refresh token');
      }

      if (storedToken.is_revoked) {
        // Reuse detected: revoke entire token family to protect the account
        await RefreshToken.update(
          { is_revoked: true },
          { where: { family_id: storedToken.family_id, user_id: storedToken.user_id } }
        );
        loggerHelpers.logSecurity('Refresh token reuse detected – family revoked', {
          userId: storedToken.user_id,
          familyId: storedToken.family_id,
        });
        throw new Error('Invalid refresh token');
      }

      if (storedToken.isExpired()) {
        await storedToken.update({ is_revoked: true });
        throw new Error('Invalid refresh token');
      }

      const user = await User.findByPk(decoded.userId, {
        include: [
          {
            association: 'Roles',
            include: [{ association: 'Permissions' }],
          },
        ],
      });

      if (!user || !user.canLogin()) {
        throw new Error('Invalid refresh token');
      }

      const newTokenId = crypto.randomUUID();
      const newTokens = await this.generateTokens(
        { userId: user.userId, email: user.email, userType: user.userType },
        newTokenId
      );
      await this.storeRefreshToken(user.userId, newTokenId, storedToken.family_id);
      await storedToken.update({ is_revoked: true, replaced_by_token_id: newTokenId });

      return {
        user: this.sanitizeUser(user),
        ...newTokens,
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
          resetToken: hashToken(data.token),
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
          verificationToken: hashToken(token),
          verificationTokenExpiresAt: {
            [Op.gt]: new Date(),
          },
        },
      });

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      // Idempotent: a duplicate request (React StrictMode dev double-mount,
      // browser back/forward, network retry) should not 400. The token
      // matched, so it's the right user — just no-op if already verified.
      if (user.emailVerified) {
        return { message: 'Email verified successfully' };
      }

      user.emailVerified = true;
      user.status = UserStatus.ACTIVE;
      // Keep verificationToken/expires in place until natural expiry so
      // duplicate clicks of the same emailed link succeed. The token only
      // verifies email; once verified, replays are a no-op.
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

  static async logout(refreshToken?: string, accessToken?: string): Promise<void> {
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken) as {
          jti?: string;
          userId?: string;
          exp?: number;
        } | null;
        if (decoded?.jti && decoded?.userId && decoded?.exp) {
          await RevokedToken.create({
            jti: decoded.jti,
            user_id: decoded.userId,
            expires_at: new Date(decoded.exp * 1000),
          });
          logger.info('Access token blacklisted on logout', { jti: decoded.jti });
        }
      } catch {
        logger.warn('Failed to blacklist access token on logout');
      }
    }

    if (!refreshToken) {
      return;
    }

    try {
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET, {
        algorithms: ['HS256'],
      }) as { jti?: string };
      if (decoded.jti) {
        await RefreshToken.update({ is_revoked: true }, { where: { token_id: decoded.jti } });
        logger.info('Refresh token revoked on logout', { jti: decoded.jti });
      }
    } catch {
      // Expired or malformed token — nothing to revoke
      logger.info('Logout with invalid or expired token, skipping revocation');
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

  private static async generateTokens(
    payload: { userId: string; email: string; userType?: UserType },
    tokenId: string
  ): Promise<Omit<AuthResponse, 'user'>> {
    const jwtSecret = this.JWT_SECRET;
    const jwtRefreshSecret = this.JWT_REFRESH_SECRET;

    if (!jwtSecret || !jwtRefreshSecret) {
      throw new Error('JWT secrets not configured');
    }

    const accessTokenJti = crypto.randomUUID();
    const token = jwt.sign({ ...payload, jti: accessTokenJti }, jwtSecret, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as SignOptions);

    const refreshToken = jwt.sign({ ...payload, jti: tokenId }, jwtRefreshSecret, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
    } as SignOptions);

    return {
      token,
      refreshToken,
      expiresIn: this.parseExpirationTime(this.JWT_EXPIRES_IN),
    };
  }

  private static async storeRefreshToken(
    userId: string,
    tokenId: string,
    familyId: string
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + this.parseExpirationTime(this.JWT_REFRESH_EXPIRES_IN));
    await RefreshToken.create({
      token_id: tokenId,
      user_id: userId,
      family_id: familyId,
      is_revoked: false,
      expires_at: expiresAt,
      replaced_by_token_id: null,
    });
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

  private static async verifyTwoFactorToken(
    user: User,
    token: string,
    transaction?: Transaction
  ): Promise<boolean> {
    if (!user.twoFactorSecret) {
      throw new Error('Two-factor authentication is not set up for this user');
    }

    // twoFactorSecret is stored AES-256-GCM-encrypted; speakeasy needs the
    // raw base32 secret to derive the TOTP. Decrypt on use, never persist.
    const plainSecret = decryptSecret(user.twoFactorSecret);

    const isValidTotp = speakeasy.totp.verify({
      secret: plainSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (isValidTotp) {
      return true;
    }

    // Fall back to backup code verification
    return this.verifyBackupCode(user, token, transaction);
  }

  private static async verifyBackupCode(
    user: User,
    code: string,
    transaction?: Transaction
  ): Promise<boolean> {
    if (!user.backupCodes || user.backupCodes.length === 0) {
      return false;
    }

    // Backup codes are bcrypt-hashed — we can't indexOf(raw). Walk each
    // stored hash and try to match; first hit is the used code.
    let matchIndex = -1;
    for (let i = 0; i < user.backupCodes.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      if (await verifyBackupCode(code, user.backupCodes[i])) {
        matchIndex = i;
        break;
      }
    }
    if (matchIndex === -1) {
      return false;
    }

    const updatedCodes = [
      ...user.backupCodes.slice(0, matchIndex),
      ...user.backupCodes.slice(matchIndex + 1),
    ];
    user.backupCodes = updatedCodes;
    await user.save({ transaction });

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
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

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
