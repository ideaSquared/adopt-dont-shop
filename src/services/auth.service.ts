import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AuditLog } from '../models/AuditLog';
import User, { UserStatus, UserType } from '../models/User';
import { logger, loggerHelpers } from '../utils/logger';

export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorToken?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  user_type?: UserType;
}

export interface AuthResponse {
  user: Partial<User>;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface EmailVerificationRequest {
  email: string;
}

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

      // Validate password strength
      this.validatePassword(userData.password);

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, this.BCRYPT_ROUNDS);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await User.create({
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone_number: userData.phone_number,
        user_type: userData.user_type || UserType.ADOPTER,
        status: UserStatus.PENDING_VERIFICATION,
        verification_token: verificationToken,
        verification_token_expires_at: verificationExpires,
        login_attempts: 0,
        email_verified: false,
        privacy_settings: {
          profile_visibility: 'public',
          show_location: false,
          allow_messages: true,
          show_adoption_history: false,
        },
        notification_preferences: {
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          marketing_emails: true,
        },
      });

      // Log registration
      loggerHelpers.logAuth('User registered', user.user_id, {
        email: userData.email,
        userType: userData.user_type,
      });

      // Audit log
      await AuditLog.create({
        service: 'auth',
        user: user.user_id,
        action: 'User registration',
        level: 'INFO',
        timestamp: new Date(),
        category: 'AUTHENTICATION',
        metadata: {
          email: userData.email,
          userType: userData.user_type,
        },
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      logger.error('Registration failed:', error);
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
          userId: user.user_id,
          ipAddress,
        });
        throw new Error('Account is temporarily locked. Please try again later.');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      if (!isPasswordValid) {
        // Increment login attempts
        user.login_attempts += 1;

        // Lock account after 5 failed attempts
        if (user.login_attempts >= 5) {
          user.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          loggerHelpers.logSecurity('Account locked due to failed login attempts', {
            userId: user.user_id,
            attempts: user.login_attempts,
            ipAddress,
          });
        }

        await user.save();
        throw new Error('Invalid credentials');
      }

      // Check if email is verified
      if (!user.email_verified) {
        throw new Error('Please verify your email before logging in');
      }

      // Check 2FA if enabled
      if (user.two_factor_enabled) {
        if (!credentials.twoFactorToken) {
          throw new Error('Two-factor authentication code required');
        }

        const isValidTwoFactor = await this.verifyTwoFactorToken(user, credentials.twoFactorToken);
        if (!isValidTwoFactor) {
          loggerHelpers.logSecurity('Invalid 2FA token', {
            userId: user.user_id,
            ipAddress,
          });
          throw new Error('Invalid two-factor authentication code');
        }
      }

      // Reset login attempts on successful login
      user.login_attempts = 0;
      user.locked_until = null;
      user.last_login_at = new Date();
      await user.save();

      // Log successful login
      loggerHelpers.logAuth('User logged in', user.user_id, {
        email: credentials.email,
        ipAddress,
      });

      // Audit log
      await AuditLog.create({
        service: 'auth',
        user: user.user_id,
        action: 'User login',
        level: 'INFO',
        timestamp: new Date(),
        category: 'AUTHENTICATION',
        ip_address: ipAddress,
        metadata: {
          email: credentials.email,
          userType: user.user_type,
        },
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as any;
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

      const tokens = await this.generateTokens(user);
      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw new Error('Invalid refresh token');
    }
  }

  static async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
    try {
      const user = await User.findOne({ where: { email: data.email.toLowerCase() } });

      if (!user) {
        // Don't reveal if email exists
        logger.info('Password reset requested for non-existent email', { email: data.email });
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.reset_token = resetToken;
      user.reset_token_expiration = resetExpires;
      await user.save();

      loggerHelpers.logAuth('Password reset requested', user.user_id, {
        email: data.email,
      });

      // TODO: Send email with reset link
      logger.info('Password reset email would be sent', {
        userId: user.user_id,
        resetToken,
      });
    } catch (error) {
      logger.error('Password reset request failed:', error);
      throw error;
    }
  }

  static async confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
    try {
      const user = await User.scope('withSecrets').findOne({
        where: {
          reset_token: data.token,
          reset_token_expiration: {
            $gt: new Date(),
          },
        },
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      this.validatePassword(data.newPassword);

      const hashedPassword = await bcrypt.hash(data.newPassword, this.BCRYPT_ROUNDS);

      user.password = hashedPassword;
      user.reset_token = null;
      user.reset_token_expiration = null;
      user.reset_token_force_flag = false;
      await user.save();

      loggerHelpers.logAuth('Password reset completed', user.user_id);

      // Audit log
      await AuditLog.create({
        service: 'auth',
        user: user.user_id,
        action: 'Password reset',
        level: 'INFO',
        timestamp: new Date(),
        category: 'AUTHENTICATION',
      });
    } catch (error) {
      logger.error('Password reset confirmation failed:', error);
      throw error;
    }
  }

  static async verifyEmail(token: string): Promise<void> {
    try {
      const user = await User.findOne({
        where: {
          verification_token: token,
          verification_token_expires_at: {
            $gt: new Date(),
          },
        },
      });

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      user.email_verified = true;
      user.verification_token = null;
      user.verification_token_expires_at = null;
      user.status = UserStatus.ACTIVE;
      await user.save();

      loggerHelpers.logAuth('Email verified', user.user_id);

      // Audit log
      await AuditLog.create({
        service: 'auth',
        user: user.user_id,
        action: 'Email verification',
        level: 'INFO',
        timestamp: new Date(),
        category: 'AUTHENTICATION',
      });
    } catch (error) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  static async resendVerificationEmail(data: EmailVerificationRequest): Promise<void> {
    try {
      const user = await User.findOne({ where: { email: data.email.toLowerCase() } });

      if (!user || user.email_verified) {
        return; // Don't reveal if email exists or is already verified
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      user.verification_token = verificationToken;
      user.verification_token_expires_at = verificationExpires;
      await user.save();

      logger.info('Verification email resent', {
        userId: user.user_id,
        email: data.email,
      });
    } catch (error) {
      logger.error('Resend verification email failed:', error);
      throw error;
    }
  }

  private static async generateTokens(user: User): Promise<Omit<AuthResponse, 'user'>> {
    const payload = {
      userId: user.user_id,
      email: user.email,
      userType: user.user_type,
    };

    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
    });

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
    const {
      password,
      two_factor_secret,
      backup_codes,
      reset_token,
      verification_token,
      ...sanitized
    } = user.toJSON();
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
