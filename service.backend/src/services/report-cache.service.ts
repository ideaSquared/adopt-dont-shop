import { createHash } from 'crypto';
import { ensureRedisReady, getRedis } from '../lib/redis';
import { logger } from '../utils/logger';
import type { ReportConfig } from '../schemas/reports.schema';

/**
 * ADS-105: Cache layer for executed report payloads.
 *
 * Keyed by (scope, config-hash, dateRange) so identical config runs
 * across different rescues never collide. TTL varies with how "live"
 * the data is — daily aggregates rarely change after the day rolls
 * over, but real-time stats need a fresh window every minute.
 *
 * Graceful degradation: when Redis isn't ready, every method becomes
 * a no-op. Callers must always handle a `null` return from `get()`.
 */

const NS = 'analytics:report';

export type CacheTTL = 'realtime' | 'daily' | 'historical';

const ttlSeconds: Record<CacheTTL, number> = {
  realtime: 30,
  daily: 5 * 60,
  historical: 60 * 60,
};

const hashConfig = (config: ReportConfig): string =>
  createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0, 16);

const buildKey = (
  scope: string | 'platform',
  config: ReportConfig,
  startDate?: Date,
  endDate?: Date
): string => {
  const start = startDate?.toISOString() ?? '*';
  const end = endDate?.toISOString() ?? '*';
  return `${NS}:${scope}:${hashConfig(config)}:${start}:${end}`;
};

export const ReportCache = {
  async get<T>(
    scope: string | 'platform',
    config: ReportConfig,
    startDate?: Date,
    endDate?: Date
  ): Promise<T | null> {
    const ready = await ensureRedisReady();
    if (!ready) {
      return null;
    }
    const redis = getRedis()!;
    const key = buildKey(scope, config, startDate, endDate);
    try {
      const raw = await redis.get(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.debug('ReportCache.get failed (treating as miss)', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  },

  async set(
    scope: string | 'platform',
    config: ReportConfig,
    payload: unknown,
    ttl: CacheTTL = 'daily',
    startDate?: Date,
    endDate?: Date
  ): Promise<void> {
    const ready = await ensureRedisReady();
    if (!ready) {
      return;
    }
    const redis = getRedis()!;
    const key = buildKey(scope, config, startDate, endDate);
    try {
      await redis.set(key, JSON.stringify(payload), 'EX', ttlSeconds[ttl]);
    } catch (err) {
      logger.debug('ReportCache.set failed (continuing without cache)', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  /**
   * Invalidate every cached payload for a given scope. Used by the
   * domain mutations that emit `analytics:invalidate` so the next read
   * recomputes. Keys are deleted in batches via SCAN to avoid blocking
   * the server with large KEYS calls.
   */
  async bust(scope: string | 'platform'): Promise<void> {
    const ready = await ensureRedisReady();
    if (!ready) {
      return;
    }
    const redis = getRedis()!;
    const pattern = `${NS}:${scope}:*`;
    try {
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = next;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      logger.debug('ReportCache.bust failed', {
        error: err instanceof Error ? err.message : String(err),
        pattern,
      });
    }
  },
};
