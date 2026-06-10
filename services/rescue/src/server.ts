// services/rescue — Phase 4 extraction. Owns the rescue.* schema and
// exposes RescueService over gRPC. Phase 4.1 (this commit) is just the
// boot skeleton; everything else arrives in subsequent commits.
//
// Mirror of services/pets/src/server.ts structure: Fastify for
// /health/simple, gRPC server attached in Phase 4.3c, NATS publishers
// in Phase 4.4, gateway routing in Phase 4.5, cutover in Phase 4.6.

import { createLogger, registerMetrics, registerRequestId } from '@adopt-dont-shop/observability';
import Fastify, { type FastifyInstance } from 'fastify';

import type { RescueConfig } from './config.js';

export type CreateServerOptions = {
  config: RescueConfig;
  // Optional logger injection — tests pass a quiet logger so the
  // suite output stays readable. Real boot uses createLogger so the
  // service emits structured lines through the same pipeline as the
  // rest of the stack.
  logger?: ReturnType<typeof createLogger>;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  const { config } = opts;
  const logger = opts.logger ?? createLogger({ serviceName: 'service.rescue' });

  // Disable Fastify's built-in pino — winston handles service-level
  // lines (boot, shutdown, error handler), and OTel's HTTP
  // auto-instrumentation already covers per-request spans. Same
  // shape as the other extracted services.
  const server = Fastify({
    logger: false,
    trustProxy: true,
  });

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

  // Health endpoint — matches the rest of the stack's
  // `/health/simple` path so the existing Docker compose healthcheck
  // pattern picks this service up unchanged.
  server.get('/health/simple', async () => ({
    status: 'ok',
    service: 'service.rescue',
    environment: config.environment,
  }));

  return server;
};

export type { RescueConfig };
