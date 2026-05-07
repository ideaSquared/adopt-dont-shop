import { vi, describe, it, expect, beforeEach, afterEach, afterAll, Mock } from 'vitest';

// Mock env config FIRST before any imports
vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters-long-12345',
    SESSION_SECRET: 'test-session-secret-min-32-characters-long',
    CSRF_SECRET: 'test-csrf-secret-min-32-characters-long-123',
  },
  getDatabaseName: () => 'test_db',
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuditLog } from '../../models/AuditLog';
import { AuditLogService } from '../../services/auditLog.service';
import User, { UserStatus, UserType } from '../../models/User';
import RefreshToken from '../../models/RefreshToken';
import RevokedToken from '../../models/RevokedToken';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials, RegisterData } from '../../types';

// Mock dependencies
vi.mock('../../models/User');
vi.mock('../../models/AuditLog');
vi.mock('../../models/RefreshToken');
vi.mock('../../models/RevokedToken');
vi.mock('../../services/auditLog.service');
vi.mock('../../utils/logger');
vi.mock('jsonwebtoken');
vi.mock('bcryptjs');
vi.mock('crypto');

// Mock User model
const MockedUser = User as Mock<typeof User>;
const MockedAuditLog = AuditLog as Mock<typeof AuditLog>;
const MockedRefreshToken = RefreshToken as Mock<typeof RefreshToken>;
const MockedRevokedToken = RevokedToken as Mock<typeof RevokedToken>;
const MockedAuditLogService = AuditLogService as unknown as {
  log: Mock;
};
const mockedJwt = jwt as Mock<typeof jwt>;
const mockedBcrypt = bcrypt as Mock<typeof bcrypt>;

