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
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
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
import { registerCsrfProtection } from './middleware/csrf.js';
import { createEmailRateLimiter } from './routes/email-rate-limiter.js';
import { registerApplicationDocumentsRoutes } from './routes/application-documents.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerAnalyticsMetricsRoutes } from './routes/analytics-metrics.js';
import { registerAdminAnalyticsRoutes } from './routes/admin-analytics.js';
import { registerApplicationsRoutes } from './routes/applications.js';
import { registerAuditRoutes } from './routes/audit.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerCmsRoutes } from './routes/cms.js';
import { registerConfigRoutes } from './routes/config.js';
import { registerCsrfRoutes } from './routes/csrf.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerDevicesRoutes } from './routes/devices.js';
import { registerBroadcastRoutes } from './routes/broadcast.js';
import { registerEmailRoutes } from './routes/email.js';
import { registerEntityActivityRoutes } from './routes/entity-activity.js';
import { registerFieldPermissionsRoutes } from './routes/field-permissions.js';
import { registerGdprRoutes } from './routes/gdpr.js';
import { registerLegalRoutes } from './routes/legal.js';
import { registerMatchingRoutes } from './routes/matching.js';
import { registerAdminInboxRoutes } from './routes/admin-inbox.js';
import { registerModerationAdminRoutes } from './routes/moderation-admin.js';
import { registerSupportRoutes } from './routes/support.js';
import { registerModerationRoutes } from './routes/moderation.js';
import { registerNotificationsRoutes } from './routes/notifications.js';
import { registerPetsRoutes } from './routes/pets.js';
import { registerPrivacyRoutes } from './routes/privacy.js';
import { registerReportsRoutes } from './routes/reports.js';
import { registerRescueRoutes } from './routes/rescue.js';
import { registerInvitationAcceptRoutes } from './routes/invitation-accept.js';
import { registerRescuesPublicRoutes } from './routes/rescues-public.js';
import { registerRescueAdminRoutes } from './routes/rescue-admin.js';
import { registerSecurityRoutes } from './routes/security.js';
import { registerSessionsRoutes } from './routes/sessions.js';
import { registerEventRoutes } from './routes/events.js';
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

// Login per-email rate-limit trip counter (ADS-916). Same lazily-created,
// registry-change-aware singleton pattern as getOrCreateRateLimitCounter
// above, so ops can distinguish a real credential-stuffing wave (many trips)
// from noise.
let _loginEmailCounterEntry: { registryRef: object; counter: Counter } | null = null;

