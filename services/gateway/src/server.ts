// services/gateway — BFF for the microservices migration.
//
// As of Phase 11, the residual service.backend monolith has been
// deleted. The gateway is now the single REST surface, fanning out to
// the extracted services via gRPC:
//   - /api/v1/auth/*          → service.auth
//   - /api/v1/users/*         → service.auth (admin user mgmt)
//   - /api/v1/sessions/*      → service.auth
//   - /api/v1/field-permissions/* → service.auth
//   - /api/v1/users/me/erasure-request → service.audit (GDPR saga)
//   - /api/v1/pets/*          → service.pets
//   - /api/v1/rescues/*       → service.rescue (+ /staff, /foster, /invitations)
//   - /api/v1/applications/*  → service.applications
//   - /api/v1/chats/*         → service.chat
//   - /api/v1/notifications/* → service.notifications (+ /devices, /email)
//   - /api/v1/moderation/*    → service.moderation (+ /support, /admin)
//   - /api/v1/matching/*      → service.matching
//   - /api/v1/cms/*           → service.cms
//   - /api/v1/audit/*         → service.audit (+ /reports)
// Gateway-folded surface (no upstream service):
//   - /api/v1/legal/*, /api/v1/config, /api/v1/analytics
//   - /api/v1/dashboard       (cross-service composition)
//   - /api/v1/uploads/*       (multipart + signed serve)
// Anything else under /api/* now returns 404 — there's no fallback.

import {
  createLogger,
  getMetricsRegistry,
  registerMetrics,
  registerRequestId,
} from '@adopt-dont-shop/observability';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import { Counter } from 'prom-client';

import type { GatewayConfig } from './config.js';
import type { ApplicationsClient } from './grpc-clients/applications-client.js';
import type { AuditClient } from './grpc-clients/audit-client.js';
import type { AuthClient } from './grpc-clients/auth-client.js';
import type { ChatClient } from './grpc-clients/chat-client.js';
import type { CmsClient } from './grpc-clients/cms-client.js';
import type { MatchingClient } from './grpc-clients/matching-client.js';
import type { ModerationClient } from './grpc-clients/moderation-client.js';
import type { NotificationsClient } from './grpc-clients/notifications-client.js';
import type { PetsClient } from './grpc-clients/pets-client.js';
import type { RescueClient } from './grpc-clients/rescue-client.js';
import { registerAuthenticate } from './middleware/authenticate.js';
import { createEmailRateLimiter } from './routes/email-rate-limiter.js';
import { registerApplicationDocumentsRoutes } from './routes/application-documents.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerApplicationsRoutes } from './routes/applications.js';
import { registerAuditRoutes } from './routes/audit.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerCmsRoutes } from './routes/cms.js';
import { registerConfigRoutes } from './routes/config.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerDevicesRoutes } from './routes/devices.js';
import { registerBroadcastRoutes } from './routes/broadcast.js';
import { registerEmailRoutes } from './routes/email.js';
import { registerFieldPermissionsRoutes } from './routes/field-permissions.js';
import { registerGdprRoutes } from './routes/gdpr.js';
import { registerLegalRoutes } from './routes/legal.js';
import { registerMatchingRoutes } from './routes/matching.js';
import { registerModerationAdminRoutes } from './routes/moderation-admin.js';
import { registerSupportRoutes } from './routes/support.js';
import { registerModerationRoutes } from './routes/moderation.js';
import { registerNotificationsRoutes } from './routes/notifications.js';
import { registerPetsRoutes } from './routes/pets.js';
import { registerReportsRoutes } from './routes/reports.js';
import { registerRescueRoutes } from './routes/rescue.js';
import { registerRescuesPublicRoutes } from './routes/rescues-public.js';
import { registerSessionsRoutes } from './routes/sessions.js';
import { registerStaffFosterRoutes } from './routes/staff-foster.js';
import { registerTestTokenPeekRoutes } from './routes/test-token-peek.js';
import { registerUploadsRoutes } from './routes/uploads.js';
import { registerUsersRoutes } from './routes/users.js';

