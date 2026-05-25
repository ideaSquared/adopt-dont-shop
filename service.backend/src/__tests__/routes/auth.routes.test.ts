import { vi } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types';

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  loggerHelpers: {
    logSecurity: vi.fn(),
  },
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-12345',
    SESSION_SECRET: 'test-session-secret',
    CSRF_SECRET: 'test-csrf-secret',
  },
}));

vi.mock('../../services/auth.service', () => ({
  default: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    generateTwoFactorSecret: vi.fn(),
    generateQrCodeDataUrl: vi.fn(),
    enableTwoFactor: vi.fn(),
    verifyTwoFactorSetupToken: vi.fn(),
    generateBackupCodes: vi.fn(),
  },
  AuthService: class {
    requestPasswordReset = vi.fn();
    confirmPasswordReset = vi.fn();
    requestTwoFactorRecovery = vi.fn();
    confirmTwoFactorRecovery = vi.fn();
    verifyEmail = vi.fn();
    resendVerificationEmail = vi.fn();
  },
}));

vi.mock('../../services/user.service', () => ({
  UserService: {
    getUserById: vi.fn(),
    updateUserProfile: vi.fn(),
  },
  default: {
    getUserById: vi.fn(),
    updateUserProfile: vi.fn(),
  },
}));

const authLimiterImpl = vi.hoisted(() => ({
  current: (_req: unknown, _res: unknown, next: () => void): void => next(),
}));

vi.mock('../../middleware/rate-limiter', () => ({
  authLimiter: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authLimiterImpl.current(req, res, next),
  passwordResetLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  twoFactorLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  loginEmailLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/auth-rate-limit', () => ({
  registrationIpLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  registrationEmailLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
    next(),
  loginIpLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  passwordResetIpLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
    next(),
  passwordResetEmailLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
    next(),
  passwordResetTokenLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
    next(),
}));

vi.mock('../../middleware/turnstile', () => ({
  verifyTurnstileToken: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/ip-rules', () => ({
  enforceIpRules: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../models/User', () => ({
  default: {
    scope: vi.fn(),
    findByPk: vi.fn(),
  },
}));

vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

const authenticateTokenMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

import AuthService from '../../services/auth.service';
import authRouter from '../../routes/auth.routes';
import User from '../../models/User';
import { UnauthorizedError } from '../../middleware/error-handler';

const mockRegister = vi.mocked(AuthService.register);
const mockLogin = vi.mocked(AuthService.login);
const mockRefreshToken = vi.mocked(AuthService.refreshToken);
const mockVerifyTwoFactorSetupToken = vi.mocked(AuthService.verifyTwoFactorSetupToken);
const mockGenerateBackupCodes = vi.mocked(AuthService.generateBackupCodes);
const mockUserScope = vi.mocked(User.scope);
const mockUserFindByPk = vi.mocked(User.findByPk);

const mockUser = {
  userId: 'user-uuid-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  userType: 'ADOPTER',
  isVerified: true,
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRouter);
  return app;
};