const getOrCreateLoginEmailRateLimitCounter = (): Counter => {
  const reg = getMetricsRegistry();
  if (_loginEmailCounterEntry && _loginEmailCounterEntry.registryRef === reg) {
    return _loginEmailCounterEntry.counter;
  }
  const counter = new Counter({
    name: 'gateway_login_email_ratelimit_trips_total',
    help: 'Total number of login attempts rejected by the per-email rate limit (ADS-916).',
    registers: [reg],
  });
  _loginEmailCounterEntry = { registryRef: reg, counter };
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
    // Trust exactly ONE hop of X-Forwarded-For — nginx, the only proxy
    // between the public internet and this service (gateway:4000 is not
    // published to the host; see docker-compose.prod.yml `expose`). request.ip
    // then resolves to the value nginx itself sets on XFF (deploy/gateway/
    // nginx.conf overwrites it with $remote_addr — see ADS-915), not
    // whatever a client sends. `trustProxy: true` (trust the WHOLE header,
    // unbounded) let a client-supplied XFF prefix pass straight through and
    // rotate req.ip on every request, bypassing every per-IP rate limiter
    // (login brute-force, GDPR spam) — ADS-915.
    trustProxy: 1,
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
  // (internal load balancer, debug runs without nginx, etc.). loadConfig
  // fails closed in production/staging when CORS_ORIGIN is unset (ADS-967),
  // so logging the effective allowlist here lets operators confirm at
  // boot that it isn't the localhost dev fallback.
  logger.info('cors allowlist configured', { origins: config.cors?.origins ?? [] });
  await server.register(cors, {
    origin: config.cors?.origins ?? [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Cookie support (ADS-919 Phase 0). No signing secret — the CSRF
  // double-submit cookie doesn't need one (its security comes from
  // same-origin JS being the only thing that can read a non-HttpOnly
  // cookie AND set a custom header in the same request), and nothing
  // else sets cookies yet. A later phase that adds HttpOnly auth cookies
  // can register signed cookies with a secret at that point.
  await server.register(cookie);

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

  // CSRF double-submit-cookie protection (ADS-919 Phase 0). Registered
  // unconditionally (no gRPC client dependency) and safe to add globally:
  // see middleware/csrf.ts's module comment for the enforcement scope —
  // it only rejects a state-changing request that already carries the
  // csrfToken cookie, so no existing route or test that doesn't fetch
  // GET /api/v1/csrf-token first is affected.
  registerCsrfProtection(server, { logger });

  // GET /api/v1/csrf-token — issues the double-submit cookie. Public,
  // gateway-folded (no upstream service), same shape as /api/v1/config.
  await registerCsrfRoutes(server);

  // Service-specific routes register at /api/v1/<domain> BEFORE the
  // unmatched-route 404 handler — Fastify's first-registered-wins prefix
  // routing picks them off before the catch-all sees the request.
  //
  // Each domain registers when its gRPC client is wired. If a service's
  // client is not configured (e.g. a partial test harness, or a service
  // that hasn't come up), its routes are skipped and those paths fall to
  // the 404 handler. There is no monolith fall-through — the gateway is
  // the single REST surface.
  // Per-email rate limiter for the auth surface (ADS-844). Layered on top of
  // the per-IP @fastify/rate-limit cap to throttle an email-flood spread across
  // many IPs. Reuses the rate-limit Redis store when available so the cap is
  // N-replica-safe; otherwise an in-memory per-replica counter. ~5/min/email.
  const emailRateLimiter = createEmailRateLimiter({
    max: 5,
    windowMs: 60_000,
    redis: rateLimitRedis,
  });

  // Stricter per-email cap for login only (ADS-916). Separate limiter/window
  // from emailRateLimiter above — login's threshold matches the auth-service
  // soft-lock (5 attempts / 5 minutes), tighter than register/forgot-password's
  // 5/minute, so a credential-stuffing attack spread across many IPs (or a
  // rotating X-Forwarded-For) is still capped per targeted account.
  const loginEmailRateLimiter = createEmailRateLimiter({
    max: 5,
    windowMs: 5 * 60_000,
    redis: rateLimitRedis,
  });
  const loginEmailRateLimitTripsTotal = getOrCreateLoginEmailRateLimitCounter();

  if (opts.authClient) {
    await registerAuthRoutes(server, {
      client: opts.authClient,
      emailRateLimiter,
      loginEmailRateLimiter,
      onLoginEmailRateLimitTrip: () => loginEmailRateLimitTripsTotal.inc(),
    });
    // /api/v1/sessions/* — list/revoke. Same auth client because it's the
    // same identity surface from the SPA's POV.
    await registerSessionsRoutes(server, { client: opts.authClient });
    // /api/v1/field-permissions/* — admin surface. Backed entirely by
    // service.auth (which owns the field_permissions table + lib.types
    // defaults).
    await registerFieldPermissionsRoutes(server, { client: opts.authClient });
    // /api/v1/admin/security/* — Security Center sessions + account
    // lockout, plus login-history / suspicious-activity (auditClient) when
    // available. Permission gating lives in the auth/audit handlers.
    await registerSecurityRoutes(server, {
      client: opts.authClient,
      auditClient: opts.auditClient,
    });
    // /api/v1/privacy/admin/users/:id/{export,delete-request} — admin
    // Privacy Tools (GDPR). Auth-owned data only; gating in the handlers.
    await registerPrivacyRoutes(server, { client: opts.authClient });
  }
  if (opts.notificationsClient) {
    await registerNotificationsRoutes(server, { client: opts.notificationsClient });
    // /api/v1/devices/* — register / list / unregister device tokens.
    // Reuses the same notifications gRPC client (device token RPCs
    // ship in @adopt-dont-shop/proto.NotificationsV1).
    await registerDevicesRoutes(server, { client: opts.notificationsClient });
    // /api/v1/email/templates/* — admin email-template CRUD. The
    // email_templates table is owned by service.notifications.
    await registerEmailRoutes(server, { client: opts.notificationsClient });
    // /api/v1/notifications/broadcast — admin fan-out (the upstream call
    // lives in service.notifications, which in turn calls service.auth for
    // the cohort).
    await registerBroadcastRoutes(server, { client: opts.notificationsClient });
  }
  // /api/v1/users/* — profile + composed preferences. Requires BOTH
  // auth (profile + privacy prefs) and notifications (in-app channel
  // prefs) clients so the unified GET /preferences can compose without
  // partial data.
  if (opts.authClient && opts.notificationsClient) {
    await registerUsersRoutes(server, {
      authClient: opts.authClient,
      notificationsClient: opts.notificationsClient,
    });
  }
  if (opts.petsClient) {
    await registerPetsRoutes(server, { client: opts.petsClient });
  }
  if (opts.rescueClient) {
    await registerRescueRoutes(server, { client: opts.rescueClient });
    // SPA-facing surface at /api/v1/rescues/* (plural — the path
    // lib.rescue actually calls).
    await registerRescuesPublicRoutes(server, { client: opts.rescueClient });
    // Staff / foster / invitation-read surface (/api/v1/staff/*,
    // /api/v1/foster/*, GET /api/v1/invitations/details/:token).
    await registerStaffFosterRoutes(server, { client: opts.rescueClient });
    // Admin rescue detail surface — plan / analytics / send-email /
    // bulk-update + plural verify/reject + StaffTab (staff + invitations).
    // authClient enriches staff members with name/email from auth.users.
    await registerRescueAdminRoutes(server, {
      client: opts.rescueClient,
      authClient: opts.authClient,
    });
    // /api/v1/events/* — event CRUD + attendee management + analytics.
    await registerEventRoutes(server, { client: opts.rescueClient });
  }
  // POST /api/v1/invitations/accept — register-on-accept. Orchestrates
  // auth (provision the invited user) + rescue (consume the invitation +
  // attach staff membership), so it needs BOTH clients wired.
  if (opts.authClient && opts.rescueClient) {
    await registerInvitationAcceptRoutes(server, {
      authClient: opts.authClient,
      rescueClient: opts.rescueClient,
    });
  }
  if (opts.auditClient) {
    await registerAuditRoutes(server, { client: opts.auditClient });
    // Per-entity GET .../:id/activity — the admin SPA's EntityInspector
    // "Activity" tab. Same gRPC stub (GetByTarget), different REST shape
    // than /api/v1/audit/targets/:type/:id.
    await registerEntityActivityRoutes(server, { client: opts.auditClient });
  }
  // /api/v1/reports/* — saved reports + templates are owned by
  // service.audit; execute/schedule/share additionally orchestrate the
  // live aggregation RPCs on service.pets / service.applications /
  // service.auth, so all four clients are required.
  if (opts.auditClient && opts.petsClient && opts.applicationsClient && opts.authClient) {
    await registerReportsRoutes(server, {
      client: opts.auditClient,
      petsClient: opts.petsClient,
      applicationsClient: opts.applicationsClient,
      authClient: opts.authClient,
    });
  }
  if (opts.matchingClient) {
    await registerMatchingRoutes(server, { client: opts.matchingClient });
  }
  if (opts.moderationClient) {
    await registerModerationRoutes(server, { client: opts.moderationClient });
    // SPA-facing surface at /api/v1/admin/{moderation,support}/* with
    // frontend-shape envelopes (lib.moderation, lib.support-tickets).
    await registerModerationAdminRoutes(server, { client: opts.moderationClient });
    // Unified admin Triage Inbox at /api/v1/admin/inbox — aggregates
    // moderation reports + support tickets into one queue.
    await registerAdminInboxRoutes(server, { client: opts.moderationClient });
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

  if (opts.applicationsClient) {
    await registerApplicationsRoutes(server, { client: opts.applicationsClient });
    // Application document routes (multipart upload → storage → AddDocument).
    await registerApplicationDocumentsRoutes(server, {
      client: opts.applicationsClient,
      storage: storageConfig,
    });
  }
  if (opts.chatClient) {
    await registerChatRoutes(server, { client: opts.chatClient });
  }
  if (opts.cmsClient) {
    await registerCmsRoutes(server, { client: opts.cmsClient });
  }
  // /api/v1/dashboard/* — cross-service composition (pets stats + apps
  // stats + rescue staff count + recent pet/application activity). Only
  // registers when ALL three backing services have a wired client, so a
  // partial harness doesn't return half-empty data.
  if (opts.petsClient && opts.applicationsClient && opts.rescueClient) {
    await registerDashboardRoutes(server, {
      petsClient: opts.petsClient,
      applicationsClient: opts.applicationsClient,
      rescueClient: opts.rescueClient,
    });
  }
  // /api/v1/admin/metrics + /api/v1/admin/analytics/dashboard —
  // platform-wide aggregation for the admin SPA's Dashboard + Analytics
  // pages. Fans out to auth (user stats), pets/applications (GetStats) and
  // rescue (List, counted). Only registers when ALL FOUR backing clients
  // are wired so a partial harness doesn't serve half-empty metrics.
  if (opts.authClient && opts.petsClient && opts.applicationsClient && opts.rescueClient) {
    await registerAdminAnalyticsRoutes(server, {
      authClient: opts.authClient,
      petsClient: opts.petsClient,
      applicationsClient: opts.applicationsClient,
      rescueClient: opts.rescueClient,
    });
  }

  // Gateway-folded surface — no upstream service required. Per the plan:
  // "CMS / legal / config — small static reads fold into service.gateway".
  // CMS extraction itself is deferred (full DB schema + admin CRUD); legal
  // markdown + public config land here.
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

  // /api/v1/analytics/{adoption-metrics,application-analytics,
  // pet-performance,stage-distribution} — the rescue SPA's Analytics
  // dashboard. Composes pets + applications aggregation RPCs.
  if (opts.petsClient && opts.applicationsClient) {
    await registerAnalyticsMetricsRoutes(server, {
      petsClient: opts.petsClient,
      applicationsClient: opts.applicationsClient,
    });
  }

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
  if (config.testTokenPeek?.enabled && config.testTokenPeek.databaseUrl) {
    await registerTestTokenPeekRoutes(server, {
      databaseUrl: config.testTokenPeek.databaseUrl,
    });
    logger.warn(
      'test-token-peek seam ENABLED — /api/v1/test/* exposes one-time auth tokens (e2e only)'
    );
  }

  // Any /api/* path the gateway doesn't explicitly own 404s — the gateway
  // is the single REST surface and there is no fall-through. We LOG every
  // unmatched API request at warn: a 404 here usually means a service
  // client wasn't wired (so its routes never registered) or the SPA is
  // calling a path that doesn't exist. Without this line the failure is
  // invisible in the logs (Fastify's own request logging is disabled).
  const apiNotFound = async (req: FastifyRequest, reply: FastifyReply) => {
    logger.warn('unmatched API route', { method: req.method, url: req.url });
    return reply.code(404).send({ error: 'not_found' });
  };
  server.get('/api/*', apiNotFound);
  server.post('/api/*', apiNotFound);
  server.put('/api/*', apiNotFound);
  server.patch('/api/*', apiNotFound);
  server.delete('/api/*', apiNotFound);

  return server;
};

export type { GatewayConfig };
