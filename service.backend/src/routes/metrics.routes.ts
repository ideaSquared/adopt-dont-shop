import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { isProductionLike } from '../config/env';
import { registry } from '../middleware/metrics';
import { logger } from '../utils/logger';

/**
 * ADS-404: Prometheus scrape endpoint.
 *
 * Gated behind a token (`METRICS_AUTH_TOKEN`) so the endpoint is not
 * world-readable in production. Prometheus is configured with a Bearer
 * scrape job; missing/incorrect token returns 401 without leaking metric
 * names.
 *
 * Dev/test convenience: if the token is unset we fall back to serving
 * loopback-only requests. In production the loopback fallback is dropped
 * entirely — with `trust proxy` enabled a misconfigured nginx (or any
 * upstream that forwards `X-Forwarded-For: 127.0.0.1`) could otherwise
 * spoof loopback and read metrics without a token. If
 * `METRICS_AUTH_TOKEN` is unset in production the route 404s.
 */
const router = Router();

/**
 * Startup check: in a production-like environment, the /metrics endpoint
 * 404s when METRICS_AUTH_TOKEN is unset (see the route handler below).
 * That silently disables Prometheus scraping, so surface it as a clear
 * warning at boot. We deliberately do NOT throw — failing startup here
 * could break an existing deployment that intentionally runs without
 * metrics scraping.
 */
export const warnIfMetricsTokenUnset = (nodeEnv: string | undefined): void => {
  if (isProductionLike(nodeEnv) && !process.env.METRICS_AUTH_TOKEN) {
    logger.warn('METRICS_AUTH_TOKEN unset — /metrics scraping is disabled (route returns 404)');
  }
};

const isLoopback = (ip: string | undefined): boolean =>
  ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

/**
 * ADS-784: constant-time bearer-token comparison. A plain `!==` leaks the token
 * length and the first-differing byte position via response timing. Guard the
 * length first because `timingSafeEqual` throws on unequal-length buffers.
 */
const tokenMatches = (provided: string, expected: string): boolean => {
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
};

router.get('/', async (req: Request, res: Response) => {
  const token = process.env.METRICS_AUTH_TOKEN;

  if (token) {
    const header = req.get('authorization') ?? '';
    const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!tokenMatches(provided, token)) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
  } else if (isProductionLike(process.env.NODE_ENV)) {
    // No token, production-like env: refuse to serve. We don't trust
    // req.ip behind a proxy because X-Forwarded-For can be spoofed.
    res.sendStatus(404);
    return;
  } else if (!isLoopback(req.ip)) {
    res.status(401).json({
      error: 'METRICS_AUTH_TOKEN not configured; metrics are loopback-only',
    });
    return;
  }

  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
});

export default router;
