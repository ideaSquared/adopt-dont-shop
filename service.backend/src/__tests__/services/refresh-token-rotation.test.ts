import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';

vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters-long-12345',
    SESSION_SECRET: 'test-session-secret-min-32-characters-long',
    CSRF_SECRET: 'test-csrf-secret-min-32-characters-long-123',
  },
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../services/auth.service';
import User, { UserStatus, UserType } from '../../models/User';
import RefreshToken from '../../models/RefreshToken';
import { AuditLogService } from '../../services/auditLog.service';

vi.mock('../../models/User');
vi.mock('../../models/RefreshToken');
vi.mock('../../services/auditLog.service');
vi.mock('../../utils/logger');
vi.mock('jsonwebtoken');
vi.mock('bcryptjs');
vi.mock('crypto', async importOriginal => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    randomUUID: vi.fn().mockReturnValue('generated-uuid'),
    randomBytes: vi.fn().mockReturnValue({ toString: vi.fn().mockReturnValue('mock-token') }),
  };
});

const MockedUser = User as Mock<typeof User>;
const MockedRefreshToken = RefreshToken as Mock<typeof RefreshToken>;
const MockedAuditLogService = AuditLogService as unknown as { log: Mock };
const mockedJwt = jwt as Mock<typeof jwt>;
const mockedBcrypt = bcrypt as Mock<typeof bcrypt>;

