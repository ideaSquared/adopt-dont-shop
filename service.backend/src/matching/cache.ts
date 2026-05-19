import { createHash } from 'crypto';
import { getRedis, isRedisReady } from '../lib/redis';
import { logger } from '../utils/logger';
import { ScoreResult } from './types';

/**
 * Per-(user, pet, scorer-mix) score cache. Backed by Redis when
 * available, silently no-op otherwise (same pattern as the analytics
 * report cache).
 *
 * Cache key includes a hash of the blend config so a weight change
 * invalidates stale entries without a manual flush.
 */

const KEY_PREFIX = 'match:score:v1';

export const buildMixHash = (mix: Record<string, number>): string =>
  createHash('sha1')
    .update(
      Object.keys(mix)
        .sort()
        .map(k => `${k}=${mix[k]}`)
        .join('|')
    )
    .digest('hex')
    .slice(0, 10);

const buildKey = (userId: string, petId: string, mixHash: string): string =>
  `${KEY_PREFIX}:${mixHash}:${userId}:${petId}`;

export const readCached = async (
  userId: string,
  petId: string,
  mixHash: string
): Promise<ScoreResult | null> => {
  if (!isRedisReady()) return null;
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(buildKey(userId, petId, mixHash));
    if (!raw) return null;
    return JSON.parse(raw) as ScoreResult;
  } catch (err) {
    logger.warn('match cache read failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
};

export const writeCached = async (
  userId: string,
  petId: string,
  mixHash: string,
  result: ScoreResult,
  ttlSeconds: number
): Promise<void> => {
  if (!isRedisReady()) return;
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(buildKey(userId, petId, mixHash), JSON.stringify(result), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn('match cache write failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