// ---------------------------------------------------------------------------
// Rate-limit Prometheus counter — lazily created and registered into the
// same local registry that getMetricsRegistry()/registerMetrics() uses.
//
// We call getOrCreateRateLimitCounter() once per createServer invocation.
// It checks whether the registry instance has changed (e.g. after
// __resetMetricsForTest() in Vitest suites) before creating a new counter,
// so repeated createServer calls in tests don't throw "metric already
// registered" errors.
// ---------------------------------------------------------------------------

// Pair of (registry, counter) so we detect when the registry is replaced.
let _counterEntry: { registryRef: object; counter: Counter<'route'> } | null = null;

const getOrCreateRateLimitCounter = (): Counter<'route'> => {
  const reg = getMetricsRegistry();
  if (_counterEntry && _counterEntry.registryRef === reg) {
    return _counterEntry.counter;
  }
  const counter = new Counter({
    name: 'gateway_rate_limit_hits_total',
    help: 'Total number of rate-limited (429) requests, labelled by route.',
    labelNames: ['route'] as const,
    registers: [reg],
  });
  _counterEntry = { registryRef: reg, counter };
  return counter;
};

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
  // gRPC client to service.cms. Same optional shape — when omitted,
  // /api/v1/cms/* falls through to the catch-all proxy.
  cmsClient?: CmsClient;
  // NATS connection used by the GDPR erasure-request route to publish
  // `gdpr.erasureRequested`. Optional in tests; when omitted the route
  // is skipped (falls through to the catch-all proxy, which means
  // erasure is monolith-owned).
  nats?: import('nats').NatsConnection;
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

  // Security headers (defence-in-depth alongside nginx). CSP is omitted
  // here because nginx enforces a strict policy at the edge and Swagger
  // UI requires 'unsafe-inline' relaxation that would weaken that policy
  // for gateway-direct callers. All other Helmet defaults are applied.
  await server.register(helmet, { contentSecurityPolicy: false });

  // CORS — explicit allowed-origins list from config. nginx also handles
  // CORS at the edge; this layer protects direct-gateway scenarios
  // (internal load balancer, debug runs without nginx, etc.).
  await server.register(cors, {
    origin: config.cors?.origins ?? [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Request-id middleware runs FIRST so the id is on req for every
  // hook after it (including the metrics onResponse hook + the
  // authenticate hook, which forwards it on downstream gRPC metadata).
  registerRequestId(server);

  // Prometheus /metrics + http_request_duration_seconds onResponse
  // hook. Substrate only — no domain-specific instruments here.
  registerMetrics(server);

  // Prometheus counter — rate-limit rejections per route. Incremented
  // inside the plugin's onExceeded callback so every 429 is visible in
  // the /metrics surface without a separate middleware.
  // Registered into the same local registry that registerMetrics() serves
  // from so it appears at /metrics alongside the standard instruments.
  // We use getSingleton to avoid double-registration when createServer is
  // called multiple times in the same process (e.g. in Vitest suites).
  const rateLimitHitsTotal: Counter<'route'> = getOrCreateRateLimitCounter();

  // Global rate-limit plugin — applies a blanket cap to every route.
  // Per-route config.rateLimit blocks in auth.ts / uploads.ts override
  // the global max/timeWindow while inheriting the Redis store.
  //
  // Redis store: shared across replicas so the limit is N-replica-safe.
  // Degraded mode: if Redis is unreachable at boot (or dies later) the
  // plugin's skipOnError:true passes requests through using the in-memory
  // fallback. A warning is logged so ops teams can detect the degraded
  // state via log alerts.
  // Hoisted so the GDPR route can reuse the same client for idempotency keys.
  let rateLimitRedis: Redis | undefined;
  {
    if (config.rateLimit.redisUrl) {
      try {
        rateLimitRedis = new Redis(config.rateLimit.redisUrl, {
          // Do not block boot if Redis isn't up yet. The plugin's
          // skipOnError flag handles the in-flight failure case.
          connectTimeout: 2000,
          maxRetriesPerRequest: 0,
          lazyConnect: true,
          enableOfflineQueue: false,
        });
        rateLimitRedis.on('error', (err: Error) => {
          logger.warn('rate-limit Redis error — falling back to in-memory store', {
            message: err.message,
          });
        });
        // Attempt a connection so we know early whether Redis is reachable.
        await rateLimitRedis.connect().catch((err: Error) => {
          logger.warn('rate-limit Redis unreachable at boot — using in-memory store', {
            message: err.message,
          });
          rateLimitRedis = undefined;
        });
      } catch (err) {
        logger.warn('rate-limit Redis setup failed — using in-memory store', {
          message: (err as Error).message,
        });
        rateLimitRedis = undefined;
      }
    } else {
      logger.warn(
        'REDIS_URL not set — rate limiting uses in-memory store (not safe for multi-replica)'
      );
    }

    await server.register(rateLimit, {
      global: true,
      max: config.rateLimit.max,
      timeWindow: config.rateLimit.timeWindow,
      ...(rateLimitRedis ? { redis: rateLimitRedis } : {}),
      skipOnError: true,
      keyGenerator: req => req.ip,
      onExceeded: (_req, key) => {
        // `key` is the generated rate-limit key (ip or composite); the
        // route is resolved from routeOptions.url at hook time.
        const route = (_req.routeOptions?.url as string | undefined) ?? 'unknown';
        rateLimitHitsTotal.inc({ route });
        logger.warn('rate limit exceeded', { key, route });
      },
    });
  }

  // OpenAPI spec generation. Register @fastify/swagger BEFORE any route
  // plugins so it can collect their `schema` blocks as they register —
  // the plugin works by hooking onRoute, which only fires for routes
  // added AFTER registration. @fastify/swagger-ui mounts the human-
  // browsable UI at /docs and the machine-readable JSON at /openapi.json
  // (we override the default /documentation/json so external integrators
  // get a predictable URL).
  //
  // The Bearer security scheme is declared at the document level and
  // applied as the default `security` so the Swagger UI "Authorize"
  // button works. Public routes (login, register, health) override with
  // `security: []` in their per-route schema.
  //
  // /docs and /openapi.json stay open in this PR — the spec doesn't
  // reveal anything beyond the route URLs already visible in the
  // codebase. TODO: a follow-up may want to gate /docs behind admin
  // auth once we have an admin-only route group to lean on.
  const { default: swagger } = await import('@fastify/swagger');
  const { default: swaggerUi } = await import('@fastify/swagger-ui');
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'adopt-dont-shop gateway API',
        description:
          'REST surface for the adopt-dont-shop gateway. Fan-out routes proxy to ' +
          'extracted gRPC services; gateway-folded routes (legal, config, ' +
          'analytics, dashboard, uploads) are served in-process.',
        version: '1.0.0',
      },
      servers: [{ url: '/' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });
  await server.register(swaggerUi, {
    routePrefix: '/docs',
  });
  // Mirror the spec at the conventional /openapi.json path so external
  // integrators don't have to know about the swagger-ui-specific
  // /documentation/json URL.
  server.get('/openapi.json', async () => server.swagger());

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
    await registerAuthenticate(server, {
      authClient: opts.authClient,
      logger,
      principalSigningKey: config.principalSigningKey,
      // ADS-863: lets the auth hook resolve rescue-staff principals'
      // rescueId from the rescue service (when the rescue domain is wired).
      rescueClient: opts.rescueClient,
    });

    // Gate /docs behind admin role. This hook runs AFTER the authenticate
    // hook (hooks execute in registration order), so x-user-roles is
    // already stamped from the validated JWT by the time we check it.
    // /openapi.json stays open — it reveals only route URLs already
    // visible in the codebase and is needed for SDK generation tooling.
    server.addHook('onRequest', async (req, reply) => {
      if (!req.url.startsWith('/docs')) {
        return;
      }
      const rolesHeader = req.headers['x-user-roles'];
      const roles =
        typeof rolesHeader === 'string'
          ? rolesHeader
              .split(',')
              .map(r => r.trim())
              .filter(Boolean)
          : [];
      const isAdmin = roles.some(r => r === 'admin' || r === 'super_admin');
      if (!isAdmin) {
        return reply.code(403).send({ error: 'forbidden' });
      }
    });
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
  // Per-email rate limiter for the auth surface (ADS-844). Layered on top of
  // the per-IP @fastify/rate-limit cap to throttle an email-flood spread across
  // many IPs. Reuses the rate-limit Redis store when available so the cap is
  // N-replica-safe; otherwise an in-memory per-replica counter. ~5/min/email.
  const emailRateLimiter = createEmailRateLimiter({
    max: 5,
    windowMs: 60_000,
    redis: rateLimitRedis,
  });

  const { cutover } = config;
  if (opts.authClient && cutover.auth) {
    await registerAuthRoutes(server, { client: opts.authClient, emailRateLimiter });
    // /api/v1/sessions/* — list/revoke. Shares the auth cutover flag
    // because it's the same identity surface from the SPA's POV.
    await registerSessionsRoutes(server, { client: opts.authClient });
    // /api/v1/field-permissions/* — admin surface. Backed entirely by
    // service.auth (which owns the field_permissions table + lib.types
    // defaults). Shares the auth cutover flag.
    await registerFieldPermissionsRoutes(server, { client: opts.authClient });
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
    // /api/v1/notifications/broadcast — admin fan-out. Sits under the
    // notifications cutover gate (the upstream call lives in service.
    // notifications, which in turn calls service.auth for the cohort).
    await registerBroadcastRoutes(server, { client: opts.notificationsClient });
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
    // /api/v1/reports/* — saved reports + templates. Owned by
    // service.audit (same gRPC stub). Shares the audit cutover flag
    // because the audit service ships the rows.
    await registerReportsRoutes(server, { client: opts.auditClient });
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
  if (opts.cmsClient && cutover.cms) {
    await registerCmsRoutes(server, { client: opts.cmsClient });
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

  // GDPR erasure-request route — only enabled when NATS is wired (real
  // boot always wires it; smoke tests that mount only /health/simple
  // skip). When unwired the route doesn't register, which means
  // /api/v1/users/me/erasure-request falls through to the catch-all
  // proxy → monolith, preserving today's behaviour.
  if (opts.nats) {
    await registerGdprRoutes(server, {
      nats: opts.nats,
      auditClient: opts.auditClient,
      authClient: opts.authClient,
      redis: rateLimitRedis,
    });
  }

  // TEST-ONLY token-peek seam (ADS-871). Lets the e2e suite read one-time
  // reset/verification/invitation tokens normally only delivered by email.
  // Registers ONLY when E2E_TOKEN_PEEK=true AND a DATABASE_URL is wired, and
  // loadConfig() refuses to enable it under NODE_ENV=production — so it is
  // impossible to reach in prod. See routes/test-token-peek.ts.
  if (config.testTokenPeek.enabled && config.testTokenPeek.databaseUrl) {
    await registerTestTokenPeekRoutes(server, {
      databaseUrl: config.testTokenPeek.databaseUrl,
    });
    logger.warn(
      'test-token-peek seam ENABLED — /api/v1/test/* exposes one-time auth tokens (e2e only)'
    );
  }

  // Phase 11: the residual monolith has been deleted, so the catch-all
  // proxy is gone with it. Any /api/* path the gateway doesn't explicitly
  // own now 404s rather than silently round-tripping bytes to a backend
  // that doesn't exist.
  server.get('/api/*', async (_req, reply) => reply.code(404).send({ error: 'not_found' }));
  server.post('/api/*', async (_req, reply) => reply.code(404).send({ error: 'not_found' }));
  server.put('/api/*', async (_req, reply) => reply.code(404).send({ error: 'not_found' }));
  server.patch('/api/*', async (_req, reply) => reply.code(404).send({ error: 'not_found' }));
  server.delete('/api/*', async (_req, reply) => reply.code(404).send({ error: 'not_found' }));

  return server;
};

export type { GatewayConfig };
