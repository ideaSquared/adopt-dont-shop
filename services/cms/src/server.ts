import Fastify, { type FastifyInstance } from 'fastify';

import { createLogger, registerMetrics, registerRequestId } from '@adopt-dont-shop/observability';

import type { CmsConfig } from './config.js';

export type CreateServerOptions = {
  config: CmsConfig;
  logger?: ReturnType<typeof createLogger>;
  // Readiness probe — /health/simple returns 503 until this returns
  // true. Defaults to () => true so existing call-sites compile
  // unchanged. index.ts flips a local boolean after gRPC binds.
  isReady?: () => boolean;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  const { config } = opts;
  const logger = opts.logger ?? createLogger({ serviceName: 'service.cms' });
  const isReady = opts.isReady ?? (() => true);
  const server = Fastify({ logger: false, trustProxy: true });

  server.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    logger.error('request failed', { method: req.method, url: req.url, message: err.message });
    void reply.status(err.statusCode ?? 500).send({ error: 'internal_error' });
  });

  // Request-id middleware runs FIRST so the id is on req for every
  // hook after it (metrics onResponse + any per-route hook).
  registerRequestId(server);

  // Prometheus /metrics + http_request_duration_seconds onResponse
  // hook. Substrate only — no domain-specific instruments here.
  registerMetrics(server);

  // Health endpoint — same path the rest of the stack uses. Returns 503
  // until the gRPC server has bound (isReady probe), then the 200 payload.
  server.get('/health/simple', async (_req, reply) => {
    if (!isReady()) {
      return reply.status(503).send({ status: 'starting' });
    }
    return { status: 'ok', service: 'service.cms', environment: config.environment };
  });

  return server;
};
