/**
 * Behaviour tests for the per-socket inbound rate limiter (ADS-709).
 *
 * The limiter exists to protect the DB from event-spam DOS now that
 * the chat socket revokes its 30s revocation cache and reads
 * RevokedToken on every inbound event.
 *
 * We assert through the public helpers `checkRateLimit` and
 * `releaseSocket` — the bucket map itself is implementation detail
 * and the only internal-touching assertion is via `__test.size()`,
 * which is a small testing seam exported on purpose.
 *
 * Redis is not available in the test environment, so these tests
 * exercise the in-memory fallback path. The Redis path uses the same
 * INCR-based counting semantics, just backed by a Lua script.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/redis', () => ({
  getRedis: () => null,
  isRedisReady: () => false,
}));

import {
  __test,
  checkRateLimit,
  getBudget,
  releaseSocket,
} from '../../middleware/socket-rate-limit';

type Captured = { event: string; payload: unknown };

const makeSocket = (id: string, userId?: string) => {
  const emitted: Captured[] = [];
  return {
    id,
    userId,
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
    emitted,
  };
};

describe('socket inbound rate limit (ADS-709)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __test.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    __test.reset();
  });

  it('allows the configured chat-send budget and drops the overflow', async () => {
    const socket = makeSocket('sock-1', 'user-1');
    const { limit } = getBudget('send_message');

    const blockedFlags: boolean[] = [];
    for (let i = 0; i < 50; i++) {
      blockedFlags.push(await checkRateLimit(socket, 'send_message'));
    }

    // First `limit` calls pass; the rest are dropped.
    const allowed = blockedFlags.filter(b => !b).length;
    const dropped = blockedFlags.filter(b => b).length;
    expect(allowed).toBe(limit);
    expect(dropped).toBe(50 - limit);

    // Every dropped event emits a `rate_limit` notice.
    const rateLimitEmits = socket.emitted.filter(e => e.event === 'rate_limit');
    expect(rateLimitEmits.length).toBe(dropped);
  });

  it('refills the budget after the window elapses', async () => {
    const socket = makeSocket('sock-1', 'user-1');
    const { limit, windowMs } = getBudget('send_message');

    for (let i = 0; i < limit; i++) {
      expect(await checkRateLimit(socket, 'send_message')).toBe(false);
    }
    expect(await checkRateLimit(socket, 'send_message')).toBe(true);

    vi.advanceTimersByTime(windowMs + 1);

    expect(await checkRateLimit(socket, 'send_message')).toBe(false);
  });

  it('keeps the chat-send and typing buckets independent', async () => {
    const socket = makeSocket('sock-1', 'user-1');
    const sendLimit = getBudget('send_message').limit;

    // Drain chat-send fully.
    for (let i = 0; i < sendLimit; i++) {
      await checkRateLimit(socket, 'send_message');
    }
    expect(await checkRateLimit(socket, 'send_message')).toBe(true);

    // typing_start has its own bucket and is still wide open.
    expect(await checkRateLimit(socket, 'typing_start')).toBe(false);
  });

  it('uses independent buckets for different sockets / users', async () => {
    const a = makeSocket('sock-a', 'user-a');
    const b = makeSocket('sock-b', 'user-b');
    const limit = getBudget('send_message').limit;

    for (let i = 0; i < limit; i++) {
      await checkRateLimit(a, 'send_message');
    }
    expect(await checkRateLimit(a, 'send_message')).toBe(true);
    // Different user — fresh bucket.
    expect(await checkRateLimit(b, 'send_message')).toBe(false);
  });

  it('frees the bucket on disconnect for anonymous sockets', async () => {
    const socket = makeSocket('anon-1');
    await checkRateLimit(socket, 'send_message');
    expect(__test.has('anon-1')).toBe(true);

    await releaseSocket(socket);
    expect(__test.has('anon-1')).toBe(false);
  });

  it('does not leak memory across many reconnects of the same user', async () => {
    // 100 reconnect cycles for the same authenticated user must not
    // grow the bucket count: the user keeps ONE bucket entry.
    for (let i = 0; i < 100; i++) {
      const socket = makeSocket(`sock-${i}`, 'user-stable');
      await checkRateLimit(socket, 'send_message');
      await releaseSocket(socket);
    }
    expect(__test.size()).toBe(1);
    expect(__test.has('user-stable')).toBe(true);
  });

  it('GC drops user buckets idle longer than the idle window', async () => {
    const socket = makeSocket('sock-x', 'user-x');
    await checkRateLimit(socket, 'send_message');
    expect(__test.has('user-x')).toBe(true);

    // Run past the 5-minute idle threshold; the 1-minute GC sweep
    // then drops the entry.
    vi.advanceTimersByTime(6 * 60_000);
    expect(__test.has('user-x')).toBe(false);
  });

  it('applies the generic 60/min budget to unlisted events', async () => {
    const socket = makeSocket('sock-1', 'user-1');

    // Generic budget is 60/min — fire 65 unlisted events.
    const blocked: boolean[] = [];
    for (let i = 0; i < 65; i++) {
      blocked.push(await checkRateLimit(socket, 'some_unlisted_event'));
    }
    expect(blocked.filter(b => !b).length).toBe(60);
    expect(blocked.filter(b => b).length).toBe(5);
  });
});
