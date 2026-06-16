// Per-email rate limiter for the auth surface (ADS-844).
//
// @fastify/rate-limit caps per IP, but its keyGenerator runs at onRequest —
// BEFORE the body is parsed — so the email isn't available there. This limiter
// runs as a route preHandler (after body parsing) and caps attempts per
// normalized email, layered ON TOP of the untouched per-IP cap. It throttles
// an attacker who spreads an email-enumeration / reset-spam flood across many
// IPs (which the per-IP cap alone misses).
//
// Backed by the gateway's shared rate-limit Redis when available (so the cap
// is N-replica-safe), otherwise a per-replica in-memory counter. Like the IP
// limiter it fails OPEN on a Redis error — availability over a hard fail.

// The slim Redis surface this limiter uses. ioredis' Redis satisfies it.
export type EmailRateLimiterRedis = {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
};

export type EmailRateLimiterOptions = {
  // Max attempts allowed per email per window.
  max: number;
  // Window length in milliseconds.
  windowMs: number;
  // Shared Redis store. When omitted, an in-memory counter is used.
  redis?: EmailRateLimiterRedis;
  // Injectable clock for tests.
  now?: () => number;
};

export type EmailRateLimiter = {
  // Returns true when the attempt is within the cap, false when throttled.
  consume: (email: string) => Promise<boolean>;
};

const KEY_PREFIX = 'auth-email-rl';

// Normalize an email so casing / whitespace variants share one bucket. Returns
// undefined when the value isn't a usable email-ish string.
export const normalizeEmail = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const createEmailRateLimiter = (opts: EmailRateLimiterOptions): EmailRateLimiter => {
  const now = opts.now ?? Date.now;
  if (opts.redis) {
    return redisLimiter(opts.redis, opts.max, opts.windowMs, now);
  }
  return memoryLimiter(opts.max, opts.windowMs, now);
};

const redisLimiter = (
  redis: EmailRateLimiterRedis,
  max: number,
  windowMs: number,
  now: () => number
): EmailRateLimiter => {
  const windowSeconds = Math.ceil(windowMs / 1000);
  return {
    consume: async (email: string): Promise<boolean> => {
      // Fixed-window bucket: same email in the same window shares a key.
      const bucket = Math.floor(now() / windowMs);
      const key = `${KEY_PREFIX}:${bucket}:${email}`;
      try {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.expire(key, windowSeconds);
        }
        return count <= max;
      } catch {
        // Fail open — match the IP limiter's skipOnError behaviour.
        return true;
      }
    },
  };
};

const memoryLimiter = (max: number, windowMs: number, now: () => number): EmailRateLimiter => {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    consume: (email: string): Promise<boolean> => {
      const ts = now();
      const existing = buckets.get(email);
      if (!existing || ts >= existing.resetAt) {
        buckets.set(email, { count: 1, resetAt: ts + windowMs });
        return Promise.resolve(true);
      }
      existing.count += 1;
      return Promise.resolve(existing.count <= max);
    },
  };
};