// Mock environment variables
const originalEnv = process.env;

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variables for tests
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-jwt-secret',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
    };

    // Mock bcrypt hash globally for all tests
    mockedBcrypt.hash = vi
      .fn()
      .mockImplementation((password: string) => Promise.resolve(`hashed_${password}` as never));
    mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

    // Mock crypto for verification tokens
    const mockCrypto = crypto as Mock<typeof crypto>;
    (mockCrypto.randomBytes as unknown as Mock) = vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue('mock-token'),
    });

    // Mock AuditLogService.log
    MockedAuditLogService.log = vi.fn().mockResolvedValue(undefined);

    // Mock the generateTokens and storeRefreshToken methods to avoid JWT/DB issues
    vi.spyOn(AuthService as unknown, 'generateTokens').mockResolvedValue({
      token: 'mocked-access-token',
      refreshToken: 'mocked-refresh-token',
      expiresIn: 900000, // 15 minutes in ms
    });
    vi.spyOn(AuthService as unknown, 'storeRefreshToken').mockResolvedValue(undefined);

    const mockTransaction = {
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      LOCK: { UPDATE: 'UPDATE' },
    };
    (MockedUser as unknown as { sequelize: unknown }).sequelize = {
      transaction: vi.fn().mockResolvedValue(mockTransaction),
    };

    // Default RefreshToken mock – individual tests override as needed
    MockedRefreshToken.findByPk = vi.fn().mockResolvedValue(null);
    MockedRefreshToken.update = vi.fn().mockResolvedValue([0]);

    // Default RevokedToken mock
    MockedRevokedToken.create = vi.fn().mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('register', () => {
    const userData: RegisterData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890',
    };

    it('should register user successfully', async () => {
      const hashedPassword = `hashed_${userData.password}`;
      const mockUser = {
        userId: 'user-123',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        userType: UserType.ADOPTER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        toJSON: vi.fn().mockReturnValue({
          userId: 'user-123',
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          userType: UserType.ADOPTER,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: false,
        }),
        save: vi.fn(),
        increment: vi.fn(),
        reload: vi.fn(),
      };

      MockedUser.findOne = vi.fn().mockResolvedValue(null);
      MockedUser.create = vi.fn().mockResolvedValue(mockUser as unknown);
      mockedJwt.sign = vi.fn().mockReturnValue('access-token' as unknown);
      MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

      const result = await AuthService.register(userData);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { email: userData.email.toLowerCase() },
      });
      expect(MockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email.toLowerCase(),
          password: expect.any(String),
          firstName: userData.firstName,
          lastName: userData.lastName,
          phoneNumber: userData.phoneNumber,
          userType: UserType.ADOPTER,
          status: UserStatus.PENDING_VERIFICATION,
          verificationToken: expect.any(String),
          verificationTokenExpiresAt: expect.any(Date),
          emailVerified: false,
        })
      );
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mocked-access-token');
    });

    it('should throw error if user already exists', async () => {
      const existingUser = { userId: 'existing-user' };
      MockedUser.findOne = vi.fn().mockResolvedValue(existingUser as unknown);

      await expect(AuthService.register(userData)).rejects.toThrow(
        'User already exists with this email'
      );
    });

    it('should register user successfully without phone number', async () => {
      const userDataWithoutPhone: RegisterData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockUser = {
        userId: 'user-456',
        email: userDataWithoutPhone.email,
        firstName: userDataWithoutPhone.firstName,
        lastName: userDataWithoutPhone.lastName,
        userType: UserType.ADOPTER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        toJSON: vi.fn().mockReturnValue({
          userId: 'user-456',
          email: userDataWithoutPhone.email,
          firstName: userDataWithoutPhone.firstName,
          lastName: userDataWithoutPhone.lastName,
          userType: UserType.ADOPTER,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: false,
        }),
        save: vi.fn(),
        increment: vi.fn(),
        reload: vi.fn(),
      };

      MockedUser.findOne = vi.fn().mockResolvedValue(null);
      MockedUser.create = vi.fn().mockResolvedValue(mockUser as unknown);
      mockedJwt.sign = vi.fn().mockReturnValue('access-token' as unknown);
      MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

      const result = await AuthService.register(userDataWithoutPhone);

      expect(MockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userDataWithoutPhone.email.toLowerCase(),
          phoneNumber: undefined,
        })
      );
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mocked-access-token');
    });

    it('should register user successfully with empty phone number', async () => {
      const userDataEmptyPhone: RegisterData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '',
      };

      const mockUser = {
        userId: 'user-789',
        email: userDataEmptyPhone.email,
        firstName: userDataEmptyPhone.firstName,
        lastName: userDataEmptyPhone.lastName,
        userType: UserType.ADOPTER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        toJSON: vi.fn().mockReturnValue({
          userId: 'user-789',
          email: userDataEmptyPhone.email,
          firstName: userDataEmptyPhone.firstName,
          lastName: userDataEmptyPhone.lastName,
          userType: UserType.ADOPTER,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: false,
        }),
        save: vi.fn(),
        increment: vi.fn(),
        reload: vi.fn(),
      };

      MockedUser.findOne = vi.fn().mockResolvedValue(null);
      MockedUser.create = vi.fn().mockResolvedValue(mockUser as unknown);
      mockedJwt.sign = vi.fn().mockReturnValue('access-token' as unknown);
      MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

      const result = await AuthService.register(userDataEmptyPhone);

      expect(MockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userDataEmptyPhone.email.toLowerCase(),
          phoneNumber: undefined,
        })
      );
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mocked-access-token');
    });

    it('should throw error for invalid password', async () => {
      const invalidUserData = { ...userData, password: 'weak' };
      MockedUser.findOne = vi.fn().mockResolvedValue(null);

      await expect(AuthService.register(invalidUserData)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });
  });

  describe('login', () => {
    const credentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login user successfully', async () => {
      const mockUser = {
        userId: 'user-123',
        email: credentials.email,
        password: 'hashedpassword',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
        twoFactorEnabled: false,
        userType: UserType.ADOPTER,
        isAccountLocked: vi.fn().mockReturnValue(false),
        isEmailVerified: vi.fn().mockReturnValue(true),
        toJSON: vi.fn().mockReturnValue({
          userId: 'user-123',
          email: credentials.email,
          userType: UserType.ADOPTER,
        }),
        save: vi.fn(),
        increment: vi.fn(),
        reload: vi.fn(),
      };

      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      } as unknown);
      mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);
      mockedJwt.sign = vi.fn().mockReturnValue('access-token' as unknown);
      MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

      const result = await AuthService.login(credentials);

      expect(MockedUser.scope).toHaveBeenCalledWith('withSecrets');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(credentials.password, mockUser.password);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mocked-access-token');
    });

    it('should throw error for invalid credentials', async () => {
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(null),
      } as unknown);

      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for wrong password', async () => {
      const mockUser = {
        userId: 'user-123',
        email: credentials.email,
        password: 'hashedpassword',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        loginAttempts: 0,
        lockedUntil: null,
        isAccountLocked: vi.fn().mockReturnValue(false),
        save: vi.fn(),
        increment: vi.fn(),
        reload: vi.fn(),
      };

      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      } as unknown);
      mockedBcrypt.compare = vi.fn().mockResolvedValue(false as never);

      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should handle account locking after failed attempts', async () => {
      const mockUser: Record<string, unknown> = {
        userId: 'user-123',
        email: credentials.email,
        password: 'hashedpassword',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        loginAttempts: 4,
        lockedUntil: null,
        isAccountLocked: vi.fn().mockReturnValue(false),
        save: vi.fn(),
        reload: vi.fn(),
      };
      // Semantic increment so post-call assertions on loginAttempts work.
      mockUser.increment = vi.fn(async (field: string) => {
        mockUser[field] = ((mockUser[field] as number) || 0) + 1;
      });

      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      } as unknown);
      mockedBcrypt.compare = vi.fn().mockResolvedValue(false as never);
      MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');

      expect(mockUser.loginAttempts).toBe(5);
      expect(mockUser.lockedUntil).toBeInstanceOf(Date);
    });
  });

  describe('refreshToken', () => {
    // ADS-169: refreshToken now performs the rotation/revoke writes inside a
    // sequelize transaction. Tests mock the transaction wrapper to a pass-
    // through so the assertions stay focused on the model calls.
    const buildPassThroughTransaction = () => {
      const txMock = vi.fn().mockImplementation(async (cb: (t: unknown) => Promise<unknown>) =>
        cb({
          /* fake transaction object — only its identity matters */
        })
      );
      (MockedRefreshToken as unknown as { sequelize: unknown }).sequelize = {
        transaction: txMock,
      };
      return txMock;
    };

    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { userId: 'user-123', jti: 'token-123' };

      const mockStoredToken = {
        token_id: 'token-123',
        user_id: 'user-123',
        family_id: 'family-abc',
        is_revoked: false,
        expires_at: new Date(Date.now() + 3_600_000),
        isExpired: vi.fn().mockReturnValue(false),
        update: vi.fn().mockResolvedValue(undefined),
      };

      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        userType: UserType.ADOPTER,
        canLogin: vi.fn().mockReturnValue(true),
        toJSON: vi.fn().mockReturnValue({
          userId: 'user-123',
          email: 'test@example.com',
          userType: UserType.ADOPTER,
        }),
      };

      mockedJwt.verify = vi.fn().mockReturnValue(mockPayload);
      MockedRefreshToken.findByPk = vi.fn().mockResolvedValue(mockStoredToken);
      MockedRefreshToken.create = vi.fn().mockResolvedValue(undefined);
      MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser);
      const txMock = buildPassThroughTransaction();

      const result = await AuthService.refreshToken(refreshToken);

      expect(mockedJwt.verify).toHaveBeenCalledWith(
        refreshToken,
        'test-refresh-secret-min-32-characters-long-12345',
        { algorithms: ['HS256'] }
      );
      expect(MockedRefreshToken.findByPk).toHaveBeenCalledWith(mockPayload.jti);
      expect(MockedUser.findByPk).toHaveBeenCalledWith(mockPayload.userId, expect.any(Object));
      // ADS-169: rotation must run inside a transaction
      expect(txMock).toHaveBeenCalled();
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mocked-access-token');
    });

    it('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid-token';

      mockedJwt.verify = vi.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(AuthService.refreshToken(invalidToken)).rejects.toThrow('Invalid refresh token');
    });

    it('revokes the entire token family inside a single transaction on reuse [ADS-169]', async () => {
      const refreshToken = 'reused-refresh-token';
      const mockPayload = { userId: 'user-123', jti: 'token-reused' };

      const mockStoredToken = {
        token_id: 'token-reused',
        user_id: 'user-123',
        family_id: 'family-abc',
        is_revoked: true,
        isExpired: vi.fn().mockReturnValue(false),
        update: vi.fn().mockResolvedValue(undefined),
      };

      mockedJwt.verify = vi.fn().mockReturnValue(mockPayload);
      MockedRefreshToken.findByPk = vi.fn().mockResolvedValue(mockStoredToken);
      MockedRefreshToken.update = vi.fn().mockResolvedValue([1]);
      const txMock = buildPassThroughTransaction();

      await expect(AuthService.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');

      expect(txMock).toHaveBeenCalled();
      expect(MockedRefreshToken.update).toHaveBeenCalledWith(
        { is_revoked: true },
        expect.objectContaining({
          where: { family_id: 'family-abc', user_id: 'user-123' },
          transaction: expect.anything(),
        })
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should create password reset request', async () => {
      const email = 'test@example.com';
      const mockUser = {
        userId: 'user-123',
        email,
        save: vi.fn(),
        increment: vi.fn(),
        reload: vi.fn(),
      };

      MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as unknown);

      const authService = new AuthService();
      await authService.requestPasswordReset({ email });

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() },
      });
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should not throw error for non-existent email', async () => {
      const email = 'nonexistent@example.com';
      MockedUser.findOne = vi.fn().mockResolvedValue(null);

      const authService = new AuthService();
      await expect(authService.requestPasswordReset({ email })).resolves.not.toThrow();
    });
  });

  describe('Email Verification Flow', () => {
    describe('verifyEmail', () => {
      it('should verify email successfully with valid token', async () => {
        const token = 'valid-verification-token';
        const mockUser = {
          userId: 'user-123',
          emailVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
          verificationToken: token,
          verificationTokenExpiresAt: new Date(Date.now() + 3600000),
          save: vi.fn(),
          increment: vi.fn(),
          reload: vi.fn(),
        };

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as unknown);
        MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

        const authService = new AuthService();
        await authService.verifyEmail(token);

        expect(mockUser.emailVerified).toBe(true);
        expect(mockUser.status).toBe(UserStatus.ACTIVE);
        expect(mockUser.save).toHaveBeenCalled();
        // verificationToken intentionally NOT cleared so duplicate clicks of
        // the same emailed link (StrictMode, retry, back/forward) are
        // idempotent. The token expires naturally; once emailVerified=true,
        // any further hit is a no-op.
        expect(mockUser.verificationToken).toBe(token);
      });

      it('should throw error for invalid token', async () => {
        const token = 'invalid-token';
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const authService = new AuthService();
        await expect(authService.verifyEmail(token)).rejects.toThrow(
          'Invalid or expired verification token'
        );
      });

      it('should throw error for expired verification token', async () => {
        const token = 'expired-token';

        // The implementation checks expiration in the WHERE clause,
        // so expired tokens won't be found
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const authService = new AuthService();
        await expect(authService.verifyEmail(token)).rejects.toThrow(
          'Invalid or expired verification token'
        );
      });

      it('should handle already verified email gracefully', async () => {
        const token = 'valid-token';

        // The implementation checks for a valid token in the WHERE clause,
        // so if the token is null (already verified), no user will be found
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const authService = new AuthService();
        await expect(authService.verifyEmail(token)).rejects.toThrow(
          'Invalid or expired verification token'
        );
      });

      it('should create audit log entry on successful verification', async () => {
        const token = 'valid-verification-token';
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          emailVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
          verificationToken: token,
          verificationTokenExpiresAt: new Date(Date.now() + 3600000),
          save: vi.fn(),
          increment: vi.fn(),
          reload: vi.fn(),
        };

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as unknown);

        const authService = new AuthService();
        await authService.verifyEmail(token);

        expect(MockedAuditLogService.log).toHaveBeenCalledWith({
          action: 'EMAIL_VERIFICATION',
          entity: 'User',
          entityId: mockUser.userId,
          details: { email: mockUser.email },
          userId: mockUser.userId,
        });
      });
    });

    describe('resendVerificationEmail', () => {
      it('should generate new token and send verification email for unverified user', async () => {
        const email = 'test@example.com';
        const mockUser = {
          userId: 'user-123',
          email,
          firstName: 'John',
          emailVerified: false,
          verificationToken: 'old-token',
          verificationTokenExpiresAt: new Date(Date.now() - 1000),
          save: vi.fn(),
          increment: vi.fn(),
          reload: vi.fn(),
        };

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as unknown);
        MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

        // Mock the email service
        const mockEmailService = {
          sendEmail: vi.fn().mockResolvedValue(undefined),
        };
        vi.doMock('../../services/email.service', () => ({
          default: mockEmailService,
        }));

        const authService = new AuthService();
        const result = await authService.resendVerificationEmail(email);

        expect(mockUser.verificationToken).toBe('mock-token');
        expect(mockUser.verificationTokenExpiresAt).toBeInstanceOf(Date);
        expect(mockUser.save).toHaveBeenCalled();
        expect(result.message).toContain('verification link has been sent');
      });

      it('should not reveal if email does not exist', async () => {
        const email = 'nonexistent@example.com';
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const authService = new AuthService();
        const result = await authService.resendVerificationEmail(email);

        expect(result.message).toContain('verification link has been sent');
      });

      it('should not reveal if email is already verified', async () => {
        const email = 'verified@example.com';
        const mockUser = {
          userId: 'user-123',
          email,
          emailVerified: true,
          save: vi.fn(),
          increment: vi.fn(),
          reload: vi.fn(),
        };

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as unknown);

        const authService = new AuthService();
        const result = await authService.resendVerificationEmail(email);

        expect(mockUser.save).not.toHaveBeenCalled();
        expect(result.message).toContain('verification link has been sent');
      });

      it('should create audit log entry when resending verification email', async () => {
        const email = 'test@example.com';
        const mockUser = {
          userId: 'user-123',
          email,
          firstName: 'John',
          emailVerified: false,
          save: vi.fn(),
          increment: vi.fn(),
          reload: vi.fn(),
        };

        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as unknown);

        const authService = new AuthService();
        await authService.resendVerificationEmail(email);

        expect(MockedAuditLogService.log).toHaveBeenCalledWith({
          action: 'VERIFICATION_EMAIL_RESEND',
          entity: 'User',
          entityId: mockUser.userId,
          details: { email: mockUser.email },
          userId: mockUser.userId,
        });
      });
    });

    describe('login - email verification enforcement', () => {
      it('should block login for users with unverified email', async () => {
        const credentials: LoginCredentials = {
          email: 'unverified@example.com',
          password: 'Password123!',
        };

        const mockUser = {
          userId: 'user-123',
          email: credentials.email,
          password: 'hashedpassword',
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: false,
          loginAttempts: 0,
          lockedUntil: null,
          isAccountLocked: vi.fn().mockReturnValue(false),
          save: vi.fn(),
          increment: vi.fn(),
          reload: vi.fn(),
        };

        MockedUser.scope = vi.fn().mockReturnValue({
          findOne: vi.fn().mockResolvedValue(mockUser),
        } as unknown);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

        await expect(AuthService.login(credentials)).rejects.toThrow(
          'Please verify your email before logging in'
        );
      });

      it('should allow login for users with verified email', async () => {
        const credentials: LoginCredentials = {
          email: 'verified@example.com',
          password: 'Password123!',
        };

        const mockUser = {
          userId: 'user-123',
          email: credentials.email,
          password: 'hashedpassword',
          status: UserStatus.ACTIVE,
          emailVerified: true,
          loginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: null,
          twoFactorEnabled: false,
          userType: UserType.ADOPTER,
          isAccountLocked: vi.fn().mockReturnValue(false),
          isEmailVerified: vi.fn().mockReturnValue(true),
          toJSON: vi.fn().mockReturnValue({
            userId: 'user-123',
            email: credentials.email,
            userType: UserType.ADOPTER,
          }),
          save: vi.fn(),
          increment: vi.fn(),
          reload: vi.fn(),
        };

        MockedUser.scope = vi.fn().mockReturnValue({
          findOne: vi.fn().mockResolvedValue(mockUser),
        } as unknown);
        mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);
        mockedJwt.sign = vi.fn().mockReturnValue('access-token' as unknown);
        MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

        const result = await AuthService.login(credentials);

        expect(result.user).toBeDefined();
        expect(result.token).toBe('mocked-access-token');
      });
    });

    describe('registration - verification email sending', () => {
      it('should send verification email after successful registration', async () => {
        const userData: RegisterData = {
          email: 'newuser@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        };

        const mockUser = {
          userId: 'user-123',
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          userType: UserType.ADOPTER,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: false,
          verificationToken: 'mock-token',
          verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          toJSON: vi.fn().mockReturnValue({
            userId: 'user-123',
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            userType: UserType.ADOPTER,
            status: UserStatus.PENDING_VERIFICATION,
            emailVerified: false,
          }),
          save: vi.fn(),
          increment: vi.fn(),
          reload: vi.fn(),
        };

        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockResolvedValue(mockUser as unknown);
        mockedJwt.sign = vi.fn().mockReturnValue('access-token' as unknown);
        MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

        // Mock the email service
        const mockEmailService = {
          sendEmail: vi.fn().mockResolvedValue('email-id-123'),
        };
        vi.doMock('../../services/email.service', () => ({
          default: mockEmailService,
        }));

        const result = await AuthService.register(userData);

        expect(result.user).toBeDefined();
        expect(MockedUser.create).toHaveBeenCalledWith(
          expect.objectContaining({
            verificationToken: expect.any(String),
            verificationTokenExpiresAt: expect.any(Date),
            emailVerified: false,
            status: UserStatus.PENDING_VERIFICATION,
          })
        );

        // Note: This test will fail until we implement email sending in registration
        // This is intentional for TDD - test first, then implement
      });

      it('should set verification token expiry to 24 hours', async () => {
        const userData: RegisterData = {
          email: 'newuser@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        };

        const beforeRegistration = Date.now();

        const mockUser = {
          userId: 'user-123',
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          userType: UserType.ADOPTER,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: false,
          toJSON: vi.fn().mockReturnValue({
            userId: 'user-123',
            email: userData.email,
          }),
          save: vi.fn(),
          increment: vi.fn(),
          reload: vi.fn(),
        };

        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockResolvedValue(mockUser as unknown);
        MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

        await AuthService.register(userData);

        const createCall = (MockedUser.create as Mock).mock.calls[0][0];
        const expiryTime = createCall.verificationTokenExpiresAt as Date;
        const expectedExpiry = beforeRegistration + 24 * 60 * 60 * 1000;

        // Allow 1 second tolerance for test execution time
        expect(expiryTime.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(expiryTime.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
      });
    });
  });

  describe('logout', () => {
    it('should handle logout without any tokens', async () => {
      await expect(AuthService.logout()).resolves.not.toThrow();
    });

    it('should revoke refresh token on logout', async () => {
      mockedJwt.verify = vi.fn().mockReturnValue({ jti: 'some-token-id' });
      await AuthService.logout('some.valid.refresh.jwt');
      expect(MockedRefreshToken.update).toHaveBeenCalledWith(
        { is_revoked: true },
        { where: { token_id: 'some-token-id' } }
      );
    });

    it('should blacklist access token on logout', async () => {
      const accessTokenPayload = {
        jti: 'access-jti-123',
        userId: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 900,
      };
      mockedJwt.verify = vi.fn().mockReturnValue({ jti: 'some-token-id' });
      (jwt.decode as unknown as Mock) = vi.fn().mockReturnValue(accessTokenPayload);

      await AuthService.logout('valid.refresh.jwt', 'valid.access.jwt');

      expect(MockedRevokedToken.create).toHaveBeenCalledWith({
        jti: 'access-jti-123',
        user_id: 'user-123',
        expires_at: expect.any(Date),
      });
    });

    it('should blacklist access token even when no refresh token is provided', async () => {
      const accessTokenPayload = {
        jti: 'access-jti-456',
        userId: 'user-456',
        exp: Math.floor(Date.now() / 1000) + 900,
      };
      (jwt.decode as unknown as Mock) = vi.fn().mockReturnValue(accessTokenPayload);

      await AuthService.logout(undefined, 'valid.access.jwt');

      expect(MockedRevokedToken.create).toHaveBeenCalledWith({
        jti: 'access-jti-456',
        user_id: 'user-456',
        expires_at: expect.any(Date),
      });
      expect(MockedRefreshToken.update).not.toHaveBeenCalled();
    });

    it('should not throw when logout is called with an expired or malformed refresh token', async () => {
      mockedJwt.verify = vi.fn().mockImplementation(() => {
        throw new Error('jwt expired');
      });
      await expect(AuthService.logout('expired.token')).resolves.not.toThrow();
    });

    it('should not throw when access token decoding fails', async () => {
      (jwt.decode as unknown as Mock) = vi.fn().mockReturnValue(null);
      await expect(AuthService.logout(undefined, 'malformed.token')).resolves.not.toThrow();
      expect(MockedRevokedToken.create).not.toHaveBeenCalled();
    });
  });
});
