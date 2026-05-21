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

const readMemory = (key: string): number => {
  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    return 0;
  }
  return entry.count;
};

const writeMemoryIncrement = (key: string): void => {
  const now = Date.now();
  const existing = memoryStore.get(key);
  if (!existing || existing.expiresAt <= now) {
    memoryStore.set(key, { count: 1, expiresAt: now + TTL_SECONDS * 1000 });
    return;
  }
  existing.count += 1;
};

const readRedis = async (key: string): Promise<number | null> => {
  const redis = getRedis();
  if (!redis || !isRedisReady()) {
    return null;
  }
  try {
    const raw = await redis.get(key);
    return raw === null ? 0 : Number(raw);
  } catch (error) {
    logger.debug('anon-swipe-limit: Redis get failed, falling through to memory', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const writeRedisIncrement = async (key: string): Promise<void> => {
  const redis = getRedis();
  if (!redis || !isRedisReady()) {
    return;
  }
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, TTL_SECONDS);
    }
  } catch (error) {
    logger.debug('anon-swipe-limit: Redis incr failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
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

  const redisCount = await readRedis(key);
  const current = redisCount ?? readMemory(key);

  if (current >= limit) {
    res.status(402).json({
      success: false,
      code: 'ANON_SWIPE_LIMIT_REACHED',
      message: 'Anonymous swipe limit reached. Sign up to keep swiping.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (redisCount === null) {
    writeMemoryIncrement(key);
  } else {
    await writeRedisIncrement(key);
  }

  next();
};
