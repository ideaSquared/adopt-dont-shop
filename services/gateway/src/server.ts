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
import type { AuthClient } from './grpc-clients/auth-client.js';
import type { NotificationsClient } from './grpc-clients/notifications-client.js';
import { registerAuthenticate } from './middleware/authenticate.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerNotificationsRoutes } from './routes/notifications.js';

export type CreateServerOptions = {
  config: GatewayConfig;
  // Optional logger injection — tests pass a quiet logger so the
  // suite output stays readable. Real boot uses createLogger so the
  // service emits structured lines through the same pipeline as the
  // rest of the stack.
  logger?: ReturnType<typeof createLogger>;
  // gRPC client to service.notifications. Optional so smoke tests
  // that only exercise /health/simple don't have to wire the gRPC
  // transport — when omitted, /api/notifications/* falls through to
  // the catch-all proxy (i.e. still hits the monolith). Real boot
  // always supplies it from index.ts.
  notificationsClient?: NotificationsClient;
  // gRPC client to service.auth — wires the authenticate middleware
  // (Phase 2.5). Optional for the same reason as notificationsClient:
  // smoke tests against /health/simple don't need the gRPC transport.
  // When omitted, the middleware doesn't register and the gateway
  // continues to trust client-supplied x-user-* headers (the Phase 1.5
  // dev-mode behaviour). Real boot ALWAYS supplies it from index.ts.
  authClient?: AuthClient;
};

export const createServer = async (opts: CreateServerOptions): Promise<FastifyInstance> => {
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

  // Authentication middleware runs as an onRequest hook on EVERY
  // request, BEFORE any route or the catch-all proxy. The order
  // matters: spoofable identity headers get stripped here, so even a
  // request that ends up at the catch-all proxy can't carry forged
  // x-user-* headers to the monolith.
  if (opts.authClient) {
    await registerAuthenticate(server, { authClient: opts.authClient, logger });
  }

  // Service-specific routes register BEFORE the catch-all proxy.
  // Fastify's first-registered-wins prefix routing picks them off
  // before the catch-all sees the request.
  //
  // Phase 2.6: /api/auth/* now lands here instead of the monolith.
  // The authClient is re-used from the authenticate middleware so
  // we don't open a second gRPC channel for the same upstream.
  if (opts.authClient) {
    await registerAuthRoutes(server, { client: opts.authClient });
  }
  if (opts.notificationsClient) {
    await registerNotificationsRoutes(server, { client: opts.notificationsClient });
  }

  // Catch-all proxy. Phase 0f shipped this; Phase 1.6 leaves it in
  // place for every /api/* path that isn't owned by an extracted
  // service yet. Decommissions at Phase 11 when the monolith is gone.
  await server.register(httpProxy, {
    upstream: config.upstreamBackendUrl,
    prefix: '/api',
    rewritePrefix: '/api',
    // Disable WS proxying. The gateway terminates Socket.IO itself —
    // handing that to http-proxy would couple us to the monolith's
    // socket lifecycle when we want the opposite.
    websocket: false,
    http2: false,
  });

  return server;
};

export type { GatewayConfig };
