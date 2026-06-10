// services/notifications — first stateful extraction of the Phase 1
// migration. This file builds the HTTP surface; gRPC handlers + NATS
// subscribers will land alongside as separate modules in later
// commits.
//
// Phase 1.1 (this commit) is intentionally tiny: a Fastify instance
// with /health/simple wired so the service can boot under the existing
// Docker compose healthcheck pattern. Schema/migrations (1.2), gRPC
// API (1.3), NATS subscriber for fan-out (1.4), and the gateway WS
// wiring (1.5) build on this foundation.

import { createLogger, registerMetrics, registerRequestId } from '@adopt-dont-shop/observability';
import Fastify, { type FastifyInstance } from 'fastify';

import type { NotificationsConfig } from './config.js';

export type CreateServerOptions = {
  config: NotificationsConfig;
  // Optional logger injection — tests pass a quiet logger so the
  // suite output stays readable. Real boot uses createLogger so the
  // service emits structured lines through the same pipeline as the
  // rest of the stack.
  logger?: ReturnType<typeof createLogger>;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  const { config } = opts;
  const logger = opts.logger ?? createLogger({ serviceName: 'service.notifications' });

  // Disable Fastify's built-in pino — winston handles service-level
  // lines (boot, shutdown, error handler), and OTel's HTTP
  // auto-instrumentation already covers per-request spans. Same
  // shape as services/gateway.
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

  // Health endpoint — matches service.backend + service.gateway's
  // `/health/simple` path so the existing Docker compose healthcheck
  // pattern picks this service up without changes.
  server.get('/health/simple', async () => ({
    status: 'ok',
    service: 'service.notifications',
    environment: config.environment,
  }));

  return server;
};

export type { NotificationsConfig };
