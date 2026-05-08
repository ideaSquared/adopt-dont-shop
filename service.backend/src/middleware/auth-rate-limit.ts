/**
 * ADS-436 + ADS-439: auth-specific rate limiters.
 *
 * - Backed by Redis (via rate-limit-redis) when REDIS_URL is set so limits
 *   are shared across replicas. Falls back to in-memory only when Redis is
 *   unconfigured.
 * - Blocks in development unless RATE_LIMIT_DEV_BYPASS=true. The previous
 *   rate-limiter.ts module logged but never blocked in dev, which made it
 *   impossible to verify brute-force protection locally.
 * - Adds dedicated registration limiters keyed by IP (low burst) and by
 *   lowercased email body field (per-account) so disposable-email flooding
 *   is rate-limited per account, not just per IP.
 */
import type { Request, Response } from 'express';
import rateLimit, { type Options as RateLimitOptions, type Store } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedis } from '../lib/redis';
import { logger } from '../utils/logger';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

const isProd = (): boolean => process.env.NODE_ENV === 'production';
const devBypass = (): boolean =>
  process.env.NODE_ENV !== 'production' && process.env.RATE_LIMIT_DEV_BYPASS === 'true';

/**
 * Build a `Store` backed by Redis when available. We use the singleton client
 * from `lib/redis.ts` and proxy raw commands via ioredis' `call` API.
 */
const buildStore = (prefix: string): Store | undefined => {
  const redis = getRedis();
  if (!redis) {
    return undefined;
  }
  return new RedisStore({
    prefix: `rl:auth:${prefix}:`,
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<number>,
  });
};

const buildLimiter = (
  name: string,
  base: Pick<RateLimitOptions, 'windowMs' | 'max'> &
    Partial<Pick<RateLimitOptions, 'keyGenerator' | 'skipSuccessfulRequests'>>
) => {
  const handler = (req: Request, res: Response): void => {
    logger.warn(`${name} rate limit exceeded`, {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(base.windowMs / 1000),
    });
  };

  const store = buildStore(name);

  return rateLimit({
    windowMs: base.windowMs,
    max: base.max,
    keyGenerator: base.keyGenerator,
    skipSuccessfulRequests: base.skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => devBypass(),
    store,
    handler,
  });
};

const emailKey = (req: Request): string => {
  const body = req.body as Record<string, unknown> | undefined;
  const raw = typeof body?.email === 'string' ? body.email : '';
  return `email:${raw.toLowerCase()}`;
};

/**
 * IP-keyed registration limiter — stricter than the IP-keyed auth limiter
 * since registration is the primary fake-account-flooding vector.
 *
 * 20 registrations per hour per IP.
 */
export const registrationIpLimiter = buildLimiter('register-ip', {
  windowMs: ONE_HOUR_MS,
  max: 20,
});

/**
 * Per-email registration limiter — prevents repeated re-registration attempts
 * for a single target email (e.g. enumeration of which emails are already in
 * use, or attempts to keep churning a single throwaway address).
 *
 * 5 attempts per hour per email.
 */
export const registrationEmailLimiter = buildLimiter('register-email', {
  windowMs: ONE_HOUR_MS,
  max: 5,
  keyGenerator: emailKey,
});

/**
 * Drop-in replacement for the general `authLimiter` used by login. Redis-
 * backed so multi-replica deploys share state. Behaviour matches the existing
 * limiter (5 per 15 min per IP, success-skip).
 */
export const loginIpLimiter = buildLimiter('login-ip', {
  windowMs: FIFTEEN_MINUTES_MS,
  max: 5,
  skipSuccessfulRequests: true,
});

if (!isProd() && !devBypass()) {
  // One-off boot warning: dev now blocks like prod (good for testing brute-
  // force protection); set RATE_LIMIT_DEV_BYPASS=true to bypass.
  logger.info(
    'Auth rate limiters enforced in non-production. Set RATE_LIMIT_DEV_BYPASS=true to disable.'
  );
}
