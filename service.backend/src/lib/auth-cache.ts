import type User from '../models/User';

/**
 * In-process auth cache for ADS-253.
 *
 * `authenticateToken` was running a 3-table join (user → roles →
 * permissions) on every authenticated request — for a dashboard that
 * fires 10 parallel API calls per navigation, that's 10 copies of the
 * join per nav. The cache short-circuits repeat lookups within the
 * TTL window.
 *
 * Scope:
 * - Process-local Map, not Redis. Simpler to reason about, no network
 *   round-trip, and the staleness window is bounded by TTL.
 * - Cached for 60 seconds. Long enough to absorb typical request bursts
 *   from a single page load, short enough that a role change propagates
 *   without an explicit bust.
 * - Role-mutating call sites (`UserRole.create` / `setRoles` /
 *   `removeRole`) explicitly call `invalidateAuthCache(userId)` so the
 *   change takes effect on the next request without waiting for TTL.
 * - Revoked tokens are checked *before* the cache lookup in
 *   `authenticateRequest`, so a revoked session can't ride a stale
 *   cache entry.
 */

const TTL_MS = 60_000;

type CacheEntry = {
  user: User;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export const getCachedUser = (userId: string): User | null => {
  const entry = cache.get(userId);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt < Date.now()) {
    cache.delete(userId);
    return null;
  }
  return entry.user;
};

export const setCachedUser = (userId: string, user: User): void => {
  cache.set(userId, { user, expiresAt: Date.now() + TTL_MS });
};

export const invalidateAuthCache = (userId: string): void => {
  cache.delete(userId);
};

/** For tests — drop everything. */
export const resetAuthCacheForTests = (): void => {
  cache.clear();
};
