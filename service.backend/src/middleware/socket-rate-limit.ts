/**
 * ADS-709: per-socket inbound rate limiting for Socket.IO.
 *
 * The chat-auth hardening (ADS-708, plan pass 2) removed the 30s
 * revocation cache, so every inbound event now performs a RevokedToken
 * point lookup on the DB. Without an inbound limiter a misbehaving or
 * hostile client could spam events and exhaust the DB connection pool.
 *
 * Strategy: fixed-window counters backed by Redis when available, with
 * an in-memory Map fallback for dev/test or when Redis is down.
 *  - Keyed by userId when the socket is authenticated, so reconnects
 *    don't reset the budget; falls back to socketId otherwise.
 *  - Per-event-type budgets: chat-send is tighter than typing or
 *    read-receipt indicators which are inherently chatty.
 *  - On overrun: emit `rate_limit` back to the client and drop the
 *    inbound event. We do NOT disconnect — a single spike from an
 *    otherwise-well-behaved client should not kill the session.
 *  - Cleanup: bucket released on socket disconnect; periodic GC drops
 *    user-keyed buckets idle for > IDLE_MS.
 *  - Redis: atomic INCR + EXPIRE via Lua script so multi-replica
 *    deployments share state. Falls back to in-memory seamlessly when
 *    Redis is unavailable.
 */
import { getRedis, isRedisReady } from '../lib/redis';
import { logger } from '../utils/logger';

type Bucket = {
  windowStart: number;
  count: number;
  lastSeen: number;
};

type EventBudget = {
  limit: number;
  windowMs: number;
};

const WINDOW_MS = 60_000;

// Event budgets. Numbers chosen to comfortably accommodate normal UX
// (a user typing a long message will easily fire 30+ typing events in
// a minute; read receipts fire on scroll). Chat-send is the
// write-heavy path and is tightest.
const BUDGETS: Record<string, EventBudget> = {
  send_message: { limit: 30, windowMs: WINDOW_MS },
  message_sent_notification: { limit: 30, windowMs: WINDOW_MS },
  mark_as_read: { limit: 120, windowMs: WINDOW_MS },
  typing_start: { limit: 60, windowMs: WINDOW_MS },
  typing_stop: { limit: 60, windowMs: WINDOW_MS },
  add_reaction: { limit: 30, windowMs: WINDOW_MS },
  remove_reaction: { limit: 30, windowMs: WINDOW_MS },
  join_chat: { limit: 20, windowMs: WINDOW_MS },
  leave_chat: { limit: 20, windowMs: WINDOW_MS },
};

const DEFAULT_BUDGET: EventBudget = { limit: 60, windowMs: WINDOW_MS };

const IDLE_MS = 5 * 60_000;
const GC_INTERVAL_MS = 60_000;

const REDIS_KEY_PREFIX = 'sock-rl:';

/**
 * Lua script for atomic increment + expire. Returns the current count
 * after incrementing. Sets EXPIRE on first increment and re-applies it
 * if the key somehow lost its TTL (same defensive pattern as
 * anon-swipe-limit.ts).
 */
const INCR_AND_EXPIRE_SCRIPT = `local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
elseif redis.call('TTL', KEYS[1]) < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current`;

// key -> event -> bucket
const buckets = new Map<string, Map<string, Bucket>>();

let gcTimer: NodeJS.Timeout | null = null;

const ensureGcTimer = (): void => {
  if (gcTimer) {
    return;
  }
  gcTimer = setInterval(() => {
    const cutoff = Date.now() - IDLE_MS;
    for (const [key, events] of buckets) {
      for (const [event, bucket] of events) {
        if (bucket.lastSeen < cutoff) {
          events.delete(event);
        }
      }
      if (events.size === 0) {
        buckets.delete(key);
      }
    }
  }, GC_INTERVAL_MS);
  // Don't keep the event loop alive just for this timer.
  gcTimer.unref?.();
};

export const getBudget = (event: string): EventBudget => BUDGETS[event] ?? DEFAULT_BUDGET;

const redisKey = (key: string, event: string): string =>
  `${REDIS_KEY_PREFIX}${key}:${event}`;

/**
 * Try to consume via Redis. Returns the post-increment count, or null
 * when Redis is unavailable (caller should fall back to in-memory).
 */
