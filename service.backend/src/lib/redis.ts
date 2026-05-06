import IORedis, { type Redis as RedisClient } from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * ADS-105: Lazy, optional Redis client.
 *
 * Redis is required by BullMQ (scheduler) and the analytics report
 * cache, but the rest of the service should keep working when it's
 * unavailable. We connect lazily on first use, log one warning per
 * boot if it's misconfigured, and expose `isReady()` so callers can
 * skip work cleanly. No retry-storm — single attempt with `lazyConnect`,
 * and `enableOfflineQueue: false` so we fail fast instead of buffering.
 */

let client: RedisClient | null = null;
let warned = false;
let connecting: Promise<void> | null = null;

const buildClient = (): RedisClient | null => {
  if (!env.REDIS_URL) {
    if (!warned) {
      logger.warn(
        'REDIS_URL not set — analytics report caching and scheduling are disabled. ' +
          'Set REDIS_URL to enable.'
      );
      warned = true;
    }
    return null;
  }
  const c = new IORedis(env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null, // BullMQ recommendation
  });
  c.on('error', err => {
    if (!warned) {
      logger.warn('Redis error — caching/scheduling will run in degraded mode', {
        error: err instanceof Error ? err.message : String(err),
      });
      warned = true;
    }
  });
  return c;
};

/** Get the singleton client, or null if Redis isn't configured. */
export const getRedis = (): RedisClient | null => {
  if (client === null) {
    client = buildClient();
  }
  return client;
};

/** Connect on demand. Resolves whether or not the connection succeeds. */
export const ensureRedisReady = async (): Promise<boolean> => {
  const c = getRedis();
  if (!c) {
    return false;
  }
  if (c.status === 'ready') {
    return true;
  }
  if (!connecting) {
    connecting = c.connect().catch(err => {
      logger.warn('Redis connect failed — degraded mode', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
  await connecting;
  connecting = null;
  return (c.status as string) === 'ready';
};

export const isRedisReady = (): boolean => {
  const c = getRedis();
  return !!c && c.status === 'ready';
};

/** For tests — drop the singleton so a fresh module reload reads env. */
export const resetRedisForTests = (): void => {
  if (client) {
    void client.quit().catch(() => undefined);
  }
  client = null;
  warned = false;
  connecting = null;
};
