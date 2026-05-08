import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Force in-memory store path; getRedis() returning null is the default
// uninitialised state, which is what we want for these tests.
vi.mock('../../lib/redis', () => ({
  getRedis: () => null,
}));

const buildApp = (limiter: express.RequestHandler, path = '/r') => {
  const app = express();
  app.use(express.json());
  app.post(path, limiter, (_req, res) => res.json({ ok: true }));
  return app;
};

describe('auth-rate-limit (ADS-436, ADS-439)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('registration IP limiter blocks after 20 hits in production', async () => {
    process.env.NODE_ENV = 'production';
    const { registrationIpLimiter } = await import('../../middleware/auth-rate-limit');
    const app = buildApp(registrationIpLimiter);

    let last = 200;
    for (let i = 0; i < 22; i++) {
      const res = await request(app)
        .post('/r')
        .send({ email: `u${i}@ex.test` });
      last = res.status;
    }
    expect(last).toBe(429);
  }, 10000);

  it('registration email limiter blocks the same email after 5 hits regardless of IP', async () => {
    process.env.NODE_ENV = 'production';
    const { registrationEmailLimiter } = await import('../../middleware/auth-rate-limit');
    const app = buildApp(registrationEmailLimiter);

    let last = 200;
    for (let i = 0; i < 7; i++) {
      const res = await request(app)
        .post('/r')
        .set('x-forwarded-for', `9.9.9.${i}`) // different IPs
        .send({ email: 'spam@ex.test' });
      last = res.status;
    }
    expect(last).toBe(429);
  }, 10000);

  it('registration email limiter does NOT block other emails', async () => {
    process.env.NODE_ENV = 'production';
    const { registrationEmailLimiter } = await import('../../middleware/auth-rate-limit');
    const app = buildApp(registrationEmailLimiter);

    // Burn the budget for one email
    for (let i = 0; i < 6; i++) {
      await request(app).post('/r').send({ email: 'spam@ex.test' });
    }

    // A different email should still pass
    const res = await request(app).post('/r').send({ email: 'fresh@ex.test' });
    expect(res.status).toBe(200);
  }, 10000);

  it('blocks in development by default (ADS-439 — no more silent dev pass-through)', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.RATE_LIMIT_DEV_BYPASS;
    const { registrationEmailLimiter } = await import('../../middleware/auth-rate-limit');
    const app = buildApp(registrationEmailLimiter);

    let last = 200;
    for (let i = 0; i < 7; i++) {
      const res = await request(app).post('/r').send({ email: 'dev@ex.test' });
      last = res.status;
    }
    expect(last).toBe(429);
  }, 10000);

  it('honours RATE_LIMIT_DEV_BYPASS=true in development', async () => {
    process.env.NODE_ENV = 'development';
    process.env.RATE_LIMIT_DEV_BYPASS = 'true';
    const { registrationEmailLimiter } = await import('../../middleware/auth-rate-limit');
    const app = buildApp(registrationEmailLimiter);

    let last = 200;
    for (let i = 0; i < 8; i++) {
      const res = await request(app).post('/r').send({ email: 'devbypass@ex.test' });
      last = res.status;
    }
    expect(last).toBe(200);
  }, 10000);

  it('production NEVER allows bypass — RATE_LIMIT_DEV_BYPASS is ignored', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RATE_LIMIT_DEV_BYPASS = 'true';
    const { registrationEmailLimiter } = await import('../../middleware/auth-rate-limit');
    const app = buildApp(registrationEmailLimiter);

    let last = 200;
    for (let i = 0; i < 7; i++) {
      const res = await request(app).post('/r').send({ email: 'noprod@ex.test' });
      last = res.status;
    }
    expect(last).toBe(429);
  }, 10000);
});
