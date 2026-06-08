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
import type { ApplicationsClient } from './grpc-clients/applications-client.js';
import type { AuditClient } from './grpc-clients/audit-client.js';
import type { AuthClient } from './grpc-clients/auth-client.js';
import type { ChatClient } from './grpc-clients/chat-client.js';
import type { MatchingClient } from './grpc-clients/matching-client.js';
import type { ModerationClient } from './grpc-clients/moderation-client.js';
import type { NotificationsClient } from './grpc-clients/notifications-client.js';
import type { PetsClient } from './grpc-clients/pets-client.js';
import type { RescueClient } from './grpc-clients/rescue-client.js';
import { registerAuthenticate } from './middleware/authenticate.js';
import { registerApplicationDocumentsRoutes } from './routes/application-documents.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerApplicationsRoutes } from './routes/applications.js';
import { registerAuditRoutes } from './routes/audit.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerConfigRoutes } from './routes/config.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerDevicesRoutes } from './routes/devices.js';
import { registerEmailRoutes } from './routes/email.js';
import { registerLegalRoutes } from './routes/legal.js';
import { registerMatchingRoutes } from './routes/matching.js';
import { registerModerationAdminRoutes } from './routes/moderation-admin.js';
import { registerSupportRoutes } from './routes/support.js';
import { registerModerationRoutes } from './routes/moderation.js';
import { registerNotificationsRoutes } from './routes/notifications.js';
import { registerPetsRoutes } from './routes/pets.js';
import { registerRescueRoutes } from './routes/rescue.js';
import { registerRescuesPublicRoutes } from './routes/rescues-public.js';
import { registerSessionsRoutes } from './routes/sessions.js';
import { registerStaffFosterRoutes } from './routes/staff-foster.js';
import { registerUploadsRoutes } from './routes/uploads.js';
import { registerUsersRoutes } from './routes/users.js';

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
  // gRPC client to service.pets — Phase 3.5 cuts /api/pets/* over to
  // this address. Same optional shape as the other clients.
  petsClient?: PetsClient;
  // gRPC client to service.rescue — Phase 4.5 cuts /api/rescue/* over
  // to this address. Same optional shape as the other clients.
  rescueClient?: RescueClient;
  // gRPC client to service.audit — Phase 10.5 cuts /api/audit/* over
  // to this address. Same optional shape as the other clients.
  auditClient?: AuditClient;
  // gRPC client to service.matching — Phase 9.5 cuts /api/matching/*
  // over to this address. Same optional shape as the other clients.
  matchingClient?: MatchingClient;
  // gRPC client to service.moderation — Phase 8.5 cuts
  // /api/moderation/* over to this address. Same optional shape.
  moderationClient?: ModerationClient;
  // gRPC client to service.applications — Phase 5.3d cuts
  // /api/applications/* over to this address. Same optional shape.
  applicationsClient?: ApplicationsClient;
  // gRPC client to service.chat — Phase 6.x cuts /api/v1/chats/* and
  // the message-level reaction endpoint over to this address. Same
  // optional shape.
  chatClient?: ChatClient;
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

  // Service-specific routes register at /api/v1/<domain> BEFORE the
  // catch-all proxy — Fastify's first-registered-wins prefix routing
  // picks them off before the catch-all sees the request.
  //
  // Each domain registers ONLY when (a) its gRPC client is wired and
  // (b) its per-domain cutover flag is on. The flag defaults off, so by
  // default these routes are NOT registered and /api/v1/* falls through
  // to the residual monolith — preserving today's behaviour. A domain
  // goes live only once its routes return a frontend-compatible shape
  // (ADR 0002). NOTE: the authenticate middleware above is independent
  // of cutover.auth and always runs; only the /api/v1/auth/* ROUTES are
  // gated here.
  const { cutover } = config;
  if (opts.authClient && cutover.auth) {
    await registerAuthRoutes(server, { client: opts.authClient });
    // /api/v1/sessions/* — list/revoke. Shares the auth cutover flag
    // because it's the same identity surface from the SPA's POV.
    await registerSessionsRoutes(server, { client: opts.authClient });
  }
  if (opts.notificationsClient && cutover.notifications) {
    await registerNotificationsRoutes(server, { client: opts.notificationsClient });
    // /api/v1/devices/* — register / list / unregister device tokens.
    // Reuses the same notifications gRPC client (device token RPCs
    // ship in @adopt-dont-shop/proto.NotificationsV1).
    await registerDevicesRoutes(server, { client: opts.notificationsClient });
    // /api/v1/email/templates/* — admin email-template CRUD. The
    // email_templates table is owned by service.notifications.
    await registerEmailRoutes(server, { client: opts.notificationsClient });
  }
  // /api/v1/users/* — profile + composed preferences. Requires BOTH
  // auth (profile + privacy prefs) and notifications (in-app channel
  // prefs) cutover so the unified GET /preferences can compose without
  // partial data.
  if (opts.authClient && opts.notificationsClient && cutover.auth && cutover.notifications) {
    await registerUsersRoutes(server, {
      authClient: opts.authClient,
      notificationsClient: opts.notificationsClient,
    });
  }
  if (opts.petsClient && cutover.pets) {
    await registerPetsRoutes(server, { client: opts.petsClient });
  }
  if (opts.rescueClient && cutover.rescue) {
    await registerRescueRoutes(server, { client: opts.rescueClient });
    // SPA-facing surface at /api/v1/rescues/* (plural — the path
    // lib.rescue actually calls).
    await registerRescuesPublicRoutes(server, { client: opts.rescueClient });
    // Staff / foster / invitation-read surface (/api/v1/staff/*,
    // /api/v1/foster/*, GET /api/v1/invitations/details/:token).
    await registerStaffFosterRoutes(server, { client: opts.rescueClient });
  }
  if (opts.auditClient && cutover.audit) {
    await registerAuditRoutes(server, { client: opts.auditClient });
  }
  if (opts.matchingClient && cutover.matching) {
    await registerMatchingRoutes(server, { client: opts.matchingClient });
  }
  if (opts.moderationClient && cutover.moderation) {
    await registerModerationRoutes(server, { client: opts.moderationClient });
    // SPA-facing surface at /api/v1/admin/{moderation,support}/* with
    // frontend-shape envelopes (lib.moderation, lib.support-tickets).
    await registerModerationAdminRoutes(server, { client: opts.moderationClient });
    // User-facing /api/v1/support/* — adopters opening + replying to
    // their own tickets. Handlers self-scope by principal.userId.
    await registerSupportRoutes(server, { client: opts.moderationClient });
  }
  // Multipart support is a prerequisite for any route that accepts a
  // file upload (image staging, application docs). Register it once
  // here; @fastify/multipart errors if registered twice, and routes that
  // don't use it pay no runtime cost. The gateway-only `maxFileSize`
  // field is stripped before passing the rest to @adopt-dont-shop/storage
  // (which doesn't carry it).
  const { default: multipart } = await import('@fastify/multipart');
  await server.register(multipart, {
    limits: { fileSize: config.storage.maxFileSize, files: 1 },
  });
  const {
    maxFileSize: _ignoredMax,
    signingSecret: _ignoredSecret,
    ...storageConfig
  } = config.storage;
  void _ignoredMax;
  void _ignoredSecret;

  // /api/v1/uploads/images — staged image upload. Pure gateway: bytes
  // go to @adopt-dont-shop/storage, no upstream service. The matching
  // signed-serve route mounts at /uploads-signed/* (also gateway-only).
  await registerUploadsRoutes(server, {
    storage: storageConfig,
    signingSecret: config.storage.signingSecret,
  });

  if (opts.applicationsClient && cutover.applications) {
    await registerApplicationsRoutes(server, { client: opts.applicationsClient });
    // Application document routes (multipart upload → storage → AddDocument).
    await registerApplicationDocumentsRoutes(server, {
      client: opts.applicationsClient,
      storage: storageConfig,
    });
  }
  if (opts.chatClient && cutover.chat) {
    await registerChatRoutes(server, { client: opts.chatClient });
  }
  // /api/v1/dashboard/* — cross-service composition (pets stats + apps
  // stats + rescue staff count + recent pet/application activity). Only
  // registers when ALL three backing services have a wired client AND
  // are cutover, so partial-cutover envs don't return half-empty data.
  if (
    opts.petsClient &&
    opts.applicationsClient &&
    opts.rescueClient &&
    cutover.pets &&
    cutover.applications &&
    cutover.rescue
  ) {
    await registerDashboardRoutes(server, {
      petsClient: opts.petsClient,
      applicationsClient: opts.applicationsClient,
      rescueClient: opts.rescueClient,
    });
  }

  // Gateway-folded surface — no upstream service required, no cutover
  // flag. Per the plan: "CMS / legal / config — small static reads fold
  // into service.gateway". CMS extraction itself is deferred (full DB
  // schema + admin CRUD); legal markdown + public config land here.
  if (config.legal.enabled) {
    await registerLegalRoutes(server, { docsDir: config.legal.docsDir });
  }
  if (config.config.publicEnabled) {
    await registerConfigRoutes(server);
  }
  // Analytics ingestion (pageviews + custom events) — the monolith
  // implementation was log-only (winston → Loki, no DB). Folds here so
  // the SPA's analytics flushes don't pay an extra http-proxy hop.
  await registerAnalyticsRoutes(server, { logger });

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
