/**
 * Per-user anti-abuse rate limiters keyed by `req.user.userId`.
 *
 * These complement the IP-keyed limiters in `rate-limiter.ts` for user-
 * initiated actions where a malicious account (not a network egress)
 * is the abuse vector — e.g. spammy applications, spammy reports.
 *
 * Redis-backed via the same singleton client as auth-rate-limit so
 * limits are shared across replicas. Falls back to in-memory only when
 * Redis is unconfigured.
 *
 * In dev, behaviour matches auth-rate-limit: limiters enforce unless
 * `RATE_LIMIT_DEV_BYPASS=true`.
 */
import type { Request, Response } from 'express';
import rateLimit, { type Options as RateLimitOptions, type Store } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedis } from '../lib/redis';
import { logger } from '../utils/logger';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

const devBypass = (): boolean =>
  process.env.NODE_ENV !== 'production' && process.env.RATE_LIMIT_DEV_BYPASS === 'true';

type RequestWithUser = Request & { user?: { userId?: string } };

const userIdOrIp = (req: RequestWithUser): string => req.user?.userId || req.ip || 'unknown';

const buildStore = (prefix: string): Store | undefined => {
  const redis = getRedis();
  if (!redis) {
    return undefined;
  }
  return new RedisStore({
    prefix: `rl:abuse:${prefix}:`,
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<number>,
  });
};

const buildLimiter = (
  name: string,
  message: string,
  base: Pick<RateLimitOptions, 'windowMs' | 'max'>
) => {
  const handler = (req: Request, res: Response): void => {
    const userId = (req as RequestWithUser).user?.userId;
    logger.warn(`${name} rate limit exceeded`, {
      userId,
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: message,
      retryAfter: Math.ceil(base.windowMs / 1000),
    });
  };

  return rateLimit({
    windowMs: base.windowMs,
    max: base.max,
    keyGenerator: userIdOrIp,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => devBypass(),
    store: buildStore(name),
    handler,
  });
};

/**
 * Per-user application creation: 5/day. Combined with `applicationCreateWeeklyLimiter`,
 * caps burst submissions from a single account.
 */
export const applicationCreateDailyLimiter = buildLimiter(
  'application-create-daily',
  'You have submitted too many applications today. Please try again tomorrow.',
  { windowMs: ONE_DAY_MS, max: 5 }
);

/**
 * Per-user application creation: 20/week.
 */
export const applicationCreateWeeklyLimiter = buildLimiter(
  'application-create-weekly',
  'You have submitted too many applications this week. Please try again later.',
  { windowMs: ONE_WEEK_MS, max: 20 }
);

/**
 * Per-user report rate limit across all report types (pet reports,
 * moderation reports, etc.): 5/day. Pairs with the existing per-pet
 * idempotency check that caps to 1 report per pet per user.
 */
export const reportCreateDailyLimiter = buildLimiter(
  'report-create-daily',
  'You have submitted too many reports today. Please try again tomorrow.',
  { windowMs: ONE_DAY_MS, max: 5 }
);
