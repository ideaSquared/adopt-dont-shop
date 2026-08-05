// Shared Fastify HTTP server for gRPC microservices.
//
// Provides:
//   - /health/simple — returns 503 {status:'starting'} until isReady()
//     returns true, then 200 {status:'ok', service, environment}.
//   - /metrics        — Prometheus scrape endpoint.
//   - x-request-id   — echoed on every response.
//   - Error handler   — logs + returns {error:'internal_error'}.

import { createLogger, registerMetrics, registerRequestId } from '@adopt-dont-shop/observability';
import Fastify, { type FastifyInstance } from 'fastify';

import { registerReadinessRoute, type ReadinessDeps } from './readiness.js';

export type CreateServerConfig = {
  environment: string;
};

export type CreateServerOptions = {
  serviceName: string;
  config: CreateServerConfig;
  logger?: ReturnType<typeof createLogger>;
  // Liveness gate — /health/simple returns 503 until this returns true.
  // Defaults to () => true so call-sites that don't gate on gRPC readiness
  // compile unchanged.
  isReady?: () => boolean;
  // Downstream dependencies probed by /health/ready (DB/NATS/Redis). Omitted
  // dependencies are not probed; omitting the whole object leaves /health/ready
  // answering 200 with no checks (liveness-equivalent).
  readiness?: ReadinessDeps;
};

export const createMicroserviceServer = (opts: CreateServerOptions): FastifyInstance => {
  const { serviceName, config } = opts;
  const logger = opts.logger ?? createLogger({ serviceName });
  const isReady = opts.isReady ?? (() => true);

  // Disable Fastify's built-in pino — winston handles service-level lines
  // (boot, shutdown, error handler) and OTel's HTTP auto-instrumentation
  // covers per-request spans. Same shape as all extracted services.
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

  // Prometheus /metrics + http_request_duration_seconds onResponse hook.
  registerMetrics(server);

  // Liveness — returns 503 until the gRPC server has bound (isReady probe),
  // then the normal 200 payload. Deliberately does NOT reflect downstream
  // health; that is /health/ready's job.
  server.get('/health/simple', async (_req, reply) => {
    if (!isReady()) {
      return reply.status(503).send({ status: 'starting' });
    }
    return { status: 'ok', service: serviceName, environment: config.environment };
  });

  // Readiness — actively probes DB/NATS/Redis and returns 503 when any
  // configured dependency is unreachable.
  registerReadinessRoute(server, {
    serviceName,
    environment: config.environment,
    deps: opts.readiness ?? {},
    logger,
  });

  return server;
};
