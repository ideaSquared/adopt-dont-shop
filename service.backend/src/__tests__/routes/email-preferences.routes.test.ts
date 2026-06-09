import { vi, describe, it, expect, beforeEach } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types';
import { UserType } from '../../models/User';
import { errorHandler } from '../../middleware/error-handler';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logSecurity: vi.fn() },
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../config/env', () => ({
  isProductionLike: () => false,
  env: {
    JWT_SECRET: 'test-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-12345',
    SESSION_SECRET: 'test-session-secret',
    CSRF_SECRET: 'test-csrf-secret',
  },
}));

const { mockGetUserPreferences, mockUpdateUserPreferences, mockAuditLog } = vi.hoisted(() => ({
  mockGetUserPreferences: vi.fn(),
  mockUpdateUserPreferences: vi.fn(),
  mockAuditLog: vi.fn(),
}));

vi.mock('../../services/email.service', () => ({
  default: {
    getUserPreferences: mockGetUserPreferences,
    updateUserPreferences: mockUpdateUserPreferences,
  },
}));

vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: { log: mockAuditLog },
  AuditLogAction: {
    FORBIDDEN_ACCESS_ATTEMPT: 'FORBIDDEN_ACCESS_ATTEMPT',
  },
}));

vi.mock('../../middleware/rate-limiter', () => ({
  authLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const authenticateTokenMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

vi.mock('../../middleware/rbac', () => ({
  requireRole:
    (..._roles: string[]) =>
    (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
      next(),
  requireAdmin: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  requirePermission:
    (_perm: string) =>
    (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
      next(),
  ForbiddenError: class ForbiddenError extends Error {
    statusCode = 403;
    constructor(message: string) {
      super(message);
    }
  },
}));

import emailRouter from '../../routes/email.routes';

const TARGET_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const OTHER_USER_ID = 'b2c3d4e5-f6a7-8901-bcde-f01234567891';
const ADMIN_USER_ID = 'c3d4e5f6-a7b8-9012-cdef-012345678912';

const makeUser = (userId: string, userType: UserType) => ({
  userId,
  email: `${userId}@example.com`,
  firstName: 'Test',
  lastName: 'User',
  userType,
});

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/email', emailRouter);
  app.use(errorHandler);
  return app;
};

describe('Email preferences ownership guard (ADS-769)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserPreferences.mockResolvedValue({ emailNotifications: true });
    mockUpdateUserPreferences.mockResolvedValue({ emailNotifications: false });
    mockAuditLog.mockResolvedValue(undefined);
  });

  describe('GET /api/v1/email/preferences/:userId', () => {
    it('allows a user to read their own preferences', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = makeUser(TARGET_USER_ID, UserType.ADOPTER) as AuthenticatedRequest['user'];
          next();
        }
      );

      const res = await request(buildApp()).get(
        `/api/v1/email/preferences/${TARGET_USER_ID}`
      );

      expect(res.status).toBe(200);
      expect(mockGetUserPreferences).toHaveBeenCalledWith(TARGET_USER_ID);
    });

    it('returns 403 when a user tries to read another user\'s preferences', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = makeUser(OTHER_USER_ID, UserType.ADOPTER) as AuthenticatedRequest['user'];
          next();
        }
      );

      const res = await request(buildApp()).get(
        `/api/v1/email/preferences/${TARGET_USER_ID}`
      );

      expect(res.status).toBe(403);
      expect(mockGetUserPreferences).not.toHaveBeenCalled();
    });

    it('records a FORBIDDEN_ACCESS_ATTEMPT audit event when the 403 fires', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = makeUser(OTHER_USER_ID, UserType.ADOPTER) as AuthenticatedRequest['user'];
          next();
        }
      );

      await request(buildApp()).get(`/api/v1/email/preferences/${TARGET_USER_ID}`);

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FORBIDDEN_ACCESS_ATTEMPT',
          entity: 'EmailPreferences',
          entityId: TARGET_USER_ID,
          userId: OTHER_USER_ID,
          level: 'WARNING',
          status: 'failure',
        })
      );
    });

    it('allows an ADMIN to read any user\'s preferences', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = makeUser(ADMIN_USER_ID, UserType.ADMIN) as AuthenticatedRequest['user'];
          next();
        }
      );

      const res = await request(buildApp()).get(
        `/api/v1/email/preferences/${TARGET_USER_ID}`
      );

      expect(res.status).toBe(200);
      expect(mockGetUserPreferences).toHaveBeenCalledWith(TARGET_USER_ID);
    });

    it('allows a SUPER_ADMIN to read any user\'s preferences', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = makeUser(ADMIN_USER_ID, UserType.SUPER_ADMIN) as AuthenticatedRequest['user'];
          next();
        }
      );

      const res = await request(buildApp()).get(
        `/api/v1/email/preferences/${TARGET_USER_ID}`
      );

      expect(res.status).toBe(200);
      expect(mockGetUserPreferences).toHaveBeenCalledWith(TARGET_USER_ID);
    });
  });

  describe('PUT /api/v1/email/preferences/:userId', () => {
    const preferencesPayload = { emailNotifications: false };

    it('allows a user to update their own preferences', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = makeUser(TARGET_USER_ID, UserType.ADOPTER) as AuthenticatedRequest['user'];
          next();
        }
      );

      const res = await request(buildApp())
        .put(`/api/v1/email/preferences/${TARGET_USER_ID}`)
        .send(preferencesPayload);

      expect(res.status).toBe(200);
      expect(mockUpdateUserPreferences).toHaveBeenCalledWith(
        TARGET_USER_ID,
        expect.any(Object)
      );
    });

    it('returns 403 when a user tries to update another user\'s preferences', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = makeUser(OTHER_USER_ID, UserType.ADOPTER) as AuthenticatedRequest['user'];
          next();
        }
      );

      const res = await request(buildApp())
        .put(`/api/v1/email/preferences/${TARGET_USER_ID}`)
        .send(preferencesPayload);

      expect(res.status).toBe(403);
      expect(mockUpdateUserPreferences).not.toHaveBeenCalled();
    });

    it('records a FORBIDDEN_ACCESS_ATTEMPT audit event when PUT 403 fires', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = makeUser(OTHER_USER_ID, UserType.ADOPTER) as AuthenticatedRequest['user'];
          next();
        }
      );

      await request(buildApp())
        .put(`/api/v1/email/preferences/${TARGET_USER_ID}`)
        .send(preferencesPayload);

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FORBIDDEN_ACCESS_ATTEMPT',
          entity: 'EmailPreferences',
          entityId: TARGET_USER_ID,
          userId: OTHER_USER_ID,
          level: 'WARNING',
          status: 'failure',
        })
      );
    });

    it('allows an ADMIN to update any user\'s preferences', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = makeUser(ADMIN_USER_ID, UserType.ADMIN) as AuthenticatedRequest['user'];
          next();
        }
      );

      const res = await request(buildApp())
        .put(`/api/v1/email/preferences/${TARGET_USER_ID}`)
        .send(preferencesPayload);

      expect(res.status).toBe(200);
      expect(mockUpdateUserPreferences).toHaveBeenCalledWith(
        TARGET_USER_ID,
        expect.any(Object)
      );
    });

    it('allows a SUPER_ADMIN to update any user\'s preferences', async () => {
      authenticateTokenMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = makeUser(ADMIN_USER_ID, UserType.SUPER_ADMIN) as AuthenticatedRequest['user'];
          next();
        }
      );

      const res = await request(buildApp())
        .put(`/api/v1/email/preferences/${TARGET_USER_ID}`)
        .send(preferencesPayload);

      expect(res.status).toBe(200);
      expect(mockUpdateUserPreferences).toHaveBeenCalledWith(
        TARGET_USER_ID,
        expect.any(Object)
      );
    });
  });
});
