import { Request, Response, Router } from 'express';
import { registry } from '../middleware/metrics';

/**
 * ADS-404: Prometheus scrape endpoint.
 *
 * Gated behind a token (`METRICS_AUTH_TOKEN`) so the endpoint is not
 * world-readable in production. Prometheus is configured with a Bearer
 * scrape job; missing/incorrect token returns 401 without leaking metric
 * names. If the token is unset (typical in dev) the endpoint refuses to
 * serve from non-loopback IPs so a misconfigured prod box doesn't expose
 * metrics by default.
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
