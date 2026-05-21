/**
 * ADS-709: per-socket inbound rate limiting for Socket.IO.
 *
 * The chat-auth hardening (ADS-708, plan pass 2) removed the 30s
 * revocation cache, so every inbound event now performs a RevokedToken
 * point lookup on the DB. Without an inbound limiter a misbehaving or
 * hostile client could spam events and exhaust the DB connection pool.
 *
 * Strategy: fixed-window counters held in process memory.
 *  - Keyed by userId when the socket is authenticated, so reconnects
 *    don't reset the budget; falls back to socketId otherwise.
 *  - Per-event-type budgets: chat-send is tighter than typing or
 *    read-receipt indicators which are inherently chatty.
 *  - On overrun: emit `rate_limit` back to the client and drop the
 *    inbound event. We do NOT disconnect — a single spike from an
 *    otherwise-well-behaved client should not kill the session.
 *  - Cleanup: bucket released on socket disconnect; periodic GC drops
 *    user-keyed buckets idle for > IDLE_MS.
 */
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

/**
 * Returns true when the event for the given key should be DROPPED
 * (limit exceeded). Returns false when the event may proceed.
 *
 * The caller is responsible for emitting `rate_limit` back to the
 * client and dropping the inbound event when this returns true; see
 * `checkRateLimit` for the combined helper.
 */
export const consume = (key: string, event: string, now: number = Date.now()): boolean => {
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

type RateLimitTarget = {
  emit: (event: string, payload: unknown) => void;
  id: string;
  userId?: string;
};

/**
 * Returns true when the inbound event MUST be dropped. Side effects:
 * emits `rate_limit` to the client and logs at INFO.
 */
export const checkRateLimit = (socket: RateLimitTarget, event: string): boolean => {
  const key = socket.userId ?? socket.id;
  if (!consume(key, event)) {
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
 * Free the bucket for a key. Called on socket disconnect; for
 * userId-keyed buckets the GC handles eventual cleanup of stale
 * entries so reconnects don't lose their budget mid-window.
 */
export const releaseSocket = (socket: RateLimitTarget): void => {
  // Only release socketId-keyed buckets here. For authenticated
  // sockets the bucket is shared across reconnects on purpose; the GC
  // sweep handles them when the user goes idle.
  if (socket.userId) {
    return;
  }
  buckets.delete(socket.id);
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
