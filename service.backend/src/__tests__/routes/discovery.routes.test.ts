import { vi } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types';

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

const { getDiscoveryQueueMock } = vi.hoisted(() => ({
  getDiscoveryQueueMock: vi.fn(),
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
    recordSwipeAction = vi.fn();
    getUserSwipeStats = vi.fn();
    getSessionStats = vi.fn();
  }
  return { SwipeService };
});

vi.mock('../../sequelize', () => ({
  default: { query: vi.fn() },
}));

const optionalAuthMock = vi.fn();
vi.mock('../../middleware/auth', () => ({
  authenticateToken: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
  optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    optionalAuthMock(req, res, next),
}));

vi.mock('../../middleware/idempotency', () => ({
  idempotency: (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next(),
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

describe('Discovery routes - user id binding (security)', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    getDiscoveryQueueMock.mockResolvedValue({
      pets: [],
      sessionId: 'session-1',
      hasMore: false,
    });
    app = buildApp();
  });

  describe('GET /api/v1/discovery/pets', () => {
    it('uses authenticated user id and ignores ?userId override', async () => {
      optionalAuthMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = mockAuthedUser as AuthenticatedRequest['user'];
          next();
        }
      );

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
      optionalAuthMock.mockImplementation(
        (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
          req.user = mockAuthedUser as AuthenticatedRequest['user'];
          next();
        }
      );

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
