// Shared Fastify HTTP server for gRPC microservices.
//
// Provides:
//   - /health/simple — returns 503 {status:'starting'} until isReady()
//     returns true, then 200 {status:'ok', service, environment}.
//   - /metrics        — Prometheus scrape endpoint.
//   - x-request-id   — echoed on every response.
//   - Error handler   — logs + returns {error:'internal_error'}.

import { readSecret } from '@adopt-dont-shop/config-secrets';
import {
  createLogger,
  initializeSentry,
  registerMetrics,
  registerRequestId,
} from '@adopt-dont-shop/observability';
import Fastify, { type FastifyInstance } from 'fastify';

import { registerReadinessRoute, type ReadinessDeps } from './readiness.js';

// ADS-1327: optional shared secret gating /metrics behind
// `Authorization: Bearer <token>`, mirroring the gateway's own
// METRICS_BEARER_TOKEN gate (services/gateway/src/config.ts) so every
// service that boots through createMicroserviceServer can opt in too.
// Absence is fine (returns undefined — /metrics stays public, the existing
// accepted-risk default); a present-but-too-short value fails boot, because
// a weak shared secret is offline-brute-forceable (ADS-845 precedent).
const readOptionalMetricsBearerToken = (env: NodeJS.ProcessEnv): string | undefined => {
  const value = readSecret('METRICS_BEARER_TOKEN', env)?.trim();
  if (!value) {
    return undefined;
  }
  if (Buffer.byteLength(value, 'utf8') < 16) {
    throw new Error('METRICS_BEARER_TOKEN must be at least 16 bytes');
  }
  return value;
};

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

export const createMicroserviceServer = (
  opts: CreateServerOptions,
  env: NodeJS.ProcessEnv = process.env
): FastifyInstance => {
  const { serviceName, config } = opts;
  const logger = opts.logger ?? createLogger({ serviceName });
  const isReady = opts.isReady ?? (() => true);
  const metricsBearerToken = readOptionalMetricsBearerToken(env);

  // ADS-1041: initialize backend error tracking (GlitchTip/Sentry SDK). No-op
  // unless SENTRY_DSN is set AND NODE_ENV is production/staging, so it's safe to
  // call unconditionally at boot — this is the call site the SDK was missing.
  initializeSentry({ serviceName, logger });

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
  registerMetrics(server, { bearerToken: metricsBearerToken });

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
