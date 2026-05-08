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

vi.mock('../../services/admin.service', () => ({
  default: {
    getUsers: vi.fn(),
    getUserById: vi.fn(),
    updateUserStatus: vi.fn(),
    suspendUser: vi.fn(),
    unsuspendUser: vi.fn(),
    deleteUser: vi.fn(),
    getRescues: vi.fn(),
    verifyRescue: vi.fn(),
    rejectRescueVerification: vi.fn(),
    getSystemHealth: vi.fn(),
    getAuditLogs: vi.fn(),
    exportData: vi.fn(),
    bulkUserOperation: vi.fn(),
    verifyUser: vi.fn(),
    getPlatformMetrics: vi.fn(),
    getSystemStatistics: vi.fn(),
    getDashboardAnalytics: vi.fn(),
    updateConfiguration: vi.fn(),
    searchUsers: vi.fn(),
    moderateRescue: vi.fn(),
  },
}));

vi.mock('../../services/security.service', () => ({
  default: {
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllUserSessions: vi.fn(),
    listIpRules: vi.fn(),
    createIpRule: vi.fn(),
    deleteIpRule: vi.fn(),
    evaluateIp: vi.fn(),
    unlockAccount: vi.fn(),
    forceLockAccount: vi.fn(),
    getLoginHistory: vi.fn(),
    getSuspiciousActivity: vi.fn(),
  },
}));

vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    create: vi.fn(),
    getAuditLogs: vi.fn(),
  },
}));

vi.mock('../../middleware/rate-limiter', () => ({
  authLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const authenticateTokenMock = vi.fn();
const requireAdminMock = vi.fn();
const requirePermissionMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

vi.mock('../../middleware/rbac', () => ({
  requireAdmin: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    requireAdminMock(req, res, next),
  requirePermission:
    (perm: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
      requirePermissionMock(perm, req, res, next),
  requireRole:
    (..._roles: string[]) =>
    (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
      next(),
}));

import adminRouter from '../../routes/admin.routes';

const mockAdminUser = {
  userId: 'admin-uuid-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  userType: 'ADMIN',
  role: 'ADMIN',
  Roles: [
    {
      Permissions: [
        { permissionName: 'admin.metrics.read' },
        { permissionName: 'admin.analytics.read' },
        { permissionName: 'admin.users.search' },
        { permissionName: 'admin.users.read' },
        { permissionName: 'admin.users.update' },
        { permissionName: 'admin.rescues.manage' },
        { permissionName: 'admin.audit.read' },
        { permissionName: 'admin.data.export' },
      ],
    },
  ],
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/admin', adminRouter);
  return app;
};

describe('Admin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // All admin routes have authenticateToken + requireAdmin applied via router.use()
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockAdminUser as AuthenticatedRequest['user'];
        next();
      }
    );
    requireAdminMock.mockImplementation(
      (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
    requirePermissionMock.mockImplementation(
      (_perm: string, _req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
  });

  describe('GET /api/v1/admin/metrics', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).get('/api/v1/admin/metrics');
      expect(res.status).toBe(401);
    });

    it('returns 403 when authenticated user is not an admin', async () => {
      requireAdminMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(403).json({ error: 'Access denied' });
      });

      const res = await request(buildApp()).get('/api/v1/admin/metrics');
      expect(res.status).toBe(403);
    });

    it('returns 403 when admin lacks admin.metrics.read permission', async () => {
      requirePermissionMock.mockImplementation(
        (_perm: string, _req: AuthenticatedRequest, res: Response) => {
          res.status(403).json({ error: 'Access denied' });
        }
      );

      const res = await request(buildApp()).get('/api/v1/admin/metrics');
      expect(res.status).toBe(403);
    });

    it('reaches the controller when properly authorised', async () => {
      const res = await request(buildApp()).get('/api/v1/admin/metrics');
      // Service will throw without a real DB but 401/403 are ruled out.
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe('GET /api/v1/admin/users (user management)', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).get('/api/v1/admin/users');
      expect(res.status).toBe(401);
    });

    it('returns 403 when non-admin attempts access', async () => {
      requireAdminMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(403).json({ error: 'Access denied' });
      });

      const res = await request(buildApp()).get('/api/v1/admin/users');
      expect(res.status).toBe(403);
    });

    it('returns 403 when admin lacks admin.users.search permission', async () => {
      requirePermissionMock.mockImplementation(
        (_perm: string, _req: AuthenticatedRequest, res: Response) => {
          res.status(403).json({ error: 'Access denied' });
        }
      );

      const res = await request(buildApp()).get('/api/v1/admin/users');
      expect(res.status).toBe(403);
    });

    it('reaches the controller for authorised admins', async () => {
      const res = await request(buildApp()).get('/api/v1/admin/users');
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe('PATCH /api/v1/admin/users/:userId/action (moderation action)', () => {
    const userId = 'user-uuid-target';

    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp())
        .patch(`/api/v1/admin/users/${userId}/action`)
        .send({ action: 'suspend', reason: 'Policy violation' });

      expect(res.status).toBe(401);
    });

    it('returns 403 when non-admin attempts action', async () => {
      requireAdminMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(403).json({ error: 'Access denied' });
      });

      const res = await request(buildApp())
        .patch(`/api/v1/admin/users/${userId}/action`)
        .send({ action: 'suspend', reason: 'Policy violation' });

      expect(res.status).toBe(403);
    });

    it('returns 422 when action field is missing', async () => {
      const res = await request(buildApp()).patch(`/api/v1/admin/users/${userId}/action`).send({});

      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/admin/rescues (rescue management)', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).get('/api/v1/admin/rescues');
      expect(res.status).toBe(401);
    });

    it('returns 403 when lacking admin.rescues.manage permission', async () => {
      requirePermissionMock.mockImplementation(
        (_perm: string, _req: AuthenticatedRequest, res: Response) => {
          res.status(403).json({ error: 'Access denied' });
        }
      );

      const res = await request(buildApp()).get('/api/v1/admin/rescues');
      expect(res.status).toBe(403);
    });

    it('reaches the controller for authorised admins', async () => {
      const res = await request(buildApp()).get('/api/v1/admin/rescues');
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe('GET /api/v1/admin/audit-logs', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const res = await request(buildApp()).get('/api/v1/admin/audit-logs');
      expect(res.status).toBe(401);
    });

    it('returns 403 when lacking admin.audit.read permission', async () => {
      requirePermissionMock.mockImplementation(
        (_perm: string, _req: AuthenticatedRequest, res: Response) => {
          res.status(403).json({ error: 'Access denied' });
        }
      );

      const res = await request(buildApp()).get('/api/v1/admin/audit-logs');
      expect(res.status).toBe(403);
    });
  });
});
