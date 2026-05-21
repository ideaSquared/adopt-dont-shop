import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const {
  getDiscoveryQueueMock,
  recordSwipeActionMock,
  getSessionStatsMock,
  authenticateTokenMock,
  optionalAuthMock,
} = vi.hoisted(() => ({
  getDiscoveryQueueMock: vi.fn(),
  recordSwipeActionMock: vi.fn(),
  getSessionStatsMock: vi.fn(),
  authenticateTokenMock: vi.fn(),
  optionalAuthMock: vi.fn(),
}));

vi.mock('../../services/discovery.service', () => {
  class DiscoveryService {
    getDiscoveryQueue = getDiscoveryQueueMock;
    loadMorePets = vi.fn();
  }
  return { DiscoveryService };
});

vi.mock('../../services/swipe.service', () => {
  class SwipeService {
    recordSwipeAction = recordSwipeActionMock;
    getUserSwipeStats = vi.fn();
    getSessionStats = getSessionStatsMock;
  }
  return { SwipeService };
});

vi.mock('../../sequelize', () => ({
  default: { query: vi.fn() },
}));

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
  optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    optionalAuthMock(req, res, next),
}));

vi.mock('../../middleware/idempotency', () => ({
  idempotency: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../middleware/anon-swipe-limit', () => ({
  anonSwipeLimit: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
}));

import discoveryRouter from '../../routes/discovery.routes';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/discovery', discoveryRouter);
  return app;
};

const AUTH_USER_ID = 'a1111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = 'b2222222-2222-4222-8222-222222222222';

const mockAuthedUser = {
  userId: AUTH_USER_ID,
  email: 'user@example.com',
  userType: 'adopter',
};

const passAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  req.user = mockAuthedUser as AuthenticatedRequest['user'];
  next();
};

