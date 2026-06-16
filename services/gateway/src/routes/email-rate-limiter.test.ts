import { describe, expect, it } from 'vitest';

import { createEmailRateLimiter, normalizeEmail } from './email-rate-limiter.js';

describe('normalizeEmail', () => {
  it('lower-cases and trims so casing / whitespace cannot dodge the cap', () => {
    expect(normalizeEmail('  Alex@Example.COM ')).toBe('alex@example.com');
  });

  it('returns undefined for a non-string / blank value', () => {
    expect(normalizeEmail(undefined)).toBeUndefined();
    expect(normalizeEmail(123)).toBeUndefined();
    expect(normalizeEmail('   ')).toBeUndefined();
  });
});

describe('createEmailRateLimiter (in-memory)', () => {
  it('allows up to `max` attempts for an email then throttles', async () => {
    const limiter = createEmailRateLimiter({ max: 3, windowMs: 60_000 });

    expect(await limiter.consume('a@example.com')).toBe(true);
    expect(await limiter.consume('a@example.com')).toBe(true);
    expect(await limiter.consume('a@example.com')).toBe(true);
    // 4th attempt within the window is over the cap.
    expect(await limiter.consume('a@example.com')).toBe(false);
  });

  it('tracks each email independently', async () => {
    const limiter = createEmailRateLimiter({ max: 1, windowMs: 60_000 });

    expect(await limiter.consume('a@example.com')).toBe(true);
    expect(await limiter.consume('a@example.com')).toBe(false);
    // A different email still has its full budget.
    expect(await limiter.consume('b@example.com')).toBe(true);
  });

  it('resets the counter once the window elapses', async () => {
    let now = 1_000_000;
    const limiter = createEmailRateLimiter({ max: 1, windowMs: 1_000, now: () => now });

    expect(await limiter.consume('a@example.com')).toBe(true);
    expect(await limiter.consume('a@example.com')).toBe(false);

    now += 1_001; // window elapsed
    expect(await limiter.consume('a@example.com')).toBe(true);
  });
});

describe('createEmailRateLimiter (redis-backed)', () => {
  it('uses INCR + EXPIRE and throttles once the count exceeds max', async () => {
    const counts = new Map<string, number>();
    const redis = {
      incr: (key: string): Promise<number> => {
        const next = (counts.get(key) ?? 0) + 1;
        counts.set(key, next);
        return Promise.resolve(next);
      },
      expire: (): Promise<number> => Promise.resolve(1),
    };
    const limiter = createEmailRateLimiter({ max: 2, windowMs: 60_000, redis });

    expect(await limiter.consume('a@example.com')).toBe(true);
    expect(await limiter.consume('a@example.com')).toBe(true);
    expect(await limiter.consume('a@example.com')).toBe(false);
  });

  it('falls back to allowing the request when Redis errors (fail open, like the IP limiter)', async () => {
    const redis = {
      incr: (): Promise<number> => Promise.reject(new Error('redis down')),
      expire: (): Promise<number> => Promise.resolve(1),
    };
    const limiter = createEmailRateLimiter({ max: 1, windowMs: 60_000, redis });

    expect(await limiter.consume('a@example.com')).toBe(true);
    expect(await limiter.consume('a@example.com')).toBe(true);
  });
});
