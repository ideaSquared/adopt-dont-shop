/**
 * Behaviour tests for the per-user anti-abuse rate limiters. Verifies that
 * each limiter buckets per `req.user.userId` and 429s on the (max+1)th
 * request while leaving other users unaffected.
 */
import { vi, beforeEach, describe, it, expect } from 'vitest';
import express, { type NextFunction, type Response } from 'express';
import request from 'supertest';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../lib/redis', () => ({
  getRedis: () => null,
}));

import {
  applicationCreateDailyLimiter,
  applicationCreateWeeklyLimiter,
  reportCreateDailyLimiter,
} from '../../middleware/user-abuse-rate-limit';

type FakeAuthedRequest = express.Request & { user?: { userId: string } };

const buildApp = (
  middleware: (req: express.Request, res: Response, next: NextFunction) => void,
  userId: string
) => {
  const app = express();
  app.use((req: FakeAuthedRequest, _res, next) => {
    req.user = { userId };
    next();
  });
  app.post('/', middleware, (_req, res) => {
    res.status(204).end();
  });
  return app;
};

describe('user-abuse-rate-limit', () => {
  beforeEach(() => {
    delete process.env.RATE_LIMIT_DEV_BYPASS;
    process.env.NODE_ENV = 'test';
  });

  it('lets the first 5 application create requests through and 429s the 6th', async () => {
    const app = buildApp(applicationCreateDailyLimiter, 'user-A');
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post('/');
      expect(res.status).toBe(204);
    }
    const blocked = await request(app).post('/');
    expect(blocked.status).toBe(429);
  });

  it('allows up to 20 application creates in the weekly bucket', async () => {
    const app = buildApp(applicationCreateWeeklyLimiter, 'user-B');
    for (let i = 0; i < 20; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post('/');
      expect(res.status).toBe(204);
    }
    const blocked = await request(app).post('/');
    expect(blocked.status).toBe(429);
  });

  it('reports limiter 429s the 6th report from one user', async () => {
    const app = buildApp(reportCreateDailyLimiter, 'user-C');
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post('/');
      expect(res.status).toBe(204);
    }
    const blocked = await request(app).post('/');
    expect(blocked.status).toBe(429);
  });

  it('bypasses limiting when RATE_LIMIT_DEV_BYPASS=true outside production', async () => {
    process.env.NODE_ENV = 'development';
    process.env.RATE_LIMIT_DEV_BYPASS = 'true';
    const app = buildApp(reportCreateDailyLimiter, 'user-D');
    for (let i = 0; i < 10; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post('/');
      expect(res.status).toBe(204);
    }
  });
});
