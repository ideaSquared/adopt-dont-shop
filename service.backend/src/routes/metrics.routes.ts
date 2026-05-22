import { Request, Response, Router } from 'express';
import { isProductionLike } from '../config/env';
import { registry } from '../middleware/metrics';

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

const isLoopback = (ip: string | undefined): boolean =>
  ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

router.get('/', async (req: Request, res: Response) => {
  const token = process.env.METRICS_AUTH_TOKEN;

  if (token) {
    const header = req.get('authorization') ?? '';
    const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (provided !== token) {
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
