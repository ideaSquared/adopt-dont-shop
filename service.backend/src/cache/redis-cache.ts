import { createHash } from 'crypto';
import { ensureRedisReady, getRedis, isRedisReady } from '../lib/redis';
import { logger } from '../utils/logger';

/**
 * ADS-479 / ADS-516: Read-through Redis cache helper for hot read paths.
 *
 * Behaviour:
 * - Wraps a fetch function. On a hit, returns the cached value. On a
 *   miss (or any Redis failure), falls through to the loader and
 *   best-effort writes the result back.
 * - Keys are namespaced (`namespace:hash`) and the args are SHA-1
 *   hashed so long argument blobs don't blow the key length.
 * - A versioned namespace lets writes invalidate an entire group by
 *   bumping the version, so we don't have to track every key.
 * - Redis is optional. When it isn't ready, the helper is a no-op
 *   passthrough. Errors are swallowed and logged at debug; we never
 *   surface cache failures to the caller.
 */

const DEFAULT_TTL_SECONDS = 60;

const VERSION_KEY_PREFIX = 'cache:version:';

/**
 * Stable JSON stringifier so `{a:1,b:2}` and `{b:2,a:1}` produce the same key.
 * Recurses into nested objects, leaves primitives/arrays as-is.
 */
const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
};

const hashArgs = (args: unknown): string => {
  const serialized = stableStringify(args);
  return createHash('sha1').update(serialized).digest('hex');
};

const versionKey = (namespace: string): string => `${VERSION_KEY_PREFIX}${namespace}`;

/** Get the current version stamp for a namespace (defaults to '1'). */
const getNamespaceVersion = async (namespace: string): Promise<string> => {
  const redis = getRedis();
  if (!redis || !isRedisReady()) {
    return '1';
  }
  try {
    const v = await redis.get(versionKey(namespace));
    return v ?? '1';
  } catch (error) {
    logger.debug('Cache version lookup failed', {
      namespace,
      error: error instanceof Error ? error.message : String(error),
    });
    return '1';
  }
};

const buildKey = (namespace: string, version: string, args: unknown): string =>
  `cache:${namespace}:v${version}:${hashArgs(args)}`;

export type CacheOptions = {
  /** Cache namespace, e.g. 'pets:list'. */
  namespace: string;
  /** Anything that varies the result — included in the key hash. */
  args: unknown;
  /** TTL in seconds. Default 60s. */
  ttlSeconds?: number;
};

/**
 * Read-through cache wrapper. Always falls through to `loader` if the
 * cache is unavailable or the entry is missing. Best-effort writes.
 */
export const cached = async <T>(opts: CacheOptions, loader: () => Promise<T>): Promise<T> => {
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const ready = await ensureRedisReady();
  if (!ready) {
    return loader();
  }

  const redis = getRedis();
  if (!redis) {
    return loader();
  }

  const version = await getNamespaceVersion(opts.namespace);
  const key = buildKey(opts.namespace, version, opts.args);

  try {
    const hit = await redis.get(key);
    if (hit !== null) {
      return JSON.parse(hit) as T;
    }
  } catch (error) {
    logger.debug('Cache read failed — falling through', {
      namespace: opts.namespace,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const value = await loader();

  // Best-effort write. Skip undefined / non-serializable returns.
  if (value !== undefined) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      logger.debug('Cache write failed', {
        namespace: opts.namespace,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return value;
};

/**
 * Bump the version stamp for a namespace so all existing keys become
 * unreachable. Used by write paths to invalidate listing caches.
 * No-op if Redis isn't available.
 */
export const invalidateNamespace = async (namespace: string): Promise<void> => {
  const ready = await ensureRedisReady();
  if (!ready) {
    return;
  }
  const redis = getRedis();
  if (!redis) {
    return;
  }
  try {
    await redis.incr(versionKey(namespace));
  } catch (error) {
    logger.debug('Cache invalidation failed', {
      namespace,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/** Test seam — exposed for unit tests to assert key shape. */
export const __test__ = { hashArgs, stableStringify, buildKey };
