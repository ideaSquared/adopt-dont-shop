import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuditLog } from '../../models/AuditLog';
import User, { UserStatus, UserType } from '../../models/User';
import AuthService, { LoginCredentials, RegisterData } from '../../services/auth.service';

// Mock external dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../models/User');
jest.mock('../../models/AuditLog');
jest.mock('../../utils/logger');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;
const MockUser = User as jest.MockedClass<typeof User>;
const MockAuditLog = AuditLog as jest.MockedClass<typeof AuditLog>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  describe('register', () => {
    const mockRegisterData: RegisterData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+1234567890',
      user_type: UserType.ADOPTER,
    };

    it('should successfully register a new user', async () => {
      // Arrange
      const mockUser = {
        user_id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        user_type: UserType.ADOPTER,
        toJSON: jest.fn().mockReturnValue({
          user_id: 'user-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        }),
      };

      MockUser.findOne.mockResolvedValue(null); // No existing user
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      MockUser.create.mockResolvedValue(mockUser as any);
      MockAuditLog.create.mockResolvedValue({} as any);
      mockJwt.sign.mockReturnValue('mock-token' as any);

      // Act
      const result = await AuthService.register(mockRegisterData);

      // Assert
      expect(MockUser.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith('TestPassword123!', 12);
      expect(MockUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'hashed-password',
          first_name: 'John',
          last_name: 'Doe',
          phone_number: '+1234567890',
          user_type: UserType.ADOPTER,
          status: UserStatus.PENDING_VERIFICATION,
        })
      );
      expect(MockAuditLog.create).toHaveBeenCalled();
      expect(result).toEqual({
        user: expect.any(Object),
        token: 'mock-token',
        refreshToken: 'mock-token',
        expiresIn: expect.any(Number),
      });
    });

    it('should throw error if user already exists', async () => {
      // Arrange
      MockUser.findOne.mockResolvedValue({} as any);

      // Act & Assert
      await expect(AuthService.register(mockRegisterData)).rejects.toThrow(
        'User already exists with this email'
      );
    });

    it('should validate password strength', async () => {
      // Arrange
      const weakPasswordData = {
        ...mockRegisterData,
        password: 'weak',
      };

      MockUser.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(AuthService.register(weakPasswordData)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should require uppercase letter in password', async () => {
      // Arrange
      const invalidPasswordData = {
        ...mockRegisterData,
        password: 'testpassword123!',
      };

      MockUser.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(AuthService.register(invalidPasswordData)).rejects.toThrow(
        'Password must contain at least one uppercase letter'
      );
    });

    it('should require special character in password', async () => {
      // Arrange
      const invalidPasswordData = {
        ...mockRegisterData,
        password: 'TestPassword123',
      };

      MockUser.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(AuthService.register(invalidPasswordData)).rejects.toThrow(
        'Password must contain at least one special character'
      );
    });
  });

  describe('login', () => {
    const mockLoginCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'TestPassword123!',
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange
      const mockUser = {
        user_id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        email_verified: true,
        login_attempts: 0,
        locked_until: null,
        two_factor_enabled: false,
        last_login_at: null,
        user_type: UserType.ADOPTER,
        isAccountLocked: jest.fn().mockReturnValue(false),
        save: jest.fn().mockResolvedValue(undefined),
        toJSON: jest.fn().mockReturnValue({
          user_id: 'user-123',
          email: 'test@example.com',
        }),
      };

      MockUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      } as any);
      mockBcrypt.compare.mockResolvedValue(true);
      MockAuditLog.create.mockResolvedValue({} as any);
      mockJwt.sign.mockReturnValue('mock-token' as any);

      // Act
      const result = await AuthService.login(mockLoginCredentials, '127.0.0.1');

      // Assert
      expect(mockBcrypt.compare).toHaveBeenCalledWith('TestPassword123!', 'hashed-password');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.login_attempts).toBe(0);
      expect(mockUser.locked_until).toBeNull();
      expect(MockAuditLog.create).toHaveBeenCalled();
      expect(result).toEqual({
        user: expect.any(Object),
        token: 'mock-token',
        refreshToken: 'mock-token',
        expiresIn: expect.any(Number),
      });
    });

    it('should throw error for non-existent user', async () => {
      // Arrange
      MockUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      } as any);

      // Act & Assert
      await expect(AuthService.login(mockLoginCredentials)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for locked account', async () => {
      // Arrange
      const mockUser = {
        isAccountLocked: jest.fn().mockReturnValue(true),
      };

      MockUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      } as any);

      // Act & Assert
      await expect(AuthService.login(mockLoginCredentials)).rejects.toThrow(
        'Account is temporarily locked'
      );
    });

    it('should increment login attempts on invalid password', async () => {
      // Arrange
      const mockUser = {
        user_id: 'user-123',
        login_attempts: 2,
        isAccountLocked: jest.fn().mockReturnValue(false),
        save: jest.fn().mockResolvedValue(undefined),
      };

      MockUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      } as any);
      mockBcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(AuthService.login(mockLoginCredentials)).rejects.toThrow('Invalid credentials');

      expect(mockUser.login_attempts).toBe(3);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should lock account after 5 failed attempts', async () => {
      // Arrange
      const mockUser = {
        user_id: 'user-123',
        login_attempts: 4,
        locked_until: null,
        isAccountLocked: jest.fn().mockReturnValue(false),
        save: jest.fn().mockResolvedValue(undefined),
      };

      MockUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      } as any);
      mockBcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(AuthService.login(mockLoginCredentials)).rejects.toThrow('Invalid credentials');

      expect(mockUser.login_attempts).toBe(5);
      expect(mockUser.locked_until).toBeInstanceOf(Date);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should require email verification', async () => {
      // Arrange
      const mockUser = {
        email_verified: false,
        isAccountLocked: jest.fn().mockReturnValue(false),
      };

      MockUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      } as any);
      mockBcrypt.compare.mockResolvedValue(true);

      // Act & Assert
      await expect(AuthService.login(mockLoginCredentials)).rejects.toThrow(
        'Please verify your email before logging in'
      );
    });

    it('should handle 2FA when enabled', async () => {
      // Arrange
      const mockUser = {
        email_verified: true,
        two_factor_enabled: true,
        isAccountLocked: jest.fn().mockReturnValue(false),
      };

      MockUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      } as any);
      mockBcrypt.compare.mockResolvedValue(true);

      // Act & Assert
      await expect(AuthService.login(mockLoginCredentials)).rejects.toThrow(
        'Two-factor authentication code required'
      );
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh a valid token', async () => {
      // Arrange
      const mockDecodedToken = {
        userId: 'user-123',
        email: 'test@example.com',
        userType: UserType.ADOPTER,
      };

      const mockUser = {
        user_id: 'user-123',
        canLogin: jest.fn().mockReturnValue(true),
        toJSON: jest.fn().mockReturnValue({
          user_id: 'user-123',
          email: 'test@example.com',
        }),
      };

      mockJwt.verify.mockReturnValue(mockDecodedToken as any);
      MockUser.findByPk.mockResolvedValue(mockUser as any);
      mockJwt.sign.mockReturnValue('new-token' as any);

      // Act
      const result = await AuthService.refreshToken('valid-refresh-token');

      // Assert
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-refresh-token', 'test-refresh-secret');
      expect(MockUser.findByPk).toHaveBeenCalledWith('user-123', expect.any(Object));
      expect(result).toEqual({
        user: expect.any(Object),
        token: 'new-token',
        refreshToken: 'new-token',
        expiresIn: expect.any(Number),
      });
    });

    it('should throw error for invalid refresh token', async () => {
      // Arrange
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(AuthService.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw error if user cannot login', async () => {
      // Arrange
      const mockDecodedToken = { userId: 'user-123' };
      const mockUser = {
        canLogin: jest.fn().mockReturnValue(false),
      };

      mockJwt.verify.mockReturnValue(mockDecodedToken as any);
      MockUser.findByPk.mockResolvedValue(mockUser as any);

      // Act & Assert
      await expect(AuthService.refreshToken('valid-refresh-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should create reset token for existing user', async () => {
      // Arrange
      const mockUser = {
        user_id: 'user-123',
        email: 'test@example.com',
        save: jest.fn().mockResolvedValue(undefined),
      };

      MockUser.findOne.mockResolvedValue(mockUser as any);

      // Act
      await AuthService.requestPasswordReset({ email: 'test@example.com' });

      // Assert
      expect(MockUser.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser).toHaveProperty('reset_token');
      expect(mockUser).toHaveProperty('reset_token_expiration');
    });

    it('should not reveal if email does not exist', async () => {
      // Arrange
      MockUser.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        AuthService.requestPasswordReset({ email: 'nonexistent@example.com' })
      ).resolves.toBeUndefined();
    });
  });

  describe('confirmPasswordReset', () => {
    it('should reset password with valid token', async () => {
      // Arrange
      const mockUser = {
        user_id: 'user-123',
        save: jest.fn().mockResolvedValue(undefined),
      };

      MockUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      } as any);
      mockBcrypt.hash.mockResolvedValue('new-hashed-password');
      MockAuditLog.create.mockResolvedValue({} as any);

      // Act
      await AuthService.confirmPasswordReset({
        token: 'valid-token',
        newPassword: 'NewPassword123!',
      });

      // Assert
      expect(mockBcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12);
      expect(mockUser).toHaveProperty('password', 'new-hashed-password');
      expect(mockUser).toHaveProperty('reset_token', null);
      expect(mockUser).toHaveProperty('reset_token_expiration', null);
      expect(mockUser.save).toHaveBeenCalled();
      expect(MockAuditLog.create).toHaveBeenCalled();
    });

    it('should throw error for invalid token', async () => {
      // Arrange
      MockUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      } as any);

      // Act & Assert
      await expect(
        AuthService.confirmPasswordReset({
          token: 'invalid-token',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should validate new password strength', async () => {
      // Arrange
      const mockUser = { user_id: 'user-123' };
      MockUser.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      } as any);

      // Act & Assert
      await expect(
        AuthService.confirmPasswordReset({
          token: 'valid-token',
          newPassword: 'weak',
        })
      ).rejects.toThrow('Password must be at least 8 characters long');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      // Arrange
      const mockUser = {
        user_id: 'user-123',
        save: jest.fn().mockResolvedValue(undefined),
      };

      MockUser.findOne.mockResolvedValue(mockUser as any);
      MockAuditLog.create.mockResolvedValue({} as any);

      // Act
      await AuthService.verifyEmail('valid-verification-token');

      // Assert
      expect(mockUser).toHaveProperty('email_verified', true);
      expect(mockUser).toHaveProperty('verification_token', null);
      expect(mockUser).toHaveProperty('verification_token_expires_at', null);
      expect(mockUser).toHaveProperty('status', UserStatus.ACTIVE);
      expect(mockUser.save).toHaveBeenCalled();
      expect(MockAuditLog.create).toHaveBeenCalled();
    });

    it('should throw error for invalid verification token', async () => {
      // Arrange
      MockUser.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(AuthService.verifyEmail('invalid-token')).rejects.toThrow(
        'Invalid or expired verification token'
      );
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email for unverified user', async () => {
      // Arrange
      const mockUser = {
        user_id: 'user-123',
        email_verified: false,
        save: jest.fn().mockResolvedValue(undefined),
      };

      MockUser.findOne.mockResolvedValue(mockUser as any);

      // Act
      await AuthService.resendVerificationEmail({ email: 'test@example.com' });

      // Assert
      expect(mockUser).toHaveProperty('verification_token');
      expect(mockUser).toHaveProperty('verification_token_expires_at');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should not send email for non-existent user', async () => {
      // Arrange
      MockUser.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        AuthService.resendVerificationEmail({ email: 'nonexistent@example.com' })
      ).resolves.toBeUndefined();
    });

    it('should not send email for already verified user', async () => {
      // Arrange
      const mockUser = {
        email_verified: true,
        save: jest.fn(),
      };

      MockUser.findOne.mockResolvedValue(mockUser as any);

      // Act & Assert
      await expect(
        AuthService.resendVerificationEmail({ email: 'verified@example.com' })
      ).resolves.toBeUndefined();

      expect(mockUser.save).not.toHaveBeenCalled();
    });
  });
});
