import { describe, expect, it } from 'vitest';

import {
  createEmailRateLimiter,
  MEMORY_LIMITER_MAX_BUCKETS,
  normalizeEmail,
} from './email-rate-limiter.js';

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

  it('evicts expired buckets so resident size does not grow with unique emails', async () => {
    let now = 1_000_000;
    const limiter = createEmailRateLimiter({ max: 5, windowMs: 1_000, now: () => now });

    // First window: seed a batch of one-shot emails.
    for (let i = 0; i < 100; i += 1) {
      await limiter.consume(`first-${i}@example.com`);
    }

    now += 1_001; // every first-window bucket is now expired

    // Second window: a fresh batch. The expired buckets must be reclaimed,
    // not accumulated on top of the new ones.
    for (let i = 0; i < 100; i += 1) {
      await limiter.consume(`second-${i}@example.com`);
    }

    expect(limiter.size?.()).toBeLessThanOrEqual(101);
  });

  it('stays bounded under a flood of unique emails within a single window', async () => {
    const limiter = createEmailRateLimiter({ max: 5, windowMs: 60_000 });

    for (let i = 0; i < MEMORY_LIMITER_MAX_BUCKETS * 3; i += 1) {
      await limiter.consume(`flood-${i}@example.com`);
    }

    expect(limiter.size?.()).toBeLessThanOrEqual(MEMORY_LIMITER_MAX_BUCKETS);
  });

  it('keeps throttling a repeatedly-hit email while other live emails churn below the cap', async () => {
    const limiter = createEmailRateLimiter({ max: 3, windowMs: 60_000 });

    expect(await limiter.consume('victim@example.com')).toBe(true);
    expect(await limiter.consume('victim@example.com')).toBe(true);
    expect(await limiter.consume('victim@example.com')).toBe(true);

    // Interleave other live emails, staying well under the cap.
    for (let i = 0; i < 50; i += 1) {
      await limiter.consume(`noise-${i}@example.com`);
    }

    // The victim's 4th attempt is still throttled — its bucket survived.
    expect(await limiter.consume('victim@example.com')).toBe(false);
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
