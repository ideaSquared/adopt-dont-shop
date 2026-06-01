import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserType } from '../../models/User';
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
  getUserSwipeStatsMock,
  authenticateTokenMock,
  optionalAuthMock,
} = vi.hoisted(() => ({
  getDiscoveryQueueMock: vi.fn(),
  recordSwipeActionMock: vi.fn(),
  getSessionStatsMock: vi.fn(),
  getUserSwipeStatsMock: vi.fn(),
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
    getUserSwipeStats = getUserSwipeStatsMock;
    getSessionStats = getSessionStatsMock;
  }
  return { SwipeService };
});

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

    it('rejects a limit above the cap with 400 and never reaches the service', async () => {
      optionalAuthMock.mockImplementation(passAuth);

      const res = await request(app)
        .post('/api/v1/discovery/queue')
        .send({ filters: {}, limit: 100000 });

      expect(res.status).toBe(400);
      expect(getDiscoveryQueueMock).not.toHaveBeenCalled();
    });

    it('rejects a non-integer limit with 400', async () => {
      optionalAuthMock.mockImplementation(passAuth);

      const res = await request(app)
        .post('/api/v1/discovery/queue')
        .send({ filters: {}, limit: 'lots' });

      expect(res.status).toBe(400);
      expect(getDiscoveryQueueMock).not.toHaveBeenCalled();
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

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '33333333-3333-4333-8333-333333333333';

const setAuthedUser = (user: { userId: string; userType?: UserType } | null) => {
  authenticateTokenMock.mockImplementation(
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      req.user = user as AuthenticatedRequest['user'];
      next();
    }
  );
};

describe('GET /api/v1/discovery/swipe/stats/:userId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    optionalAuthMock.mockImplementation(
      (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next()
    );
    getUserSwipeStatsMock.mockResolvedValue({
      totalSwipes: 10,
      likes: 4,
      passes: 5,
      superLikes: 1,
      topBreeds: ['Labrador'],
      topPetTypes: ['dog'],
      averageSessionLength: 120,
    });
  });

  it('returns the caller their own stats with 200', async () => {
    setAuthedUser({ userId: OWNER_ID, userType: UserType.ADOPTER });

    const res = await request(buildApp()).get(`/api/v1/discovery/swipe/stats/${OWNER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalSwipes).toBe(10);
    expect(getUserSwipeStatsMock).toHaveBeenCalledWith(OWNER_ID);
  });

  it("rejects with 403 when reading another user's stats and does not leak data", async () => {
    setAuthedUser({ userId: OWNER_ID, userType: UserType.ADOPTER });

    const res = await request(buildApp()).get(`/api/v1/discovery/swipe/stats/${OTHER_ID}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body).not.toHaveProperty('data');
    expect(getUserSwipeStatsMock).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    setAuthedUser(null);

    const res = await request(buildApp()).get(`/api/v1/discovery/swipe/stats/${OTHER_ID}`);

    expect(res.status).toBe(401);
    expect(getUserSwipeStatsMock).not.toHaveBeenCalled();
  });

  it("allows an admin to read another user's stats", async () => {
    setAuthedUser({ userId: ADMIN_ID, userType: UserType.ADMIN });

    const res = await request(buildApp()).get(`/api/v1/discovery/swipe/stats/${OWNER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(getUserSwipeStatsMock).toHaveBeenCalledWith(OWNER_ID);
  });
});

describe('Discovery debug endpoints removed (security)', () => {
  it('GET /api/v1/discovery/db-test returns 404 — route no longer exists', async () => {
    const res = await request(buildApp()).get('/api/v1/discovery/db-test');
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/discovery/test returns 404 — route no longer exists', async () => {
    const res = await request(buildApp()).get('/api/v1/discovery/test');
    expect(res.status).toBe(404);
  });
});
