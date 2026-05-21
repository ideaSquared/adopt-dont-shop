import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';

vi.mock('../../utils/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Force the in-process fallback path; getRedis() returning null disables
// the Redis store, exercising the same arithmetic against an in-memory
// Map. Behaviour from the caller's perspective is identical.
vi.mock('../../lib/redis', () => ({
  getRedis: () => null,
  ensureRedisReady: async () => false,
  isRedisReady: () => false,
}));

type MockRes = Partial<Response> & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  statusCode: number;
};

const buildReq = (overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest =>
  ({
    method: 'POST',
    path: '/swipe/action',
    ip: '203.0.113.5',
    cookies: {},
    headers: {},
    ...overrides,
  }) as unknown as AuthenticatedRequest;

const buildRes = (): MockRes => {
  const res: MockRes = {
    statusCode: 200,
    status: vi.fn().mockImplementation(function (this: MockRes, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn().mockReturnThis(),
  };
  return res;
};

const loadMiddleware = async () => {
  // Re-import in each test so the in-process counter map is fresh.
  vi.resetModules();
  const mod = await import('../../middleware/anon-swipe-limit');
  return mod.anonSwipeLimit;
};

describe('anon-swipe-limit middleware (ADS-625 server enforcement)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.ANON_SWIPE_LIMIT = '3';
  });

  it('passes authenticated requests through without counting', async () => {
    const anonSwipeLimit = await loadMiddleware();
    const next: NextFunction = vi.fn();
    const res = buildRes();
    const authedReq = buildReq({
      user: { userId: 'user-1' },
    } as Partial<AuthenticatedRequest>);

    // Many more than the limit — authenticated callers should never block.
    for (let i = 0; i < 10; i++) {
      await anonSwipeLimit(authedReq, res as unknown as Response, next);
    }

    expect(next).toHaveBeenCalledTimes(10);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('lets anonymous callers through while under the limit and increments per call', async () => {
    const anonSwipeLimit = await loadMiddleware();
    const next: NextFunction = vi.fn();
    const res = buildRes();
    const req = buildReq({ cookies: { 'csrf-session': 'anon-cookie-A' } });

    // Limit is 3 — calls 1, 2, 3 should pass; call 4 should block.
    await anonSwipeLimit(req, res as unknown as Response, next);
    await anonSwipeLimit(req, res as unknown as Response, next);
    await anonSwipeLimit(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(3);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks with 402 ANON_SWIPE_LIMIT_REACHED once the limit is reached', async () => {
    const anonSwipeLimit = await loadMiddleware();
    const next: NextFunction = vi.fn();
    const res = buildRes();
    const req = buildReq({ cookies: { 'csrf-session': 'anon-cookie-B' } });

    await anonSwipeLimit(req, res as unknown as Response, next);
    await anonSwipeLimit(req, res as unknown as Response, next);
    await anonSwipeLimit(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(3);

    await anonSwipeLimit(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(3);
    expect(res.status).toHaveBeenCalledWith(402);
    const body = res.json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body).toMatchObject({
      success: false,
      code: 'ANON_SWIPE_LIMIT_REACHED',
    });
    expect(typeof body.message).toBe('string');
    expect(typeof body.timestamp).toBe('string');
  });

  it('keeps blocking on subsequent attempts without incrementing further', async () => {
    const anonSwipeLimit = await loadMiddleware();
    const next: NextFunction = vi.fn();
    const res = buildRes();
    const req = buildReq({ cookies: { 'csrf-session': 'anon-cookie-C' } });

    // Burn through the budget.
    await anonSwipeLimit(req, res as unknown as Response, next);
    await anonSwipeLimit(req, res as unknown as Response, next);
    await anonSwipeLimit(req, res as unknown as Response, next);
    // Now blocked.
    await anonSwipeLimit(req, res as unknown as Response, next);
    await anonSwipeLimit(req, res as unknown as Response, next);
    await anonSwipeLimit(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(3);
    // Every blocked call still returns 402 — there is no escalation/leak.
    expect(res.status).toHaveBeenCalledWith(402);
  });

  it('keeps counters independent per CSRF session cookie', async () => {
    const anonSwipeLimit = await loadMiddleware();
    const next: NextFunction = vi.fn();
    const res = buildRes();

    const reqA = buildReq({ cookies: { 'csrf-session': 'cookie-alpha' } });
    const reqB = buildReq({ cookies: { 'csrf-session': 'cookie-beta' } });

    // Exhaust A's budget.
    await anonSwipeLimit(reqA, res as unknown as Response, next);
    await anonSwipeLimit(reqA, res as unknown as Response, next);
    await anonSwipeLimit(reqA, res as unknown as Response, next);
    await anonSwipeLimit(reqA, res as unknown as Response, next); // blocked
    expect(res.status).toHaveBeenCalledWith(402);

    // B starts fresh.
    const nextB: NextFunction = vi.fn();
    const resB = buildRes();
    await anonSwipeLimit(reqB, resB as unknown as Response, nextB);
    expect(nextB).toHaveBeenCalledTimes(1);
    expect(resB.status).not.toHaveBeenCalled();
  });

  it('falls back to req.ip when no CSRF session cookie is present and keeps counters independent', async () => {
    const anonSwipeLimit = await loadMiddleware();
    const res = buildRes();

    const reqIp1 = buildReq({ ip: '198.51.100.1', cookies: {} });
    const reqIp2 = buildReq({ ip: '198.51.100.2', cookies: {} });

    const next: NextFunction = vi.fn();
    await anonSwipeLimit(reqIp1, res as unknown as Response, next);
    await anonSwipeLimit(reqIp1, res as unknown as Response, next);
    await anonSwipeLimit(reqIp1, res as unknown as Response, next);
    await anonSwipeLimit(reqIp1, res as unknown as Response, next); // blocked at limit=3
    expect(res.status).toHaveBeenCalledWith(402);

    const next2: NextFunction = vi.fn();
    const res2 = buildRes();
    await anonSwipeLimit(reqIp2, res2 as unknown as Response, next2);
    expect(next2).toHaveBeenCalledTimes(1);
    expect(res2.status).not.toHaveBeenCalled();
  });
});