describe('Refresh token rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockedAuditLogService.log = vi.fn().mockResolvedValue(undefined);
    mockedBcrypt.compare = vi.fn().mockResolvedValue(true as never);

    vi.spyOn(AuthService as unknown, 'generateTokens').mockResolvedValue({
      token: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 900000,
    });

    vi.spyOn(AuthService as unknown, 'storeRefreshToken').mockResolvedValue(undefined);
  });

  describe('Token issuance on login', () => {
    it('stores a refresh token record in the database when a user logs in', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'user@example.com',
        userType: UserType.ADOPTER,
        password: 'hashed',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        loginAttempts: 0,
        lockedUntil: null,
        twoFactorEnabled: false,
        isAccountLocked: vi.fn().mockReturnValue(false),
        save: vi.fn(),
        toJSON: vi.fn().mockReturnValue({ userId: 'user-123', email: 'user@example.com' }),
      };

      MockedUser.scope = vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockUser),
      } as unknown);

      const storeRefreshTokenSpy = vi.spyOn(AuthService as unknown, 'storeRefreshToken');

      await AuthService.login({ email: 'user@example.com', password: 'Password1!' });

      expect(storeRefreshTokenSpy).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('Token rotation on refresh', () => {
    const buildStoredToken = (
      overrides: Partial<{
        is_revoked: boolean;
        family_id: string;
        user_id: string;
        expires_at: Date;
      }> = {}
    ) => ({
      token_id: 'old-token-id',
      user_id: 'user-123',
      family_id: 'family-abc',
      is_revoked: false,
      expires_at: new Date(Date.now() + 3_600_000),
      replaced_by_token_id: null,
      isExpired: vi.fn().mockReturnValue(false),
      update: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    });

    const buildUser = () => ({
      userId: 'user-123',
      email: 'user@example.com',
      userType: UserType.ADOPTER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      twoFactorEnabled: false,
      canLogin: vi.fn().mockReturnValue(true),
      toJSON: vi.fn().mockReturnValue({ userId: 'user-123', email: 'user@example.com' }),
    });

    it('issues a new token pair when a valid refresh token is presented', async () => {
      mockedJwt.verify = vi.fn().mockReturnValue({ userId: 'user-123', jti: 'old-token-id' });
      MockedRefreshToken.findByPk = vi.fn().mockResolvedValue(buildStoredToken());
      MockedUser.findByPk = vi.fn().mockResolvedValue(buildUser());

      const result = await AuthService.refreshToken('valid.refresh.jwt');

      expect(result.token).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('revokes the old refresh token record after a successful rotation', async () => {
      const storedToken = buildStoredToken();
      mockedJwt.verify = vi.fn().mockReturnValue({ userId: 'user-123', jti: 'old-token-id' });
      MockedRefreshToken.findByPk = vi.fn().mockResolvedValue(storedToken);
      MockedUser.findByPk = vi.fn().mockResolvedValue(buildUser());

      await AuthService.refreshToken('valid.refresh.jwt');

      expect(storedToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_revoked: true })
      );
    });

    it('stores the new token with the same family id to maintain the rotation chain', async () => {
      const storedToken = buildStoredToken({ family_id: 'family-abc' });
      mockedJwt.verify = vi.fn().mockReturnValue({ userId: 'user-123', jti: 'old-token-id' });
      MockedRefreshToken.findByPk = vi.fn().mockResolvedValue(storedToken);
      MockedUser.findByPk = vi.fn().mockResolvedValue(buildUser());

      const storeRefreshTokenSpy = vi.spyOn(AuthService as unknown, 'storeRefreshToken');

      await AuthService.refreshToken('valid.refresh.jwt');

      expect(storeRefreshTokenSpy).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        'family-abc'
      );
    });

    it('rejects a refresh token that does not exist in the database', async () => {
      mockedJwt.verify = vi.fn().mockReturnValue({ userId: 'user-123', jti: 'unknown-id' });
      MockedRefreshToken.findByPk = vi.fn().mockResolvedValue(null);

      await expect(AuthService.refreshToken('valid.refresh.jwt')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('rejects an expired refresh token and marks it revoked', async () => {
      const storedToken = buildStoredToken({
        expires_at: new Date(Date.now() - 1000),
      });
      storedToken.isExpired = vi.fn().mockReturnValue(true);

      mockedJwt.verify = vi.fn().mockReturnValue({ userId: 'user-123', jti: 'old-token-id' });
      MockedRefreshToken.findByPk = vi.fn().mockResolvedValue(storedToken);

      await expect(AuthService.refreshToken('valid.refresh.jwt')).rejects.toThrow(
        'Invalid refresh token'
      );

      expect(storedToken.update).toHaveBeenCalledWith({ is_revoked: true });
    });
  });

  describe('Refresh token reuse detection', () => {
    it('revokes the entire token family when a revoked token is presented (reuse attack)', async () => {
      const storedToken = {
        token_id: 'old-token-id',
        user_id: 'user-123',
        family_id: 'family-abc',
        is_revoked: true,
        expires_at: new Date(Date.now() + 3_600_000),
        isExpired: vi.fn().mockReturnValue(false),
        update: vi.fn(),
      };

      mockedJwt.verify = vi.fn().mockReturnValue({ userId: 'user-123', jti: 'old-token-id' });
      MockedRefreshToken.findByPk = vi.fn().mockResolvedValue(storedToken);
      MockedRefreshToken.update = vi.fn().mockResolvedValue([1]);

      await expect(AuthService.refreshToken('reused.refresh.jwt')).rejects.toThrow(
        'Invalid refresh token'
      );

      expect(MockedRefreshToken.update).toHaveBeenCalledWith(
        { is_revoked: true },
        { where: { family_id: 'family-abc', user_id: 'user-123' } }
      );
    });

    it('does not issue new tokens when a reuse attack is detected', async () => {
      const storedToken = {
        token_id: 'old-token-id',
        user_id: 'user-123',
        family_id: 'family-abc',
        is_revoked: true,
        expires_at: new Date(Date.now() + 3_600_000),
        isExpired: vi.fn().mockReturnValue(false),
        update: vi.fn(),
      };

      mockedJwt.verify = vi.fn().mockReturnValue({ userId: 'user-123', jti: 'old-token-id' });
      MockedRefreshToken.findByPk = vi.fn().mockResolvedValue(storedToken);
      MockedRefreshToken.update = vi.fn().mockResolvedValue([1]);

      const generateTokensSpy = vi.spyOn(AuthService as unknown, 'generateTokens');

      await expect(AuthService.refreshToken('reused.refresh.jwt')).rejects.toThrow();

      expect(generateTokensSpy).not.toHaveBeenCalled();
    });
  });

  describe('Token revocation on logout', () => {
    it('revokes the refresh token record when a user logs out', async () => {
      mockedJwt.verify = vi.fn().mockReturnValue({ jti: 'token-id-123' });
      MockedRefreshToken.update = vi.fn().mockResolvedValue([1]);

      await AuthService.logout('some.valid.refresh.jwt');

      expect(MockedRefreshToken.update).toHaveBeenCalledWith(
        { is_revoked: true },
        { where: { token_id: 'token-id-123' } }
      );
    });

    it('completes logout successfully without error when no refresh token is provided', async () => {
      await expect(AuthService.logout()).resolves.not.toThrow();
    });

    it('completes logout successfully when the refresh token is expired or malformed', async () => {
      mockedJwt.verify = vi.fn().mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(AuthService.logout('expired.or.bad.token')).resolves.not.toThrow();
    });
  });
});
