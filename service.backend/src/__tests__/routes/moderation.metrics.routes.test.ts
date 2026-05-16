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
    getModerationMetrics: vi.fn(),
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

const mockGetMetrics = vi.mocked(ModerationService.getModerationMetrics);

const mockMetrics = {
  reports: {
    total: 17,
    pending: 5,
    underReview: 3,
    resolved: 7,
    dismissed: 2,
    byCategory: { spam: 10, harassment: 7 },
    bySeverity: { low: 5, medium: 8, high: 4 },
  },
  actions: {
    total: 11,
    byType: { warning_issued: 8, user_suspended: 3 },
    active: 8,
    reversed: 3,
  },
  response: {
    averageResponseTime: 2.5,
    averageResolutionTime: 24.5,
  },
};

const mockUser = {
  userId: 'moderator-1',
  email: 'mod@example.com',
  firstName: 'Mod',
  lastName: 'User',
  Roles: [
    {
      Permissions: [{ permissionName: 'moderation.metrics.read' }],
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

describe('GET /api/v1/admin/moderation/metrics', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMetrics.mockResolvedValue(mockMetrics);
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockUser as AuthenticatedRequest['user'];
        next();
      }
    );
    app = buildApp();
  });

  it('returns 200 with metrics when authenticated and authorised', async () => {
    const res = await request(app).get('/api/v1/admin/moderation/metrics');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      reports: expect.objectContaining({ total: 17 }),
      actions: expect.objectContaining({ total: 11 }),
      response: expect.objectContaining({ averageResponseTime: 2.5 }),
    });
  });

  it('calls getModerationMetrics without date range when no query params given', async () => {
    await request(app).get('/api/v1/admin/moderation/metrics');

    expect(mockGetMetrics).toHaveBeenCalledWith(undefined);
  });

  it('passes parsed date range to service when startDate and endDate are provided', async () => {
    const res = await request(app)
      .get('/api/v1/admin/moderation/metrics')
      .query({ startDate: '2024-01-01', endDate: '2024-12-31' });

    expect(res.status).toBe(200);
    expect(mockGetMetrics).toHaveBeenCalledWith({
      from: new Date('2024-01-01'),
      to: new Date('2024-12-31'),
    });
  });

  it('returns 422 when period query param is invalid (ADS-455 — semantic violation)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/moderation/metrics')
      .query({ period: 'invalid_period' });

    expect(res.status).toBe(422);
  });

  it('returns 401 when request is unauthenticated', async () => {
    authenticateTokenMock.mockImplementation(
      (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
        res.status(401).json({ error: 'Access token required' });
      }
    );

    const res = await request(app).get('/api/v1/admin/moderation/metrics');

    expect(res.status).toBe(401);
  });

  it('returns 500 when service throws', async () => {
    mockGetMetrics.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/v1/admin/moderation/metrics');

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
  });
});
