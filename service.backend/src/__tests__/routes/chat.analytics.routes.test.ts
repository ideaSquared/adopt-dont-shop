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

vi.mock('../../services/chat.service', () => ({
  ChatService: {
    getChatAnalytics: vi.fn(),
    getChatById: vi.fn(),
  },
}));

vi.mock('../../services/file-upload.service', () => ({
  chatAttachmentUpload: {
    single: () => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  },
}));

vi.mock('../../middleware/upload-mime-guard', () => ({
  enforceUploadMime: () => (_req: AuthenticatedRequest, _res: Response, next: NextFunction) =>
    next(),
}));

vi.mock('../../middleware/rate-limiter', () => ({
  generalLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  authLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  uploadLimiter: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/idempotency', () => ({
  idempotency: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

const authenticateTokenMock = vi.fn();

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

import { ChatService } from '../../services/chat.service';
import chatRouter from '../../routes/chat.routes';

const mockGetAnalytics = vi.mocked(ChatService.getChatAnalytics);

const mockAnalytics = {
  totalChats: 1250,
  totalMessages: 15680,
  activeChats: 342,
  averageMessagesPerChat: 12.5,
  messageGrowthRate: 0.15,
  userEngagement: 0.78,
};

const adminUser = {
  userId: 'admin-1',
  email: 'admin@example.com',
  userType: 'super_admin',
  rescueId: null,
  Roles: [
    {
      Permissions: [{ permissionName: 'chat.analytics.read' }],
    },
  ],
};

const rescueUser = {
  userId: 'rescue-1',
  email: 'staff@example.com',
  userType: 'rescue_staff',
  rescueId: 'rescue-uuid',
  Roles: [
    {
      Permissions: [{ permissionName: 'chat.analytics.read' }],
    },
  ],
};

const unauthorisedUser = {
  userId: 'user-1',
  email: 'user@example.com',
  userType: 'adopter',
  rescueId: null,
  Roles: [
    {
      Permissions: [{ permissionName: 'pet.read' }],
    },
  ],
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/chats', chatRouter);
  app.use(errorHandler);
  return app;
};

describe('GET /api/v1/chats/analytics', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnalytics.mockResolvedValue(mockAnalytics);
    app = buildApp();
  });

  it('routes /analytics to analytics handler, not /:chatId param handler (ADS regression — would 500 with invalid uuid)', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = adminUser as AuthenticatedRequest['user'];
        next();
      }
    );

    const res = await request(app).get('/api/v1/chats/analytics');

    expect(res.status).toBe(200);
    expect(mockGetAnalytics).toHaveBeenCalled();
    expect(res.body).toMatchObject({
      success: true,
      data: expect.objectContaining({ totalChats: 1250 }),
    });
  });

  it('returns analytics across all rescues for admin users', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = adminUser as AuthenticatedRequest['user'];
        next();
      }
    );

    await request(app).get('/api/v1/chats/analytics');

    expect(mockGetAnalytics).toHaveBeenCalledWith(undefined, undefined);
  });

  it('scopes analytics to the staff member rescue for non-admin users', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = rescueUser as AuthenticatedRequest['user'];
        next();
      }
    );

    await request(app).get('/api/v1/chats/analytics');

    expect(mockGetAnalytics).toHaveBeenCalledWith(undefined, 'rescue-uuid');
  });

  it('passes parsed date range to service when startDate and endDate are provided', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = adminUser as AuthenticatedRequest['user'];
        next();
      }
    );

    const res = await request(app)
      .get('/api/v1/chats/analytics')
      .query({ startDate: '2024-01-01', endDate: '2024-12-31' });

    expect(res.status).toBe(200);
    expect(mockGetAnalytics).toHaveBeenCalledWith(
      { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
      undefined
    );
  });

  it('returns 401 when request is unauthenticated', async () => {
    authenticateTokenMock.mockImplementation(
      (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
        res.status(401).json({ error: 'Access token required' });
      }
    );

    const res = await request(app).get('/api/v1/chats/analytics');

    expect(res.status).toBe(401);
    expect(mockGetAnalytics).not.toHaveBeenCalled();
  });

  it('returns 403 when caller lacks chat.analytics.read permission', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = unauthorisedUser as AuthenticatedRequest['user'];
        next();
      }
    );

    const res = await request(app).get('/api/v1/chats/analytics');

    expect(res.status).toBe(403);
    expect(mockGetAnalytics).not.toHaveBeenCalled();
  });

  it('returns 500 when service throws', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = adminUser as AuthenticatedRequest['user'];
        next();
      }
    );
    mockGetAnalytics.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/v1/chats/analytics');

    expect(res.status).toBe(500);
  });
});
