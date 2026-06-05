// services/gateway — BFF for the microservices migration.
//
// Phase 0f role (strangler-fig start): a thin reverse proxy that routes
// every /api/* path through to the residual service.backend monolith.
// Once the gateway is in front of nginx, the public api.localhost host
// terminates here, and adding routes for extracted services becomes a
// per-PR concern instead of an nginx config wrestle.
//
// Future phases register service-specific Fastify plugins BEFORE the
// catch-all proxy below, so:
//   - /api/auth/*         → service.auth        (Phase 2)
//   - /api/applications/* → service.applications (Phase 5)
//   - /api/chat/*         → service.chat        (Phase 6)
//   - /api/*              → service.backend     (residual; deletes at Phase 11)
// Fastify's plugin precedence (first-registered-wins for the same prefix)
// makes that the simplest extraction unit.

import httpProxy from '@fastify/http-proxy';
import { createLogger } from '@adopt-dont-shop/observability';
import Fastify, { type FastifyInstance } from 'fastify';

import type { GatewayConfig } from './config.js';

export type CreateServerOptions = {
  config: GatewayConfig;
  // Optional logger injection — tests pass a quiet logger so the
  // suite output stays readable. Real boot uses createLogger so the
  // service emits structured lines through the same pipeline as the
  // rest of the stack.
  logger?: ReturnType<typeof createLogger>;
};

export const createServer = (opts: CreateServerOptions): FastifyInstance => {
  const { config } = opts;
  const logger = opts.logger ?? createLogger({ serviceName: 'service.gateway' });

  // Fastify's built-in pino logger is disabled — we route service-level
  // lines (boot, shutdown, errors) through our winston logger directly.
  // Per-request access logging lands when we wire onRequest/onResponse
  // hooks for routes that need it; pino's everything-by-default would
  // double-log on top of the OTel auto-instrumentation.
  const server = Fastify({
    logger: false,
    // Trust the proxy chain in front of us (nginx) so request.ip is the
    // real client, not the loopback. Required for any future rate
    // limiting / IP-rule middleware to gate on the right address.
    trustProxy: true,
  });

  // Tag every error that escapes a route — the only winston call site
  // in this thin pass-through phase. Per-route logging arrives when
  // we add real routes in Phase 1+.
  server.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    logger.error('request failed', {
      method: req.method,
      url: req.url,
      message: err.message,
    });
    void reply.status(err.statusCode ?? 500).send({ error: 'internal_error' });
  });

  // Health endpoint — matches service.backend's `/health/simple` path
  // so the Docker compose healthcheck (already wired in the broader
  // stack) Just Works once the gateway is added.
  server.get('/health/simple', async () => ({
    status: 'ok',
    service: 'service.gateway',
    environment: config.environment,
  }));

  // Catch-all proxy. Phase 0f is intentionally dumb — every /api/*
  // path goes to the residual monolith. Phase 1+ adds per-prefix
  // service routes BEFORE this registration so first-registered-wins
  // routes them out before the catch-all sees them.
  server.register(httpProxy, {
    upstream: config.upstreamBackendUrl,
    prefix: '/api',
    rewritePrefix: '/api',
    // Disable WS proxying for now. service.notifications (Phase 1)
    // will own the WS spine and the gateway will terminate the
    // socket itself — handing that responsibility to http-proxy
    // would couple the gateway to the monolith's socket lifecycle
    // when we want the opposite.
    websocket: false,
    http2: false,
  });

  return server;
};

export type { GatewayConfig };
