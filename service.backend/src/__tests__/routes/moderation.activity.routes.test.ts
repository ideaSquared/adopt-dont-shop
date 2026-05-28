import { vi } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types';
import { errorHandler } from '../../middleware/error-handler';

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
}));

vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-12345',
    SESSION_SECRET: 'test-session-secret',
    CSRF_SECRET: 'test-csrf-secret',
  },
}));

vi.mock('../../services/moderation.service', () => ({
  default: {
    getReportActivityLog: vi.fn(),
  },
}));

vi.mock('../../middleware/rate-limiter', () => ({
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  authLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/idempotency', () => ({
  idempotency: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const authenticateTokenMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

import ModerationService from '../../services/moderation.service';
import moderationRouter from '../../routes/moderation.routes';

const mockGetActivity = vi.mocked(ModerationService.getReportActivityLog);

const sampleActivity = [
  {
    activityId: 42,
    activityType: 'other' as const,
    action: 'REPORT_ASSIGNED',
    description: 'Updated report: assigned to moderator',
    category: 'Report',
    ipAddress: null,
    userAgent: null,
    createdAt: '2024-03-02T10:00:00.000Z',
  },
];

const mockUser = {
  userId: 'moderator-1',
  email: 'mod@example.com',
  firstName: 'Mod',
  lastName: 'User',
  Roles: [
    {
      Permissions: [{ permissionName: 'moderation.reports.read' }],
    },
  ],
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/admin/moderation', moderationRouter);
  app.use(errorHandler);
  return app;
};

describe('GET /api/v1/admin/moderation/reports/:reportId/activity', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActivity.mockResolvedValue(sampleActivity);
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockUser as AuthenticatedRequest['user'];
        next();
      }
    );
    app = buildApp();
  });

  it('returns 200 with the activity array when authorised', async () => {
    const res = await request(app).get('/api/v1/admin/moderation/reports/rep-1/activity');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: sampleActivity });
    expect(mockGetActivity).toHaveBeenCalledWith('rep-1', {
      from: undefined,
      to: undefined,
      limit: undefined,
      offset: undefined,
    });
  });

  it('forwards from/to/limit/offset query parameters to the service', async () => {
    await request(app)
      .get('/api/v1/admin/moderation/reports/rep-1/activity')
      .query({ from: '2024-01-01', to: '2024-12-31', limit: '25', offset: '5' });

    expect(mockGetActivity).toHaveBeenCalledWith('rep-1', {
      from: '2024-01-01',
      to: '2024-12-31',
      limit: 25,
      offset: 5,
    });
  });

  it('returns 401 when unauthenticated', async () => {
    authenticateTokenMock.mockImplementation(
      (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
        res.status(401).json({ error: 'Access token required' });
      }
    );

    const res = await request(app).get('/api/v1/admin/moderation/reports/rep-1/activity');

    expect(res.status).toBe(401);
  });

  it('returns 403 when the user lacks moderation.reports.read', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = {
          ...mockUser,
          Roles: [{ Permissions: [{ permissionName: 'something.else' }] }],
        } as AuthenticatedRequest['user'];
        next();
      }
    );

    const res = await request(app).get('/api/v1/admin/moderation/reports/rep-1/activity');

    expect(res.status).toBe(403);
  });

  it('propagates service errors through the error handler', async () => {
    mockGetActivity.mockRejectedValue(new Error('boom'));

    const res = await request(app).get('/api/v1/admin/moderation/reports/rep-1/activity');

    expect(res.status).toBe(500);
  });
});
