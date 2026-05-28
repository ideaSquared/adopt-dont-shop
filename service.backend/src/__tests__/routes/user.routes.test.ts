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
  loggerHelpers: { logSecurity: vi.fn() },
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

vi.mock('../../models/User', () => {
  const findByPk = vi.fn();
  return {
    default: { findByPk },
    UserType: { ADOPTER: 'ADOPTER', RESCUE_STAFF: 'RESCUE_STAFF', ADMIN: 'ADMIN' },
    UserStatus: { ACTIVE: 'ACTIVE' },
  };
});

vi.mock('../../services/auth.service', () => ({
  default: {
    verifyStepUpCredentials: vi.fn(),
    logout: vi.fn(),
  },
  AuthService: {
    verifyStepUpCredentials: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../../services/user.service', () => ({
  default: {
    getUserById: vi.fn(),
    updateUserProfile: vi.fn(),
    getUserPreferences: vi.fn(),
    updateUserPreferences: vi.fn(),
    resetUserPreferences: vi.fn(),
    getUserActivityLog: vi.fn(),
    getUserActivitySummary: vi.fn(),
    getUserStatistics: vi.fn(),
    bulkUpdateUsers: vi.fn(),
    deleteAccount: vi.fn(),
    getUserPermissions: vi.fn(),
    searchUsers: vi.fn(),
    getUserWithPermissions: vi.fn(),
    getUserByEmail: vi.fn(),
  },
  UserService: {
    getUserById: vi.fn(),
    updateUserProfile: vi.fn(),
    getUserPreferences: vi.fn(),
    updateUserPreferences: vi.fn(),
    resetUserPreferences: vi.fn(),
    getUserActivityLog: vi.fn(),
    getUserActivitySummary: vi.fn(),
    getUserStatistics: vi.fn(),
    bulkUpdateUsers: vi.fn(),
    deleteAccount: vi.fn(),
    getUserPermissions: vi.fn(),
    searchUsers: vi.fn(),
    getUserWithPermissions: vi.fn(),
    getUserByEmail: vi.fn(),
  },
}));

vi.mock('../../middleware/rate-limiter', () => ({
  accountDeletionLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
    next(),
  searchLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  sensitiveWriteLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/field-permissions', () => ({
  fieldMask: () => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  fieldWriteGuard: () => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const authenticateTokenMock = vi.fn();
const requirePermissionMock = vi.fn();
const requirePermissionOrOwnershipMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

vi.mock('../../middleware/rbac', () => ({
  requirePermission:
    (perm: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
      requirePermissionMock(perm, req, res, next),
  requirePermissionOrOwnership:
    (perm: string, _resourceIdParam?: string) =>
    (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
      requirePermissionOrOwnershipMock(perm, req, res, next),
  requireRole:
    (..._roles: string[]) =>
    (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
      next(),
}));

import userRouter from '../../routes/user.routes';

const mockUser = {
  userId: 'user-uuid-1',
  email: 'user@example.com',
  firstName: 'Test',
  lastName: 'User',
  userType: 'ADOPTER',
  Roles: [],
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/users', userRouter);
  return app;
};

describe('User routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockUser as AuthenticatedRequest['user'];
        next();
      }
    );
    requirePermissionMock.mockImplementation(
      (_perm: string, _req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
    requirePermissionOrOwnershipMock.mockImplementation(
      (_perm: string, _req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
  });

  describe('GET /api/v1/users/profile', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).get('/api/v1/users/profile');
      expect(res.status).toBe(401);
    });

    it('passes auth and reaches the controller when authenticated', async () => {
      // Verifies the auth + field-mask middleware chain allows the request
      // through. Service will throw without a real DB (500) or succeed (200).
      const res = await request(buildApp()).get('/api/v1/users/profile');
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe('PUT /api/v1/users/profile', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp())
        .put('/api/v1/users/profile')
        .send({ first_name: 'Updated' });

      expect(res.status).toBe(401);
    });

    it('passes the auth layer when authenticated', async () => {
      // fieldWriteGuard is mocked to pass through, so the request
      // reaches the controller. Service may fail without a DB (500) but
      // auth/authz guards are not the failure mode under test.
      const res = await request(buildApp())
        .put('/api/v1/users/profile')
        .send({ first_name: 'Updated' });

      expect(res.status).not.toBe(401);
    });
  });

  describe('DELETE /api/v1/users/account', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).delete('/api/v1/users/account');
      expect(res.status).toBe(401);
    });

    it('returns 401 when no password is supplied', async () => {
      const res = await request(buildApp()).delete('/api/v1/users/account').send({});
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/password/i);
    });

    it('returns 401 when the supplied password does not match', async () => {
      const userModel = (await import('../../models/User')).default as unknown as {
        findByPk: ReturnType<typeof vi.fn>;
      };
      const authService = (await import('../../services/auth.service')).default as unknown as {
        verifyStepUpCredentials: ReturnType<typeof vi.fn>;
      };
      userModel.findByPk.mockResolvedValue({ userId: mockUser.userId, twoFactorEnabled: false });
      authService.verifyStepUpCredentials.mockRejectedValue(new Error('Invalid credentials'));

      const res = await request(buildApp())
        .delete('/api/v1/users/account')
        .send({ password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('returns 401 when 2FA is enabled and no token is supplied', async () => {
      const userModel = (await import('../../models/User')).default as unknown as {
        findByPk: ReturnType<typeof vi.fn>;
      };
      const authService = (await import('../../services/auth.service')).default as unknown as {
        verifyStepUpCredentials: ReturnType<typeof vi.fn>;
      };
      userModel.findByPk.mockResolvedValue({ userId: mockUser.userId, twoFactorEnabled: true });
      authService.verifyStepUpCredentials.mockRejectedValue(
        new Error('Two-factor authentication code required')
      );

      const res = await request(buildApp())
        .delete('/api/v1/users/account')
        .send({ password: 'correct-password' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/two-factor/i);
    });

    it('clears accessToken and refreshToken cookies, revokes tokens, and deletes the account on success', async () => {
      const userModel = (await import('../../models/User')).default as unknown as {
        findByPk: ReturnType<typeof vi.fn>;
      };
      const authService = (await import('../../services/auth.service')).default as unknown as {
        verifyStepUpCredentials: ReturnType<typeof vi.fn>;
        logout: ReturnType<typeof vi.fn>;
      };
      const userService = (await import('../../services/user.service')).default as unknown as {
        deleteAccount: ReturnType<typeof vi.fn>;
      };

      userModel.findByPk.mockResolvedValue({ userId: mockUser.userId, twoFactorEnabled: false });
      authService.verifyStepUpCredentials.mockResolvedValue(undefined);
      authService.logout.mockResolvedValue(undefined);
      userService.deleteAccount.mockResolvedValue(undefined);

      const res = await request(buildApp())
        .delete('/api/v1/users/account')
        .send({ password: 'correct-password', reason: 'no longer needed' });

      expect(res.status).toBe(200);
      expect(authService.logout).toHaveBeenCalled();
      expect(userService.deleteAccount).toHaveBeenCalledWith(mockUser.userId, 'no longer needed');

      const setCookie = res.headers['set-cookie'];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      const cookieHeader = cookies.join('\n');
      expect(cookieHeader).toMatch(/accessToken=;/);
      expect(cookieHeader).toMatch(/refreshToken=;/);
    });
  });

  describe('GET /api/v1/users/preferences', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).get('/api/v1/users/preferences');
      expect(res.status).toBe(401);
    });

    it('reaches the controller when authenticated', async () => {
      const res = await request(buildApp()).get('/api/v1/users/preferences');
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });
});
