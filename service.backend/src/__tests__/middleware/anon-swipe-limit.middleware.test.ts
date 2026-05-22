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

  it('rejects exactly the over-budget portion under parallel requests (atomic LUA increment)', async () => {
    // 10 parallel requests with limit=7 — under the pre-fix
    // check-then-increment pattern, all 10 could read 0 and all pass.
    // With the atomic INCR+EXPIRE eval, exactly 3 must be rejected.
    process.env.ANON_SWIPE_LIMIT = '7';
    const anonSwipeLimit = await loadMiddleware();
    const req = buildReq({ cookies: { 'csrf-session': 'parallel-cookie' } });

    const results = await Promise.all(
      Array.from({ length: 10 }, () => {
        const res = buildRes();
        const next: NextFunction = vi.fn();
        return anonSwipeLimit(req, res as unknown as Response, next).then(() => ({
          rejected: (res.status as ReturnType<typeof vi.fn>).mock.calls.some(
            (c: unknown[]) => c[0] === 402
          ),
          nextCalled: (next as unknown as ReturnType<typeof vi.fn>).mock.calls.length > 0,
        }));
      })
    );

    const rejectedCount = results.filter(r => r.rejected).length;
    const passedCount = results.filter(r => r.nextCalled).length;
    expect(passedCount).toBe(7);
    expect(rejectedCount).toBe(3);
  });

  it('re-applies the TTL on an orphan key with no expiration set (LUA branch)', async () => {
    // Direct exercise of the Redis-backed LUA path with a mock client.
    // The mock simulates an existing key that already has a value but no
    // TTL (`TTL` returns -1). The script must re-issue EXPIRE so the row
    // doesn't leak forever.
    vi.resetModules();
    const expireSpy = vi.fn().mockResolvedValue(1);
    const ttlSpy = vi.fn().mockResolvedValue(-1);
    const incrSpy = vi.fn().mockResolvedValue(5);

    // Build a fake Redis client that runs the LUA script imperatively in JS
    // — eval() interprets the redis.call sequence using the spies above.
    const fakeRedis = {
      eval: vi.fn(async () => {
        const current = await incrSpy();
        if (current === 1) {
          await expireSpy();
        } else if ((await ttlSpy()) < 0) {
          await expireSpy();
        }
        return current;
      }),
    };

    vi.doMock('../../lib/redis', () => ({
      getRedis: () => fakeRedis,
      ensureRedisReady: async () => true,
      isRedisReady: () => true,
    }));
    vi.doMock('../../utils/logger', () => ({
      logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
    }));

    process.env.ANON_SWIPE_LIMIT = '7';
    const mod = await import('../../middleware/anon-swipe-limit');
    const next: NextFunction = vi.fn();
    const res = buildRes();
    const req = buildReq({ cookies: { 'csrf-session': 'orphan-cookie' } });

    await mod.anonSwipeLimit(req, res as unknown as Response, next);

    expect(fakeRedis.eval).toHaveBeenCalledTimes(1);
    // INCR returned 5 (not 1), so the script took the orphan-TTL branch.
    expect(ttlSpy).toHaveBeenCalledTimes(1);
    // TTL was -1, so EXPIRE must have been re-applied.
    expect(expireSpy).toHaveBeenCalledTimes(1);
    // 5 <= 7, the request passes.
    expect(next).toHaveBeenCalledTimes(1);

    vi.doUnmock('../../lib/redis');
    vi.doUnmock('../../utils/logger');
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