const consumeRedis = async (key: string, event: string, windowMs: number): Promise<number | null> => {
  const redis = getRedis();
  if (!redis || !isRedisReady()) {
    return null;
  }
  try {
    const ttlSeconds = Math.ceil(windowMs / 1000);
    const result = await redis.eval(
      INCR_AND_EXPIRE_SCRIPT,
      1,
      redisKey(key, event),
      ttlSeconds.toString()
    );
    return typeof result === 'number' ? result : Number(result);
  } catch (error) {
    logger.debug('socket-rate-limit: Redis eval failed, falling through to memory', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * In-memory consume — the original fixed-window counter logic. Used as
 * fallback when Redis is unavailable.
 */
const consumeMemory = (key: string, event: string, now: number): boolean => {
  ensureGcTimer();
  const budget = getBudget(event);

  let events = buckets.get(key);
  if (!events) {
    events = new Map();
    buckets.set(key, events);
  }

  const bucket = events.get(event);
  if (!bucket || now - bucket.windowStart >= budget.windowMs) {
    events.set(event, { windowStart: now, count: 1, lastSeen: now });
    return false;
  }

  bucket.lastSeen = now;
  if (bucket.count >= budget.limit) {
    return true;
  }
  bucket.count += 1;
  return false;
};

/**
 * Returns true when the event for the given key should be DROPPED
 * (limit exceeded). Returns false when the event may proceed.
 *
 * Tries Redis first for cross-instance consistency; falls back to
 * in-memory when Redis is unavailable.
 *
 * The caller is responsible for emitting `rate_limit` back to the
 * client and dropping the inbound event when this returns true; see
 * `checkRateLimit` for the combined helper.
 */
export const consume = async (key: string, event: string, now: number = Date.now()): Promise<boolean> => {
  const budget = getBudget(event);

  const redisCount = await consumeRedis(key, event, budget.windowMs);
  if (redisCount !== null) {
    // Redis INCR is 1-based: first call returns 1. The limit-th call
    // returns `limit` and is the last allowed. Anything above is dropped.
    return redisCount > budget.limit;
  }

  return consumeMemory(key, event, now);
};

type RateLimitTarget = {
  emit: (event: string, payload: unknown) => void;
  id: string;
  userId?: string;
};

/**
 * Returns true when the inbound event MUST be dropped. Side effects:
 * emits `rate_limit` to the client and logs at INFO.
 */
export const checkRateLimit = async (socket: RateLimitTarget, event: string): Promise<boolean> => {
  const key = socket.userId ?? socket.id;
  if (!(await consume(key, event))) {
    return false;
  }
  const budget = getBudget(event);
  socket.emit('rate_limit', {
    event,
    limit: budget.limit,
    windowMs: budget.windowMs,
  });
  logger.info('Socket inbound rate limit exceeded', {
    socketId: socket.id,
    userId: socket.userId,
    event,
    limit: budget.limit,
  });
  return true;
};

/**
 * Delete a Redis key for a given socket, best-effort.
 */
const deleteRedisKeys = async (socketId: string): Promise<void> => {
  const redis = getRedis();
  if (!redis || !isRedisReady()) {
    return;
  }
  try {
    const pattern = `${REDIS_KEY_PREFIX}${socketId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    logger.debug('socket-rate-limit: Redis cleanup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Free the bucket for a key. Called on socket disconnect; for
 * userId-keyed buckets the GC handles eventual cleanup of stale
 * entries so reconnects don't lose their budget mid-window.
 */
export const releaseSocket = async (socket: RateLimitTarget): Promise<void> => {
  // Only release socketId-keyed buckets here. For authenticated
  // sockets the bucket is shared across reconnects on purpose; the GC
  // sweep handles them when the user goes idle.
  if (socket.userId) {
    return;
  }
  buckets.delete(socket.id);
  await deleteRedisKeys(socket.id);
};

// Test-only helpers. Exported under a prefixed name so they're easy to
// spot in callers; they exist so tests can assert behaviour without
// reaching into module internals via casts.
export const __test = {
  size: (): number => buckets.size,
  has: (key: string): boolean => buckets.has(key),
  reset: (): void => {
    buckets.clear();
    if (gcTimer) {
      clearInterval(gcTimer);
      gcTimer = null;
    }
  },
};
