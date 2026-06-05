// services/auth — Phase 2 extraction. Owns the auth.* schema and
// exposes AuthService over gRPC. Phase 2.1 (this commit) is just the
// boot skeleton; everything else arrives in subsequent commits.
//
// Mirror of services/notifications/src/server.ts structure: Fastify
// for /health/simple, gRPC server attached in Phase 2.3c, NATS
// publishers in Phase 2.4, gateway routing in Phase 2.5, cutover in
// Phase 2.6.

import { createLogger } from '@adopt-dont-shop/observability';
import Fastify, { type FastifyInstance } from 'fastify';

import type { AuthConfig } from './config.js';

export type CreateServerOptions = {
  config: AuthConfig;
  // Optional logger injection — tests pass a quiet logger so the
  // suite output stays readable. Real boot uses createLogger so the
  // service emits structured lines through the same pipeline as the
  // rest of the stack.
  logger?: ReturnType<typeof createLogger>;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  const { config } = opts;
  const logger = opts.logger ?? createLogger({ serviceName: 'service.auth' });

  // Disable Fastify's built-in pino — winston handles service-level
  // lines (boot, shutdown, error handler), and OTel's HTTP
  // auto-instrumentation already covers per-request spans. Same
  // shape as services/notifications + services/gateway.
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

  // Health endpoint — matches the rest of the stack's
  // `/health/simple` path so the existing Docker compose healthcheck
  // pattern picks this service up unchanged.
  server.get('/health/simple', async () => ({
    status: 'ok',
    service: 'service.auth',
    environment: config.environment,
  }));

  return server;
};

export type { AuthConfig };
