// services/applications — Phase 5 extraction. Owns the applications.*
// schema and exposes ApplicationService over gRPC.
//
// This is the EVENT-SOURCED vertical — CAD Phase 2 equivalent. The
// state machine (draft → submitted → under_review → home_visit_scheduled
// → home_visit_completed → approved | rejected | withdrawn → adopted)
// drives multiple downstream consumers (notifications, moderation,
// audit), and "how did we get here?" is a real product question for
// adopters and rescue staff. Pure apply/fold domain + Postgres event
// store + publish-after-commit.
//
// Phase 5.1 (this commit) is just the boot skeleton; the event-sourced
// domain (5.2), persistence + gRPC (5.3), notification subscribers
// (5.4), gateway routing (5.5), and cutover (5.6) arrive in subsequent
// commits.

import { createLogger, registerMetrics, registerRequestId } from '@adopt-dont-shop/observability';
import Fastify, { type FastifyInstance } from 'fastify';

import type { ApplicationsConfig } from './config.js';

export type CreateServerOptions = {
  config: ApplicationsConfig;
  // Optional logger injection — tests pass a quiet logger so the
  // suite output stays readable. Real boot uses createLogger so the
  // service emits structured lines through the same pipeline as the
  // rest of the stack.
  logger?: ReturnType<typeof createLogger>;
  // Readiness probe — /health/simple returns 503 until this returns
  // true. Defaults to () => true so existing call-sites compile
  // unchanged. index.ts flips a local boolean after gRPC binds.
  isReady?: () => boolean;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  const { config } = opts;
  const logger = opts.logger ?? createLogger({ serviceName: 'service.applications' });
  const isReady = opts.isReady ?? (() => true);

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
  // pattern picks this service up unchanged. Returns 503 until the
  // gRPC server has bound (isReady probe), then the normal 200 payload.
  server.get('/health/simple', async (_req, reply) => {
    if (!isReady()) {
      return reply.status(503).send({ status: 'starting' });
    }
    return { status: 'ok', service: 'service.applications', environment: config.environment };
  });

  return server;
};

export type { ApplicationsConfig };
