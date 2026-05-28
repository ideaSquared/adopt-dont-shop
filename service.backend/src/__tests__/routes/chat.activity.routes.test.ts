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
    getChatActivityLog: vi.fn(),
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

const mockGetActivity = vi.mocked(ChatService.getChatActivityLog);

const sampleActivity = [
  {
    activityId: 1,
    activityType: 'chat' as const,
    action: 'CREATE',
    description: 'Created chat: Buddy',
    category: 'Chat',
    ipAddress: null,
    userAgent: null,
    createdAt: '2024-06-01T12:00:00.000Z',
  },
];

const adminUser = {
  userId: 'admin-1',
  email: 'admin@example.com',
  userType: 'super_admin',
  rescueId: null,
  Roles: [
    {
      Permissions: [{ permissionName: 'chats.moderate' }],
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

describe('GET /api/v1/chats/:chatId/activity', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActivity.mockResolvedValue(sampleActivity);
    app = buildApp();
  });

  it('returns the chat activity log to authorised moderators', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = adminUser as AuthenticatedRequest['user'];
        next();
      }
    );

    const res = await request(app).get('/api/v1/chats/chat-abc/activity');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: sampleActivity });
    expect(mockGetActivity).toHaveBeenCalledWith('chat-abc', {
      from: undefined,
      to: undefined,
      limit: undefined,
      offset: undefined,
    });
  });

  it('forwards from/to/limit/offset query parameters to the service', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = adminUser as AuthenticatedRequest['user'];
        next();
      }
    );

    await request(app).get('/api/v1/chats/chat-abc/activity').query({
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-02-01T00:00:00.000Z',
      limit: '10',
      offset: '20',
    });

    expect(mockGetActivity).toHaveBeenCalledWith('chat-abc', {
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-02-01T00:00:00.000Z',
      limit: 10,
      offset: 20,
    });
  });

  it('returns 401 when request is unauthenticated', async () => {
    authenticateTokenMock.mockImplementation(
      (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
        res.status(401).json({ error: 'Access token required' });
      }
    );

    const res = await request(app).get('/api/v1/chats/chat-abc/activity');

    expect(res.status).toBe(401);
    expect(mockGetActivity).not.toHaveBeenCalled();
  });

  it('returns 403 when caller lacks chats.moderate permission', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = unauthorisedUser as AuthenticatedRequest['user'];
        next();
      }
    );

    const res = await request(app).get('/api/v1/chats/chat-abc/activity');

    expect(res.status).toBe(403);
    expect(mockGetActivity).not.toHaveBeenCalled();
  });

  it('returns 404 when the service throws NotFoundError', async () => {
    authenticateTokenMock.mockImplementation(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = adminUser as AuthenticatedRequest['user'];
        next();
      }
    );
    const { NotFoundError } = await import('../../middleware/error-handler');
    mockGetActivity.mockRejectedValue(new NotFoundError('Chat not found'));

    const res = await request(app).get('/api/v1/chats/missing-chat/activity');

    expect(res.status).toBe(404);
  });
});
