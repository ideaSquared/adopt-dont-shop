// services/matching — Phase 9 extraction. Stateless recommender +
// discovery + search + swipe absorption. Phase 9.1 (this commit) is
// just the boot skeleton.

import { createLogger, registerMetrics, registerRequestId } from '@adopt-dont-shop/observability';
import Fastify, { type FastifyInstance } from 'fastify';

import type { MatchingConfig } from './config.js';

export type CreateServerOptions = {
  config: MatchingConfig;
  logger?: ReturnType<typeof createLogger>;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  const { config } = opts;
  const logger = opts.logger ?? createLogger({ serviceName: 'service.matching' });

  const server = Fastify({ logger: false, trustProxy: true });

  server.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    logger.error('request failed', {
      method: req.method,
      url: req.url,
      message: err.message,
    });
    void reply.status(err.statusCode ?? 500).send({ error: 'internal_error' });
  });

  // Request-id middleware runs FIRST so the id is on req for every
  // hook after it (metrics onResponse + any per-route hook).
  registerRequestId(server);

  // Prometheus /metrics + http_request_duration_seconds onResponse
  // hook. Substrate only — no domain-specific instruments here.
  registerMetrics(server);

  server.get('/health/simple', async () => ({
    status: 'ok',
    service: 'service.matching',
    environment: config.environment,
  }));

  return server;
};

export type { MatchingConfig };