describe('Auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockUser as AuthenticatedRequest['user'];
        next();
      }
    );
  });

  describe('POST /api/v1/auth/register', () => {
    const validBody = {
      email: 'new@example.com',
      password: 'SecurePass123!',
      firstName: 'Jane',
      lastName: 'Doe',
      userType: 'ADOPTER',
    };

    it('returns 201 with a generic message on successful registration', async () => {
      mockRegister.mockResolvedValue({
        message: 'Registration request received. Check your email to continue.',
      });

      const res = await request(buildApp()).post('/api/v1/auth/register').send(validBody);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        message: 'Registration request received. Check your email to continue.',
      });
      expect(res.body).not.toHaveProperty('token');
      expect(res.body).not.toHaveProperty('refreshToken');
      expect(res.body).not.toHaveProperty('user');
      // No auth cookies set either (ADS-538).
      const setCookieHeader = res.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : setCookieHeader
          ? [setCookieHeader]
          : [];
      expect(cookies.some((c: string) => c.startsWith('accessToken='))).toBe(false);
      expect(cookies.some((c: string) => c.startsWith('refreshToken='))).toBe(false);
    });

    it('returns 201 with the same generic message when email is already registered', async () => {
      // The service resolves (not rejects) with the same message — no enumeration possible.
      mockRegister.mockResolvedValue({
        message: 'Registration request received. Check your email to continue.',
      });

      const res = await request(buildApp()).post('/api/v1/auth/register').send(validBody);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        message: 'Registration request received. Check your email to continue.',
      });
    });

    it('returns 422 when required fields are missing', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/register').send({ email: 'bad' });

      expect(res.status).toBe(422);
    });

    it('returns 422 when email is invalid', async () => {
      const res = await request(buildApp())
        .post('/api/v1/auth/register')
        .send({ ...validBody, email: 'not-an-email' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const validBody = {
      email: 'user@example.com',
      password: 'SecurePass123!',
    };

    it('returns 200 on successful login', async () => {
      mockLogin.mockResolvedValue({
        message: 'Login successful',
        token: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      });

      const res = await request(buildApp()).post('/api/v1/auth/login').send(validBody);

      expect(res.status).toBe(200);
    });

    it('returns 422 when email is missing', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/login').send({ password: 'pass' });

      expect(res.status).toBe(422);
    });

    it('returns 422 when password is missing', async () => {
      const res = await request(buildApp())
        .post('/api/v1/auth/login')
        .send({ email: 'user@example.com' });

      expect(res.status).toBe(422);
    });

    it('returns 401 when credentials are invalid', async () => {
      mockLogin.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

      const res = await request(buildApp()).post('/api/v1/auth/login').send(validBody);

      expect(res.status).toBe(401);
    });

    // ADS-547: CSRF session-fixation hardening — the per-browser identifier
    // cookie (csrf-session in dev / __Host-csrf-session in prod) MUST be
    // rotated on the auth state transition, so an attacker who pre-planted
    // a value the victim's browser already carries cannot replay a token
    // bound to it. The same rotation also covers 2FA-gated logins because
    // AuthService.login verifies the 2FA token before returning success.
    it('rotates the CSRF session cookie on successful login', async () => {
      mockLogin.mockResolvedValue({
        message: 'Login successful',
        token: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      });

      const res = await request(buildApp())
        .post('/api/v1/auth/login')
        .set('Cookie', 'csrf-session=attacker-planted-id')
        .send(validBody);

      expect(res.status).toBe(200);
      const setCookieHeader = res.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : setCookieHeader
          ? [setCookieHeader]
          : [];

      // Two csrf-session entries: the clear (empty value, past expiry) and
      // the freshly minted one (non-empty value, non-zero maxAge).
      const csrfSessionCookies = cookies.filter((c: string) => c.startsWith('csrf-session='));
      expect(csrfSessionCookies.length).toBeGreaterThanOrEqual(2);

      const newSessionCookie = csrfSessionCookies.find(
        (c: string) => !c.startsWith('csrf-session=;')
      );
      expect(newSessionCookie).toBeDefined();
      // The rotated value must NOT match what the attacker planted.
      expect(newSessionCookie).not.toContain('attacker-planted-id');
    });

    it('does not rotate the CSRF session cookie on failed login', async () => {
      mockLogin.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

      const res = await request(buildApp())
        .post('/api/v1/auth/login')
        .set('Cookie', 'csrf-session=attacker-planted-id')
        .send(validBody);

      expect(res.status).toBe(401);
      const setCookieHeader = res.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : setCookieHeader
          ? [setCookieHeader]
          : [];
      expect(cookies.some((c: string) => c.startsWith('csrf-session='))).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).post('/api/v1/auth/logout');
      expect(res.status).toBe(401);
    });

    it('does not return 401 when authenticated', async () => {
      // Authenticated users reach the controller; service may throw without a
      // real DB but auth is not the failure mode under test here.
      const res = await request(buildApp()).post('/api/v1/auth/logout');
      expect(res.status).not.toBe(401);
    });

    // ADS-547: logout must also clear the CSRF session identifier cookie so
    // a subsequent anonymous request mints a fresh one rather than reusing
    // the identifier bound to the now-terminated authenticated session.
    it('clears the CSRF session cookie on logout', async () => {
      const res = await request(buildApp())
        .post('/api/v1/auth/logout')
        .set('Cookie', 'csrf-session=prior-session-id')
        .send({ refreshToken: 'placeholder' });

      const setCookieHeader = res.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : setCookieHeader
          ? [setCookieHeader]
          : [];
      // A cleared cookie is expressed as `name=; Expires=...` — value empty.
      const csrfSessionClear = cookies.find((c: string) => c.startsWith('csrf-session=;'));
      expect(csrfSessionClear).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('returns 200 when refresh token is valid', async () => {
      mockRefreshToken.mockResolvedValue({
        token: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const res = await request(buildApp())
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(res.status).toBe(200);
    });

    it('returns 400 when refresh token is missing from body and cookies', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/refresh-token').send({});

      // Controller checks for missing token before calling service
      expect(res.status).toBe(400);
    });

    it('returns 401 when refresh token is invalid', async () => {
      mockRefreshToken.mockRejectedValue(new Error('Invalid refresh token'));

      const res = await request(buildApp())
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'bad-token' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns 422 when email is missing', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/forgot-password').send({});

      expect(res.status).toBe(422);
    });

    it('returns 422 when email is not a valid address', async () => {
      const res = await request(buildApp())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-valid' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/v1/auth/2fa/recover', () => {
    it('returns 422 when email is missing', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/2fa/recover').send({});

      expect(res.status).toBe(422);
    });

    it('returns 422 when email is not a valid address', async () => {
      const res = await request(buildApp())
        .post('/api/v1/auth/2fa/recover')
        .send({ email: 'not-valid' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/v1/auth/2fa/recover/confirm', () => {
    it('returns 422 when token is missing', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/2fa/recover/confirm').send({});

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    it('returns 400 when token body field is missing', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/verify-email').send({});

      expect(res.status).toBe(400);
    });

    it('applies the auth IP rate limiter so the endpoint cannot be brute-forced', async () => {
      // Swap the shared authLimiter mock for a counter that 429s after N
      // calls. This verifies the /verify-email route is actually wired to
      // authLimiter (otherwise the counter is never incremented and the
      // limit never fires).
      const MAX = 5;
      let calls = 0;
      authLimiterImpl.current = (
        _req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
      ): void => {
        calls += 1;
        if (calls > MAX) {
          res.status(429).json({ error: 'Too many requests' });
          return;
        }
        next();
      };

      try {
        // First MAX requests reach the controller and return the usual 400.
        for (let i = 0; i < MAX; i += 1) {
          const res = await request(buildApp()).post('/api/v1/auth/verify-email').send({});
          expect(res.status).toBe(400);
        }

        // The (MAX + 1)-th request is rate-limited.
        const blocked = await request(buildApp()).post('/api/v1/auth/verify-email').send({});
        expect(blocked.status).toBe(429);
      } finally {
        authLimiterImpl.current = (
          _req: AuthenticatedRequest,
          _res: Response,
          next: NextFunction
        ): void => next();
      }
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 200 with current user when authenticated', async () => {
      const res = await request(buildApp()).get('/api/v1/auth/me');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/2fa/backup-codes (ADS-593)', () => {
    const userWith2FA = {
      ...mockUser,
      twoFactorEnabled: true,
      twoFactorSecret: 'encrypted-secret',
    };

    beforeEach(() => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = userWith2FA as AuthenticatedRequest['user'];
          next();
        }
      );
    });

    it('returns 422 when TOTP token is missing from request body', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/2fa/backup-codes').send({});

      expect(res.status).toBe(422);
    });

    it('returns 422 when TOTP token is not 6 digits', async () => {
      const res = await request(buildApp())
        .post('/api/v1/auth/2fa/backup-codes')
        .send({ token: '12345' });

      expect(res.status).toBe(422);
    });

    it('returns 400 when 2FA is not enabled on the account', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = { ...mockUser, twoFactorEnabled: false } as AuthenticatedRequest['user'];
          next();
        }
      );

      const res = await request(buildApp())
        .post('/api/v1/auth/2fa/backup-codes')
        .send({ token: '123456' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when the supplied TOTP is invalid', async () => {
      mockUserScope.mockReturnValue({
        findByPk: vi.fn().mockResolvedValue({
          twoFactorSecret: 'encrypted-secret',
        }),
      } as unknown as ReturnType<typeof User.scope>);
      mockVerifyTwoFactorSetupToken.mockReturnValue(false);

      const res = await request(buildApp())
        .post('/api/v1/auth/2fa/backup-codes')
        .send({ token: '000000' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 200 with new backup codes when TOTP is valid', async () => {
      const freshCodes = [
        'aabb1122',
        'ccdd3344',
        'eeff5566',
        'aabb7788',
        'ccdd9900',
        '11223344',
        '55667788',
        '99aabbcc',
        'ddeeff00',
        '11223300',
      ];
      const mockSave = vi.fn().mockResolvedValue(undefined);
      mockUserScope.mockReturnValue({
        findByPk: vi.fn().mockResolvedValue({ twoFactorSecret: 'encrypted-secret' }),
      } as unknown as ReturnType<typeof User.scope>);
      mockUserFindByPk.mockResolvedValue({
        userId: userWith2FA.userId,
        backupCodes: [],
        save: mockSave,
      } as unknown as Awaited<ReturnType<typeof User.findByPk>>);
      mockVerifyTwoFactorSetupToken.mockReturnValue(true);
      mockGenerateBackupCodes.mockReturnValue(freshCodes);

      const res = await request(buildApp())
        .post('/api/v1/auth/2fa/backup-codes')
        .send({ token: '123456' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('backupCodes');
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
