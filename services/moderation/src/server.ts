// services/moderation — Phase 8 extraction. Owns the moderation.*
// schema and exposes ModerationService over gRPC. Cross-cutting reads
// via gRPC; consumes events (chat.messageCreated, pets.created,
// applications.submitted) for content scanning + auto-report triggers.
//
// Phase 8.1 (this commit) is just the boot skeleton; schema (8.2),
// gRPC (8.3), NATS subscribers (8.4), gateway routing (8.5), and
// cutover (8.6) arrive in subsequent commits.

import { createLogger, registerMetrics, registerRequestId } from '@adopt-dont-shop/observability';
import Fastify, { type FastifyInstance } from 'fastify';

import type { ModerationConfig } from './config.js';

export type CreateServerOptions = {
  config: ModerationConfig;
  logger?: ReturnType<typeof createLogger>;
  // Readiness probe — /health/simple returns 503 until this returns
  // true. Defaults to () => true so existing call-sites compile
  // unchanged. index.ts flips a local boolean after gRPC binds.
  isReady?: () => boolean;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  const { config } = opts;
  const logger = opts.logger ?? createLogger({ serviceName: 'service.moderation' });
  const isReady = opts.isReady ?? (() => true);

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

  // Health endpoint — returns 503 until the gRPC server has bound
  // (isReady probe), then the normal 200 payload.
  server.get('/health/simple', async (_req, reply) => {
    if (!isReady()) {
      return reply.status(503).send({ status: 'starting' });
    }
    return { status: 'ok', service: 'service.moderation', environment: config.environment };
  });

  return server;
};

export type { ModerationConfig };
