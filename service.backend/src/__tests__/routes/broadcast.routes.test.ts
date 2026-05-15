import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { AuthenticatedRequest } from '../../types';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logSecurity: vi.fn(), logBusiness: vi.fn() },
}));

vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-12345',
    SESSION_SECRET: 'test-session-secret',
    CSRF_SECRET: 'test-csrf-secret',
  },
}));

vi.mock('../../services/notification.service', () => ({
  NotificationService: {
    getUserNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    getNotificationPreferences: vi.fn(),
  },
}));

vi.mock('../../services/broadcast.service', async () => {
  const actual = await vi.importActual<typeof import('../../services/broadcast.service')>(
    '../../services/broadcast.service'
  );
  return {
    ...actual,
    BroadcastService: {
      broadcast: vi.fn(),
      previewAudienceCount: vi.fn(),
    },
  };
});

vi.mock('../../services/rich-text-processing.service', () => ({
  RichTextProcessingService: { sanitize: vi.fn((c: string) => c) },
}));

// Bypass the shared Idempotency-Key middleware in this test layer; the
// idempotency contract is already covered by its own dedicated tests.
// Here we only assert the broadcast route validates input and calls the
// service exactly once per request.
vi.mock('../../middleware/idempotency', () => ({
  idempotency: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

// Disable the rate-limit middleware so we can test the success-path
// without the in-memory store leaking counts across tests.
vi.mock('../../middleware/rate-limiter', () => ({
  broadcastLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const authenticateTokenMock = vi.fn();
const requirePermissionMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

vi.mock('../../middleware/rbac', () => ({
  requirePermission:
    (perm: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
      requirePermissionMock(perm, req, res, next),
}));

import { BroadcastService } from '../../services/broadcast.service';
import notificationRouter from '../../routes/notification.routes';

const mockedBroadcast = vi.mocked(BroadcastService.broadcast);
const mockedPreview = vi.mocked(BroadcastService.previewAudienceCount);

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/notifications', notificationRouter);
  return app;
};

const mockUser = {
  userId: 'admin-1',
  email: 'admin@example.com',
};

describe('POST /api/v1/notifications/broadcast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockUser as AuthenticatedRequest['user'];
        next();
      }
    );
    requirePermissionMock.mockImplementation((_perm, _req, _res, next) => next());
  });

  it('returns 403 when caller lacks the broadcast permission', async () => {
    requirePermissionMock.mockImplementationOnce((_perm, _req, res: Response) => {
      res.status(403).json({ error: 'forbidden' });
    });
    const res = await request(buildApp())
      .post('/api/v1/notifications/broadcast')
      .send({
        audience: 'all',
        title: 'Hello',
        body: 'Body',
        channels: ['in_app'],
      });
    expect(res.status).toBe(403);
    expect(mockedBroadcast).not.toHaveBeenCalled();
  });

  it('rejects an invalid audience with 400', async () => {
    const res = await request(buildApp())
      .post('/api/v1/notifications/broadcast')
      .send({
        audience: 'all-banned',
        title: 'Hi',
        body: 'Body',
        channels: ['in_app'],
      });
    expect(res.status).toBe(400);
    expect(mockedBroadcast).not.toHaveBeenCalled();
  });

  it('rejects an empty channels array with 400', async () => {
    const res = await request(buildApp()).post('/api/v1/notifications/broadcast').send({
      audience: 'all',
      title: 'Hi',
      body: 'Body',
      channels: [],
    });
    expect(res.status).toBe(400);
  });

  it('sends a broadcast with the validated payload', async () => {
    mockedBroadcast.mockResolvedValue({
      audience: 'all',
      targetCount: 5,
      deliveredInApp: 5,
      skippedByPrefs: 0,
      skippedByDnd: 0,
      channels: ['in_app'],
    });

    const res = await request(buildApp())
      .post('/api/v1/notifications/broadcast')
      .send({
        audience: 'all',
        title: 'Hello',
        body: 'Body',
        channels: ['in_app'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.targetCount).toBe(5);
    expect(mockedBroadcast).toHaveBeenCalledWith({
      audience: 'all',
      title: 'Hello',
      body: 'Body',
      channels: ['in_app'],
      initiatedBy: mockUser.userId,
    });
  });
});

describe('GET /api/v1/notifications/broadcast/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockUser as AuthenticatedRequest['user'];
        next();
      }
    );
    requirePermissionMock.mockImplementation((_perm, _req, _res, next) => next());
  });

  it('returns the audience count', async () => {
    mockedPreview.mockResolvedValue(42);
    const res = await request(buildApp())
      .get('/api/v1/notifications/broadcast/preview')
      .query({ audience: 'all' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ audience: 'all', count: 42 });
  });

  it('rejects an invalid audience query', async () => {
    const res = await request(buildApp())
      .get('/api/v1/notifications/broadcast/preview')
      .query({ audience: 'nonsense' });
    expect(res.status).toBe(400);
  });
});
