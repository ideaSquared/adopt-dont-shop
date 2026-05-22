import { createHash } from 'crypto';
import type { NextFunction, Response } from 'express';
import { getRedis, isRedisReady } from '../lib/redis';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth';

/**
 * ADS-625 server-side enforcement.
 *
 * Counterpart to the client-side anon swipe budget in
 * `app.client/src/utils/anonSwipeBudget.ts`. The client gate is a UX hint
 * only — clearing localStorage, opening incognito, or curl-ing the
 * endpoint bypasses it. This middleware mirrors that limit on the server
 * so the soft-block actually holds.
 *
 * Scope: anonymous callers only. Authenticated requests bypass.
 *
 * Identifier (priority order):
 *   1. CSRF per-browser session cookie (`csrf-session` / `__Host-csrf-session`)
 *      — the same identifier the CSRF middleware mints, so it survives
 *      across requests within a browser.
 *   2. SHA-256(req.ip) — coarse fallback for callers without cookies
 *      (curl, abuse). `trust proxy` is set at the app level so req.ip is
 *      the client address, not the loadbalancer.
 *
 * Storage: Redis (`INCR` + `EXPIRE`, 24h TTL) when available; otherwise an
 * in-process Map. Multi-replica deployments should run with Redis.
 */

const KEY_PREFIX = 'anon:swipe:';
const TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_LIMIT = 7;

const CSRF_SESSION_COOKIES = ['__Host-csrf-session', 'csrf-session'] as const;

const resolveLimit = (): number => {
  const raw = process.env.ANON_SWIPE_LIMIT;
  if (!raw) {
    return DEFAULT_LIMIT;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.floor(parsed);
};

const resolveIdentifier = (req: AuthenticatedRequest): string => {
  const cookies = (req as AuthenticatedRequest & { cookies?: Record<string, string | undefined> })
    .cookies;
  for (const name of CSRF_SESSION_COOKIES) {
    const value = cookies?.[name];
    if (typeof value === 'string' && value.length > 0) {
      return `cookie:${value}`;
    }
  }
  const ip = req.ip ?? 'unknown';
  return `ip:${createHash('sha256').update(ip).digest('hex')}`;
};

type MemoryEntry = { count: number; expiresAt: number };
const memoryStore = new Map<string, MemoryEntry>();

/**
 * Atomic increment-and-fetch in a single Redis round-trip. Previously
 * we did GET → compare-to-limit → INCR, which leaks counts under
 * concurrent requests (N parallel callers can all read 0 and all pass
 * before any of them increments). The LUA script makes the
 * increment/check sequence atomic — every call gets a strictly
 * increasing return value.
 *
 * Also patches an orphan-TTL hole: the previous code only set EXPIRE
 * when the INCR returned 1. If a row ever ended up without a TTL
 * (e.g. EXPIRE failed, or a pre-existing key was created without one),
 * the counter would stick forever. The script re-applies the TTL any
 * time it finds the key has no expiration set.
 */
const INCR_AND_EXPIRE_SCRIPT = `local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
elseif redis.call('TTL', KEYS[1]) < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current`;

const incrementRedisAtomic = async (key: string): Promise<number | null> => {
  const redis = getRedis();
  if (!redis || !isRedisReady()) {
    return null;
  }
  try {
    const result = await redis.eval(INCR_AND_EXPIRE_SCRIPT, 1, key, TTL_SECONDS.toString());
    return typeof result === 'number' ? result : Number(result);
  } catch (error) {
    logger.debug('anon-swipe-limit: Redis eval failed, falling through to memory', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const incrementMemory = (key: string): number => {
  const now = Date.now();
  const existing = memoryStore.get(key);
  if (!existing || existing.expiresAt <= now) {
    memoryStore.set(key, { count: 1, expiresAt: now + TTL_SECONDS * 1000 });
    return 1;
  }
  existing.count += 1;
  return existing.count;
};

export const anonSwipeLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.user) {
    next();
    return;
  }

  const limit = resolveLimit();
  const key = `${KEY_PREFIX}${resolveIdentifier(req)}`;

  // Atomic increment-then-check. The post-increment value IS the count
  // of consumed budget; the (limit+1)-th call returns limit+1 and is
  // rejected. The over-shoot on the rejecting call is harmless — the
  // TTL still expires the row in 24h, and subsequent calls still
  // reject because the count stays above limit.
  const redisCount = await incrementRedisAtomic(key);
  const current = redisCount ?? incrementMemory(key);

  if (current > limit) {
    res.status(402).json({
      success: false,
      code: 'ANON_SWIPE_LIMIT_REACHED',
      message: 'Anonymous swipe limit reached. Sign up to keep swiping.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};
