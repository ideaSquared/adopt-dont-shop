import { ensureRedisReady, getRedis } from './redis';
import { logger } from '../utils/logger';

/**
 * ADS-253: Per-user auth cache.
 *
 * Stores the serialised User+Roles+Permissions JSON under
 * `auth:user:{userId}` with a 120-second TTL so the 3-table join on
 * every authenticated request is skipped for the vast majority of
 * traffic. The cache is busted explicitly on any write that changes a
 * user's role or status (see the callers of `invalidateAuthCache`).
 *
 * Graceful degradation: when Redis is unavailable every method becomes
 * a no-op and the middleware falls through to the DB query as before.
 */

const AUTH_CACHE_TTL_SECONDS = 120;

const cacheKey = (userId: string): string => `auth:user:${userId}`;

export const getAuthCache = async <T>(userId: string): Promise<T | null> => {
  const ready = await ensureRedisReady();
  if (!ready) {
    return null;
  }
  const redis = getRedis()!;
  try {
    const raw = await redis.get(cacheKey(userId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.debug('auth-cache get failed (treating as miss)', {
      error: err instanceof Error ? err.message : String(err),
      userId,
    });
    return null;
  }
};

export const setAuthCache = async (userId: string, payload: unknown): Promise<void> => {
  const ready = await ensureRedisReady();
  if (!ready) {
    return;
  }
  const redis = getRedis()!;
  try {
    await redis.set(cacheKey(userId), JSON.stringify(payload), 'EX', AUTH_CACHE_TTL_SECONDS);
  } catch (err) {
    logger.debug('auth-cache set failed (continuing without cache)', {
      error: err instanceof Error ? err.message : String(err),
      userId,
    });
  }
};

export const invalidateAuthCache = async (userId: string): Promise<void> => {
  const ready = await ensureRedisReady();
  if (!ready) {
    return;
  }
  const redis = getRedis()!;
  try {
    await redis.del(cacheKey(userId));
  } catch (err) {
    logger.debug('auth-cache invalidate failed', {
      error: err instanceof Error ? err.message : String(err),
      userId,
    });
  }
};
