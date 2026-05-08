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
  },
  AuthService: class {
    requestPasswordReset = vi.fn();
    confirmPasswordReset = vi.fn();
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

vi.mock('../../middleware/rate-limiter', () => ({
  authLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
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
}));

vi.mock('../../middleware/ip-rules', () => ({
  enforceIpRules: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const authenticateTokenMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

import AuthService from '../../services/auth.service';
import authRouter from '../../routes/auth.routes';

const mockRegister = vi.mocked(AuthService.register);
const mockLogin = vi.mocked(AuthService.login);
const mockRefreshToken = vi.mocked(AuthService.refreshToken);

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

    it('returns 201 on successful registration', async () => {
      mockRegister.mockResolvedValue({
        message: 'Registration successful. Please check your email for verification.',
        userId: 'new-uuid',
        token: 'access-token',
        refreshToken: 'refresh-token',
      });

      const res = await request(buildApp()).post('/api/v1/auth/register').send(validBody);

      expect(res.status).toBe(201);
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
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      const res = await request(buildApp()).post('/api/v1/auth/login').send(validBody);

      expect(res.status).toBe(401);
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

  describe('POST /api/v1/auth/verify-email', () => {
    it('returns 400 when token body field is missing', async () => {
      const res = await request(buildApp()).post('/api/v1/auth/verify-email').send({});

      expect(res.status).toBe(400);
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
});
