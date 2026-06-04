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
vi.mock('../../models/TwoFactorRecovery');
vi.mock('../../services/auditLog.service');
vi.mock('../../utils/logger');
vi.mock('../../lib/auth-cache', () => ({
  invalidateAuthCache: vi.fn(),
}));
vi.mock('../../socket/socket-registry', () => ({
  disconnectAllSockets: vi.fn(),
}));
vi.mock('../../utils/url-allowlist', () => ({
  getValidatedFrontendOrigin: vi.fn().mockReturnValue('https://app.example.com'),
}));
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
    // ADS-750: AuthService computes a dummy bcrypt hash lazily for the
    // no-user login path. Provide a real-shaped value so the timing
    // equaliser doesn't break tests that exercise the missing-email branch.
    mockedBcrypt.hashSync = vi
      .fn()
      .mockReturnValue('$2b$12$abcdefghijklmnopqrstuuW9zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz' as never);

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

    const buildMockUser = (overrides: Record<string, unknown> = {}) => ({
      userId: 'user-123',
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      userType: UserType.ADOPTER,
      status: UserStatus.PENDING_VERIFICATION,
      emailVerified: false,
      toJSON: vi.fn().mockReturnValue({}),
      save: vi.fn(),
      increment: vi.fn(),
      reload: vi.fn(),
      ...overrides,
    });

    it('returns a generic message on successful registration (no tokens exposed)', async () => {
      MockedUser.findOne = vi.fn().mockResolvedValue(null);
      MockedUser.create = vi.fn().mockResolvedValue(buildMockUser() as unknown);
      MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

      const result = await AuthService.register(userData);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { email: userData.email.toLowerCase() },
      });
      expect(MockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email.toLowerCase(),
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
      expect(result).toEqual({ message: expect.any(String) });
      expect(result).not.toHaveProperty('token');
      expect(result).not.toHaveProperty('user');
    });

    it('returns the same generic message when the email is already registered (no enumeration)', async () => {
      const existingUser = { userId: 'existing-user', email: userData.email };
      MockedUser.findOne = vi.fn().mockResolvedValue(existingUser as unknown);

      // Spy on the private sendAccountExistsEmail so we can assert it fires
      // without needing to wire up the full email service.
      const sendAccountExistsSpy = vi
        .spyOn(
          AuthService as unknown as { sendAccountExistsEmail: (e: string) => Promise<void> },
          'sendAccountExistsEmail'
        )
        .mockResolvedValue(undefined);

      const result = await AuthService.register(userData);

      // Response is identical in shape to a fresh registration — no enumeration possible.
      expect(result).toEqual({ message: expect.any(String) });
      expect(result).not.toHaveProperty('token');
      expect(result).not.toHaveProperty('user');

      // No user was created for the duplicate email.
      expect(MockedUser.create).not.toHaveBeenCalled();

      // The existing user receives an out-of-band "account exists" email.
      expect(sendAccountExistsSpy).toHaveBeenCalledWith(userData.email);
    });

    it('new registration and duplicate-email responses have identical shapes', async () => {
      // Fresh registration
      MockedUser.findOne = vi.fn().mockResolvedValue(null);
      MockedUser.create = vi.fn().mockResolvedValue(buildMockUser() as unknown);
      MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);
      const freshResult = await AuthService.register(userData);

      // Duplicate-email registration
      const existingUser = { userId: 'existing-user', email: userData.email };
      MockedUser.findOne = vi.fn().mockResolvedValue(existingUser as unknown);
      vi.spyOn(
        AuthService as unknown as { sendAccountExistsEmail: (e: string) => Promise<void> },
        'sendAccountExistsEmail'
      ).mockResolvedValue(undefined);
      const duplicateResult = await AuthService.register(userData);

      expect(Object.keys(freshResult).sort()).toEqual(Object.keys(duplicateResult).sort());
    });

    it('creates user with undefined phoneNumber when not provided', async () => {
      const userDataWithoutPhone: RegisterData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };
      MockedUser.findOne = vi.fn().mockResolvedValue(null);
      MockedUser.create = vi.fn().mockResolvedValue(buildMockUser() as unknown);
      MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

      await AuthService.register(userDataWithoutPhone);

      expect(MockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumber: undefined })
      );
    });

    it('normalises empty phoneNumber to undefined', async () => {
      const userDataEmptyPhone: RegisterData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '',
      };
      MockedUser.findOne = vi.fn().mockResolvedValue(null);
      MockedUser.create = vi.fn().mockResolvedValue(buildMockUser() as unknown);
      MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

      await AuthService.register(userDataEmptyPhone);

      expect(MockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumber: undefined })
      );
    });

    it('throws for an invalid (weak) password', async () => {
      const invalidUserData = { ...userData, password: 'weak' };
      MockedUser.findOne = vi.fn().mockResolvedValue(null);

      await expect(AuthService.register(invalidUserData)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('looks up and stores a Unicode-normalized email so visually-identical inputs collide', async () => {
      // Full-width letters + uppercase fold to the canonical ASCII form
      // via NFKC + lowercase. Without normalization, the duplicate-account
      // check would miss an existing 'test@example.com' row when an
      // attacker submitted the full-width variant.
      const variantUserData: RegisterData = {
        ...userData,
        email: 'ＴＥＳＴ@example.com',
      };
      MockedUser.findOne = vi.fn().mockResolvedValue(null);
      MockedUser.create = vi.fn().mockResolvedValue(buildMockUser() as unknown);
      MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

      await AuthService.register(variantUserData);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(MockedUser.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
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

    it('should not include bare resetToken in templateData passed to email service', async () => {
      const email = 'test@example.com';
      const mockUser = {
        userId: 'user-123',
        email,
        firstName: 'John',
        lastName: 'Doe',
        save: vi.fn(),
      };

      MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as unknown);

      const sendEmail = vi.fn().mockResolvedValue(undefined);
      vi.doMock('../../services/email.service', () => ({
        default: { sendEmail },
      }));

      const authService = new AuthService();
      await authService.requestPasswordReset({ email });

      expect(sendEmail).toHaveBeenCalled();
      const callArgs = sendEmail.mock.calls[0][0];
      expect(callArgs.templateData).toBeDefined();
      expect(callArgs.templateData).not.toHaveProperty('resetToken');
      expect(callArgs.templateData.resetUrl).toEqual(
        expect.stringContaining('/reset-password?token=')
      );
    });
  });

  describe('confirmPasswordReset (single-use token)', () => {
    it('only one of two concurrent confirmations with the same token succeeds', async () => {
      const token = 'shared-reset-token';
      const mockUser = {
        userId: 'user-456',
        email: 'race@example.com',
        save: vi.fn(),
      };

      MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as unknown);

      // Atomic single-use claim: the first update affects 1 row, the
      // second sees 0 rows because the token was already cleared.
      let callCount = 0;
      MockedUser.update = vi.fn().mockImplementation(() => {
        callCount += 1;
        return Promise.resolve([callCount === 1 ? 1 : 0]);
      });

      MockedRefreshToken.update = vi.fn().mockResolvedValue([0]);

      const authService = new AuthService();
      const results = await Promise.allSettled([
        authService.confirmPasswordReset({ token, newPassword: 'NewPassword123!' }),
        authService.confirmPasswordReset({ token, newPassword: 'NewPassword123!' }),
      ]);

      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      const rejectedResult = rejected[0] as PromiseRejectedResult;
      expect((rejectedResult.reason as Error).message).toMatch(/invalid or expired/i);
    });

    it('rejects when the token does not match any user', async () => {
      MockedUser.findOne = vi.fn().mockResolvedValue(null);

      const authService = new AuthService();
      await expect(
        authService.confirmPasswordReset({ token: 'bogus', newPassword: 'NewPassword123!' })
      ).rejects.toThrow(/invalid or expired/i);
    });
  });

  describe('Two-Factor Recovery (Batch KK)', () => {
    // Mock the sequelize.transaction wrapper used by confirmTwoFactorRecovery.
    // Pass-through so the callback runs with a stub transaction object.
    let sequelizeMock: ReturnType<typeof vi.fn>;
    let TwoFactorRecoveryMock: {
      create: ReturnType<typeof vi.fn>;
      findOne: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      const sequelizeModule = await import('../../sequelize');
      sequelizeMock = vi.fn(async (cb: (t: unknown) => Promise<unknown>) => cb({}));
      vi.spyOn(sequelizeModule.default, 'transaction').mockImplementation(
        sequelizeMock as unknown as typeof sequelizeModule.default.transaction
      );

      const recoveryModule = await import('../../models/TwoFactorRecovery');
      TwoFactorRecoveryMock = recoveryModule.default as unknown as typeof TwoFactorRecoveryMock;
      TwoFactorRecoveryMock.create = vi.fn().mockResolvedValue({} as unknown);
      TwoFactorRecoveryMock.findOne = vi.fn();
      TwoFactorRecoveryMock.update = vi.fn().mockResolvedValue([1]);
    });

    describe('requestTwoFactorRecovery', () => {
      it('issues a recovery row + audit log when the email matches a 2FA-enabled user', async () => {
        const mockUser = {
          userId: 'user-2fa-1',
          email: 'twofa@example.com',
          firstName: 'Two',
          lastName: 'Fa',
          twoFactorEnabled: true,
        };
        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as unknown);

        const authService = new AuthService();
        const result = await authService.requestTwoFactorRecovery(
          { email: 'twofa@example.com' },
          '203.0.113.5',
          'jest-ua'
        );

        expect(TwoFactorRecoveryMock.create).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user-2fa-1',
            token: expect.any(String),
            expires_at: expect.any(Date),
          })
        );
        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'TWO_FACTOR_RECOVERY_REQUESTED',
            entity: 'User',
            entityId: 'user-2fa-1',
            userId: 'user-2fa-1',
            ipAddress: '203.0.113.5',
            userAgent: 'jest-ua',
          })
        );
        expect(result.message).toMatch(/if the email matches/i);
      });

      it('returns the generic message + does not issue a row when email is unknown', async () => {
        MockedUser.findOne = vi.fn().mockResolvedValue(null);

        const authService = new AuthService();
        const result = await authService.requestTwoFactorRecovery({
          email: 'ghost@example.com',
        });

        expect(TwoFactorRecoveryMock.create).not.toHaveBeenCalled();
        expect(result.message).toMatch(/if the email matches/i);
        // We still audit the attempt (subjectless) so brute force is visible.
        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'TWO_FACTOR_RECOVERY_REQUESTED',
            entityId: 'unknown',
            details: expect.objectContaining({ reason: 'unknown_email' }),
          })
        );
      });

      it('returns the generic message + does not issue a row when 2FA is not enabled', async () => {
        const mockUser = {
          userId: 'user-no-2fa',
          email: 'no2fa@example.com',
          twoFactorEnabled: false,
        };
        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as unknown);

        const authService = new AuthService();
        const result = await authService.requestTwoFactorRecovery({
          email: 'no2fa@example.com',
        });

        expect(TwoFactorRecoveryMock.create).not.toHaveBeenCalled();
        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'TWO_FACTOR_RECOVERY_REQUESTED',
            details: expect.objectContaining({ reason: 'two_factor_not_enabled' }),
          })
        );
        expect(result.message).toMatch(/if the email matches/i);
      });

      it('normalises the email before lookup so case differences match the stored value', async () => {
        const mockUser = {
          userId: 'user-norm',
          email: 'norm@example.com',
          firstName: 'N',
          lastName: 'M',
          twoFactorEnabled: true,
        };
        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as unknown);

        const authService = new AuthService();
        await authService.requestTwoFactorRecovery({ email: 'NORM@EXAMPLE.COM' });

        expect(MockedUser.findOne).toHaveBeenCalledWith({
          where: { email: 'norm@example.com' },
        });
      });
    });

    describe('confirmTwoFactorRecovery', () => {
      const buildRecoveryRow = (overrides: Record<string, unknown> = {}) => ({
        recovery_id: 'rec-123',
        user_id: 'user-2fa-1',
        token: 'hashed-token',
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        used: false,
        used_at: null,
        ...overrides,
      });

      const build2FaUser = (overrides: Record<string, unknown> = {}) => ({
        userId: 'user-2fa-1',
        email: 'twofa@example.com',
        firstName: 'Two',
        lastName: 'Fa',
        twoFactorEnabled: true,
        twoFactorSecret: 'encrypted',
        twoFactorPendingSecret: null,
        twoFactorPendingExpiresAt: null,
        backupCodes: ['$2$hashed'],
        save: vi.fn().mockResolvedValue(undefined),
        ...overrides,
      });

      it('disables 2FA, revokes refresh tokens, emits audit logs on valid token', async () => {
        TwoFactorRecoveryMock.findOne = vi.fn().mockResolvedValue(buildRecoveryRow());
        TwoFactorRecoveryMock.update = vi.fn().mockResolvedValue([1]);
        const user = build2FaUser();
        MockedUser.findByPk = vi.fn().mockResolvedValue(user as unknown);
        MockedRefreshToken.update = vi.fn().mockResolvedValue([3]);

        const authService = new AuthService();
        const result = await authService.confirmTwoFactorRecovery({ token: 'plaintext' });

        expect(user.twoFactorEnabled).toBe(false);
        expect(user.twoFactorSecret).toBeNull();
        expect(user.backupCodes).toBeNull();
        expect(user.save).toHaveBeenCalled();

        expect(MockedRefreshToken.update).toHaveBeenCalledWith(
          { is_revoked: true },
          { where: { user_id: 'user-2fa-1', is_revoked: false } }
        );

        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'TWO_FACTOR_RECOVERED', userId: 'user-2fa-1' })
        );
        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'REFRESH_TOKENS_REVOKED',
            details: expect.objectContaining({ reason: 'two_factor_recovered', count: 3 }),
          })
        );

        expect(result.message).toMatch(/two-factor authentication has been disabled/i);
      });

      it('rejects when no matching recovery row exists (bogus or expired)', async () => {
        TwoFactorRecoveryMock.findOne = vi.fn().mockResolvedValue(null);

        const authService = new AuthService();
        await expect(authService.confirmTwoFactorRecovery({ token: 'bogus' })).rejects.toThrow(
          /invalid or expired/i
        );

        // No state change: no user load, no audit entry, no refresh-token revoke.
        expect(MockedRefreshToken.update).not.toHaveBeenCalled();
        expect(MockedAuditLogService.log).not.toHaveBeenCalled();
      });

      it('rejects when the conditional UPDATE loses the race (already-used token)', async () => {
        TwoFactorRecoveryMock.findOne = vi.fn().mockResolvedValue(buildRecoveryRow());
        // Another concurrent confirm already flipped used=true; our UPDATE
        // affects 0 rows and we must fail closed.
        TwoFactorRecoveryMock.update = vi.fn().mockResolvedValue([0]);

        const authService = new AuthService();
        await expect(authService.confirmTwoFactorRecovery({ token: 'plaintext' })).rejects.toThrow(
          /invalid or expired/i
        );

        expect(MockedRefreshToken.update).not.toHaveBeenCalled();
      });
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
        MockedUser.update = vi.fn().mockResolvedValue([1]);
        MockedAuditLog.create = vi.fn().mockResolvedValue({} as unknown);

        const authService = new AuthService();
        const result = await authService.verifyEmail(token);

        expect(result).toEqual({ message: 'Email verified successfully' });
        // The verify flag and status flip via a conditional UPDATE scoped to
        // emailVerified=false — the race-loser sees affectedCount=0 and
        // silently no-ops, so we only assert the atomic update was called
        // with the right WHERE clause.
        expect(MockedUser.update).toHaveBeenCalledWith(
          expect.objectContaining({
            emailVerified: true,
            status: UserStatus.ACTIVE,
          }),
          expect.objectContaining({
            where: expect.objectContaining({
              userId: mockUser.userId,
              emailVerified: false,
            }),
          })
        );
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
        MockedUser.update = vi.fn().mockResolvedValue([1]);

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

      it('writes exactly one audit-log entry when two parallel verifications use the same token', async () => {
        const token = 'shared-verification-token';
        const mockUser = {
          userId: 'user-race',
          email: 'race@example.com',
          emailVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
          verificationToken: token,
          verificationTokenExpiresAt: new Date(Date.now() + 3600000),
          save: vi.fn(),
          increment: vi.fn(),
          reload: vi.fn(),
        };

        // Both parallel reads see the same unverified user (the race window).
        MockedUser.findOne = vi.fn().mockResolvedValue(mockUser as unknown);

        // The conditional UPDATE is scoped to `emailVerified: false`, so only
        // the first call affects a row; the second sees 0 because the first
        // already flipped the flag.
        let updateCount = 0;
        MockedUser.update = vi.fn().mockImplementation(() => {
          updateCount += 1;
          return Promise.resolve([updateCount === 1 ? 1 : 0]);
        });

        const auditLogSpy = MockedAuditLogService.log as ReturnType<typeof vi.fn>;
        auditLogSpy.mockClear();

        const authService = new AuthService();
        const results = await Promise.all([
          authService.verifyEmail(token),
          authService.verifyEmail(token),
        ]);

        // Both calls return success (the loser silently treats the race as
        // idempotent), but the audit log fires exactly once.
        expect(results).toHaveLength(2);
        results.forEach(r => expect(r).toEqual({ message: 'Email verified successfully' }));

        const verificationAudits = auditLogSpy.mock.calls.filter(
          call => (call[0] as { action: string }).action === 'EMAIL_VERIFICATION'
        );
        expect(verificationAudits).toHaveLength(1);
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

        expect(result).toEqual({ message: expect.any(String) });
        expect(MockedUser.create).toHaveBeenCalledWith(
          expect.objectContaining({
            verificationToken: expect.any(String),
            verificationTokenExpiresAt: expect.any(Date),
            emailVerified: false,
            status: UserStatus.PENDING_VERIFICATION,
          })
        );
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
      // ADS-544: logout now jwt.verify()s both the refresh token AND the
      // access token. The first call validates the refresh token, the
      // second validates the access token.
      mockedJwt.verify = vi
        .fn()
        .mockReturnValueOnce(accessTokenPayload)
        .mockReturnValueOnce({ jti: 'some-token-id' });

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
      mockedJwt.verify = vi.fn().mockReturnValue(accessTokenPayload);

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

    // ADS-544: a forged/expired access token must NOT produce a RevokedToken
    // row. Previously logout decoded the token without verifying the
    // signature, so any caller could poison the blacklist with arbitrary jtis.
    it('should NOT create a RevokedToken row when access token signature is invalid (ADS-544)', async () => {
      mockedJwt.verify = vi.fn().mockImplementation(() => {
        throw new Error('invalid signature');
      });
      await expect(AuthService.logout(undefined, 'forged.access.token')).resolves.not.toThrow();
      expect(MockedRevokedToken.create).not.toHaveBeenCalled();
    });

    it('should NOT create a RevokedToken row when access token is expired (ADS-544)', async () => {
      mockedJwt.verify = vi.fn().mockImplementation(() => {
        throw new Error('jwt expired');
      });
      await expect(AuthService.logout(undefined, 'expired.access.token')).resolves.not.toThrow();
      expect(MockedRevokedToken.create).not.toHaveBeenCalled();
    });

    it('should NOT blacklist when caller userId does not match token userId (ADS-544)', async () => {
      const accessTokenPayload = {
        jti: 'access-jti-789',
        userId: 'attacker-user-id',
        exp: Math.floor(Date.now() / 1000) + 900,
      };
      mockedJwt.verify = vi.fn().mockReturnValue(accessTokenPayload);

      await AuthService.logout(undefined, 'someone-elses.access.jwt', 'victim-user-id');

      expect(MockedRevokedToken.create).not.toHaveBeenCalled();
    });

    it('writes a LOGOUT audit log entry when the caller is identified', async () => {
      await AuthService.logout(undefined, undefined, 'user-logout-123', '10.0.0.1', 'TestAgent');

      expect(MockedAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGOUT',
          userId: 'user-logout-123',
          entity: 'User',
          status: 'success',
          ipAddress: '10.0.0.1',
          userAgent: 'TestAgent',
        })
      );
    });

    it('does NOT write a LOGOUT audit log entry when no caller userId is supplied', async () => {
      // Anonymous logout (e.g. token already invalid) — nothing to attribute.
      await AuthService.logout();
      expect(MockedAuditLogService.log).not.toHaveBeenCalled();
    });
  });

  // Finding #6: forensics — every login attempt and every logout should
  // produce an audit-log row regardless of outcome, so we can reconstruct
  // who tried to authenticate, from where, and why it failed.
  describe('auth event audit logging', () => {
    const credentials: LoginCredentials = {
      email: 'forensic@example.com',
      password: 'Password123!',
    };

    const buildLoginUser = (overrides: Record<string, unknown> = {}) => ({
      userId: 'user-forensic',
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
      toJSON: vi.fn().mockReturnValue({
        userId: 'user-forensic',
        email: credentials.email,
        userType: UserType.ADOPTER,
      }),
      save: vi.fn(),
      increment: vi.fn(),
      reload: vi.fn(),
      ...overrides,
    });

    it('writes a LOGIN success audit row with ipAddress and userAgent', async () => {
      const mockUser = buildLoginUser();
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      } as unknown);
      mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

      await AuthService.login(credentials, '203.0.113.5', 'CuriousBrowser/1.0');

      expect(MockedAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN',
          userId: 'user-forensic',
          status: 'success',
          ipAddress: '203.0.113.5',
          userAgent: 'CuriousBrowser/1.0',
        })
      );
    });

    it('writes a LOGIN_FAILED audit row when the email is not registered', async () => {
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(null),
      } as unknown);

      await expect(AuthService.login(credentials, '198.51.100.7', 'AttackerAgent')).rejects.toThrow(
        'Invalid credentials'
      );

      expect(MockedAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          status: 'failure',
          ipAddress: '198.51.100.7',
          userAgent: 'AttackerAgent',
          details: expect.objectContaining({ reason: 'unknown_email' }),
        })
      );
      // Password must NOT appear anywhere in the audit details.
      const auditCall = (MockedAuditLogService.log as Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as { action?: string } | undefined)?.action === 'LOGIN_FAILED'
      );
      expect(JSON.stringify(auditCall)).not.toContain(credentials.password);
    });

    it('writes a LOGIN_FAILED audit row with reason=invalid_password on wrong password', async () => {
      const mockUser = buildLoginUser();
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      } as unknown);
      mockedBcrypt.compare = vi.fn().mockResolvedValue(false as never);

      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');

      expect(MockedAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          userId: 'user-forensic',
          status: 'failure',
          details: expect.objectContaining({ reason: 'invalid_password' }),
        })
      );
    });

    it('writes a LOGIN_FAILED audit row with reason=account_locked', async () => {
      const mockUser = buildLoginUser({
        isAccountLocked: vi.fn().mockReturnValue(true),
      });
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      } as unknown);

      await expect(AuthService.login(credentials)).rejects.toThrow(/locked/i);

      expect(MockedAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          userId: 'user-forensic',
          details: expect.objectContaining({ reason: 'account_locked' }),
        })
      );
    });

    it('writes a LOGIN_FAILED audit row with reason=email_not_verified', async () => {
      const mockUser = buildLoginUser({ emailVerified: false });
      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      } as unknown);
      mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

      await expect(AuthService.login(credentials)).rejects.toThrow(/verify your email/i);

      expect(MockedAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          userId: 'user-forensic',
          details: expect.objectContaining({ reason: 'email_not_verified' }),
        })
      );
    });
  });

  describe('verifyStepUpCredentials (ADS-592)', () => {
    it('resolves when password matches and 2FA is disabled', async () => {
      mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);
      const user = { password: 'hashed', twoFactorEnabled: false } as unknown as User;

      await expect(
        AuthService.verifyStepUpCredentials(user, 'plain-password')
      ).resolves.toBeUndefined();
    });

    it('rejects with "Invalid credentials" when password does not match', async () => {
      mockedBcrypt.compare = vi.fn().mockResolvedValue(false as never);
      const user = { password: 'hashed', twoFactorEnabled: false } as unknown as User;

      await expect(AuthService.verifyStepUpCredentials(user, 'wrong')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('rejects when 2FA is enabled and no TOTP is supplied', async () => {
      mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);
      const user = {
        password: 'hashed',
        twoFactorEnabled: true,
        twoFactorSecret: 'secret',
      } as unknown as User;

      await expect(AuthService.verifyStepUpCredentials(user, 'plain-password')).rejects.toThrow(
        /two-factor/i
      );
    });

    it('rejects when 2FA token is invalid', async () => {
      mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);
      const user = {
        password: 'hashed',
        twoFactorEnabled: true,
        twoFactorSecret: 'secret',
      } as unknown as User;
      const verifySpy = vi
        .spyOn(
          AuthService as unknown as { verifyTwoFactorToken: () => Promise<boolean> },
          'verifyTwoFactorToken'
        )
        .mockResolvedValue(false);

      await expect(
        AuthService.verifyStepUpCredentials(user, 'plain-password', '000000')
      ).rejects.toThrow(/invalid two-factor/i);

      verifySpy.mockRestore();
    });
  });
});
