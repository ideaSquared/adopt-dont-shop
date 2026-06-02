import { vi } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types';
import { NotFoundError } from '../../middleware/error-handler';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logSecurity: vi.fn() },
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
    markAllNotificationsAsRead: vi.fn(),
    markAsRead: vi.fn(),
  },
}));

// ADS-741: simulate sensitiveWriteLimiter so the route-level rate-limit
// can be asserted. The limiter mock counts hits and returns 429 after a
// fixed threshold, matching the production express-rate-limit shape.
const RATE_LIMIT_MAX = 3;
let rateLimitHits = 0;
const resetRateLimit = () => {
  rateLimitHits = 0;
};
vi.mock('../../middleware/rate-limiter', () => ({
  broadcastLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  sensitiveWriteLimiter: (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    rateLimitHits += 1;
    if (rateLimitHits > RATE_LIMIT_MAX) {
      return res.status(429).json({ error: 'rate_limited' });
    }
    next();
  },
}));

vi.mock('../../middleware/idempotency', () => ({
  idempotency: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../services/rich-text-processing.service', () => ({
  RichTextProcessingService: { sanitize: vi.fn(content => content) },
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

import { NotificationService } from '../../services/notification.service';
import notificationRouter from '../../routes/notification.routes';

const mockGetUserNotifications = vi.mocked(NotificationService.getUserNotifications);
const mockGetUnreadCount = vi.mocked(NotificationService.getUnreadCount);
const mockGetPreferences = vi.mocked(NotificationService.getNotificationPreferences);
const mockMarkAsRead = vi.mocked(NotificationService.markAsRead);

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/notifications', notificationRouter);
  return app;
};

const mockUser = {
  userId: 'user-1',
  email: 'user@example.com',
};

describe('Notification routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = mockUser as AuthenticatedRequest['user'];
        next();
      }
    );
    requirePermissionMock.mockImplementation((_perm, _req, _res, next) => next());
  });

  describe('GET /api/v1/notifications', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req, res: Response) => {
        res.status(401).json({ error: 'unauth' });
      });
      const res = await request(buildApp()).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('returns notifications with pagination', async () => {
      mockGetUserNotifications.mockResolvedValue({
        notifications: [{ notificationId: 'n1' }],
        pagination: { page: 1, limit: 20, total: 1 },
      });
      const res = await request(buildApp()).get('/api/v1/notifications');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });

    it('rejects an invalid status query value with 400', async () => {
      const res = await request(buildApp())
        .get('/api/v1/notifications')
        .query({ status: 'pending' });
      expect(res.status).toBe(422);
      expect(mockGetUserNotifications).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/notifications/unread/count', () => {
    it('returns the count', async () => {
      mockGetUnreadCount.mockResolvedValue({ count: 7 });
      const res = await request(buildApp()).get('/api/v1/notifications/unread/count');
      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(7);
      expect(mockGetUnreadCount).toHaveBeenCalledWith(mockUser.userId);
    });

    it('returns 500 when the service fails', async () => {
      mockGetUnreadCount.mockRejectedValue(new Error('redis down'));
      const res = await request(buildApp()).get('/api/v1/notifications/unread/count');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/v1/notifications/preferences', () => {
    it('returns the user preferences', async () => {
      mockGetPreferences.mockResolvedValue({ email: true, push: false });
      const res = await request(buildApp()).get('/api/v1/notifications/preferences');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ email: true, push: false });
    });

    it('returns 404 when the user record cannot be found', async () => {
      mockGetPreferences.mockRejectedValue(new NotFoundError('User not found'));
      const res = await request(buildApp()).get('/api/v1/notifications/preferences');
      expect(res.status).toBe(404);
    });
  });

  // ADS-741: mark-as-read must reject non-UUID notification IDs at the
  // route layer (before any DB lookup) and must be rate-limited so the
  // UUID space can't be brute-forced via timing/response differences.
  describe('PATCH /api/v1/notifications/:notificationId/read', () => {
    const validId = '11111111-2222-4333-8444-555555555555';

    it('rejects a non-UUID notificationId with 400 and never reaches the service', async () => {
      mockMarkAsRead.mockResolvedValue(undefined);
      const res = await request(buildApp()).patch('/api/v1/notifications/not-a-uuid/read');
      expect(res.status).toBe(422);
      expect(mockMarkAsRead).not.toHaveBeenCalled();
    });

    it('rejects an oddly-shaped string that looks like a legacy id', async () => {
      mockMarkAsRead.mockResolvedValue(undefined);
      const res = await request(buildApp()).patch('/api/v1/notifications/abc_123/read');
      expect(res.status).toBe(422);
      expect(mockMarkAsRead).not.toHaveBeenCalled();
    });

    it('marks a valid UUID as read', async () => {
      mockMarkAsRead.mockResolvedValue(undefined);
      const res = await request(buildApp()).patch(`/api/v1/notifications/${validId}/read`);
      expect(res.status).toBe(200);
      expect(mockMarkAsRead).toHaveBeenCalledWith(validId, mockUser.userId);
    });

    it('rate-limits repeated hits with random UUIDs (429 after the window cap)', async () => {
      mockMarkAsRead.mockResolvedValue(undefined);
      const app = buildApp();
      const randomUuid = () =>
        '00000000-0000-4000-8000-' +
        Math.floor(Math.random() * 1e12)
          .toString(16)
          .padStart(12, '0');

      // First RATE_LIMIT_MAX (=3) hits pass.
      for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
        const r = await request(app).patch(`/api/v1/notifications/${randomUuid()}/read`);
        expect(r.status).toBe(200);
      }

      // The next hit must be rejected by the limiter, BEFORE the service
      // is invoked, even with a valid UUID.
      const blocked = await request(app).patch(`/api/v1/notifications/${randomUuid()}/read`);
      expect(blocked.status).toBe(429);
    });
  });
});
