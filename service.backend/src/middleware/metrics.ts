import { NextFunction, Request, Response } from 'express';
import client from 'prom-client';

/**
 * ADS-404: Prometheus instrumentation.
 *
 * Single shared registry collects:
 *   - default Node.js process metrics (heap, GC, event loop lag)
 *   - per-request HTTP histogram (duration, status, route, method)
 *
 * The route label uses `req.route?.path` so URLs with route-params
 * (`/users/:userId`) collapse into a single time series instead of
 * exploding the cardinality with one bucket per concrete ID.
 */
export const registry = new client.Registry();

client.collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds, labelled by method, route and status code.',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed, labelled by method, route and status code.',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [registry],
});

const labelsFor = (req: Request, res: Response) => ({
  method: req.method,
  route: req.route?.path ?? req.baseUrl + (req.path || ''),
  status_code: String(res.statusCode),
});

/**
 * Middleware that times every request from receipt to `finish`. Mounted
 * before the routers so `req.route` is populated by the time the handler
 * resolves.
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const endTimer = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const labels = labelsFor(req, res);
    endTimer(labels);
    httpRequestsTotal.inc(labels);
  });

  next();
};