describe('Discovery routes - user id binding (security)', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    getDiscoveryQueueMock.mockResolvedValue({
      pets: [],
      sessionId: 'session-1',
      hasMore: false,
    });
    authenticateTokenMock.mockImplementation(passAuth);
    app = buildApp();
  });

  describe('GET /api/v1/discovery/pets', () => {
    it('uses authenticated user id and ignores ?userId override', async () => {
      optionalAuthMock.mockImplementation(passAuth);

      const res = await request(app).get('/api/v1/discovery/pets').query({ userId: OTHER_USER_ID });

      expect(res.status).toBe(200);
      expect(getDiscoveryQueueMock).toHaveBeenCalledTimes(1);
      const [, , passedUserId] = getDiscoveryQueueMock.mock.calls[0];
      expect(passedUserId).toBe(AUTH_USER_ID);
      expect(passedUserId).not.toBe(OTHER_USER_ID);
    });

    it('passes undefined user id when caller is anonymous', async () => {
      optionalAuthMock.mockImplementation(
        (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
      );

      const res = await request(app).get('/api/v1/discovery/pets');

      expect(res.status).toBe(200);
      expect(getDiscoveryQueueMock).toHaveBeenCalledTimes(1);
      const [, , passedUserId] = getDiscoveryQueueMock.mock.calls[0];
      expect(passedUserId).toBeUndefined();
    });

    it('ignores ?userId even when caller is anonymous (no preference oracle)', async () => {
      optionalAuthMock.mockImplementation(
        (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
      );

      const res = await request(app).get('/api/v1/discovery/pets').query({ userId: OTHER_USER_ID });

      expect(res.status).toBe(200);
      const [, , passedUserId] = getDiscoveryQueueMock.mock.calls[0];
      expect(passedUserId).toBeUndefined();
    });
  });

  describe('POST /api/v1/discovery/queue', () => {
    it('uses authenticated user id and ignores body userId override', async () => {
      optionalAuthMock.mockImplementation(passAuth);

      const res = await request(app)
        .post('/api/v1/discovery/queue')
        .send({ userId: OTHER_USER_ID, filters: {}, limit: 5 });

      expect(res.status).toBe(200);
      expect(getDiscoveryQueueMock).toHaveBeenCalledTimes(1);
      const [, , passedUserId] = getDiscoveryQueueMock.mock.calls[0];
      expect(passedUserId).toBe(AUTH_USER_ID);
      expect(passedUserId).not.toBe(OTHER_USER_ID);
    });

    it('ignores body userId when caller is anonymous', async () => {
      optionalAuthMock.mockImplementation(
        (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
      );

      const res = await request(app)
        .post('/api/v1/discovery/queue')
        .send({ userId: OTHER_USER_ID, filters: {}, limit: 5 });

      expect(res.status).toBe(200);
      const [, , passedUserId] = getDiscoveryQueueMock.mock.calls[0];
      expect(passedUserId).toBeUndefined();
    });
  });
});

const validSwipeBody = {
  action: 'like' as const,
  petId: 'pet-123',
  sessionId: 'session-abc',
  timestamp: '2026-05-21T12:00:00.000Z',
};

describe('POST /api/v1/discovery/swipe/action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordSwipeActionMock.mockResolvedValue(undefined);
    optionalAuthMock.mockImplementation(
      (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
  });

  it('records anonymous swipes with userId=null and still returns 200', async () => {
    const res = await request(buildApp())
      .post('/api/v1/discovery/swipe/action')
      .send(validSwipeBody);

    expect(res.status).toBe(200);
    expect(recordSwipeActionMock).toHaveBeenCalledTimes(1);
    const persisted = recordSwipeActionMock.mock.calls[0][0];
    expect(persisted.userId).toBeNull();
    expect(persisted.petId).toBe(validSwipeBody.petId);
    expect(persisted.action).toBe(validSwipeBody.action);
  });

  it('persists the authenticated userId, ignoring any userId in the body (IDOR guard)', async () => {
    const authedUserId = 'auth-user-real-id';
    const victimUserId = 'victim-user-other-id';

    optionalAuthMock.mockImplementationOnce(
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.user = { userId: authedUserId } as AuthenticatedRequest['user'];
        next();
      }
    );

    const res = await request(buildApp())
      .post('/api/v1/discovery/swipe/action')
      .send({ ...validSwipeBody, userId: victimUserId });

    expect(res.status).toBe(200);
    expect(recordSwipeActionMock).toHaveBeenCalledTimes(1);
    const persisted = recordSwipeActionMock.mock.calls[0][0];
    expect(persisted.userId).toBe(authedUserId);
    expect(persisted.userId).not.toBe(victimUserId);
  });

  it('ignores body userId for anonymous callers (cannot forge userId without auth)', async () => {
    const forgedUserId = 'forged-victim-id';

    const res = await request(buildApp())
      .post('/api/v1/discovery/swipe/action')
      .send({ ...validSwipeBody, userId: forgedUserId });

    expect(res.status).toBe(200);
    expect(recordSwipeActionMock).toHaveBeenCalledTimes(1);
    const persisted = recordSwipeActionMock.mock.calls[0][0];
    expect(persisted.userId).toBeNull();
    expect(persisted.userId).not.toBe(forgedUserId);
  });
});

describe('Discovery routes — session stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateTokenMock.mockImplementation(passAuth);
    optionalAuthMock.mockImplementation(
      (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
  });

  describe('GET /api/v1/discovery/swipe/session/:sessionId', () => {
    it('returns 401 when unauthenticated', async () => {
      authenticateTokenMock.mockImplementation((_req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'unauthenticated' });
      });

      const res = await request(buildApp()).get(
        '/api/v1/discovery/swipe/session/session_abcdef1234567890abcdef1234567890'
      );

      expect(res.status).toBe(401);
      expect(getSessionStatsMock).not.toHaveBeenCalled();
    });

    it('returns 200 with session stats when authenticated', async () => {
      const stats = { sessionId: 'session_abc', totalSwipes: 3 };
      getSessionStatsMock.mockResolvedValue(stats);

      const res = await request(buildApp()).get(
        '/api/v1/discovery/swipe/session/session_abcdef1234567890abcdef1234567890'
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(stats);
      expect(getSessionStatsMock).toHaveBeenCalledWith('session_abcdef1234567890abcdef1234567890');
    });
  });
});
