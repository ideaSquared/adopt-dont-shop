// Gateway authentication middleware.
//
// Runs as a Fastify onRequest hook on EVERY request. Three things to do:
//
//   1. **Strip client-supplied identity headers.** The downstream gRPC
//      services trust `x-user-id` / `x-user-roles` /
//      `x-user-permissions` / `x-rescue-id` as ground truth. We must
//      NEVER let a client forge those, so we delete them unconditionally
//      before potentially restamping with the validated principal.
//
//   2. **Best-effort token validation.** When an `Authorization:
//      Bearer <token>` header is present, call
//      `service.auth.ValidateToken`. On success, stamp the principal
//      onto the request headers so downstream code (routes/notifications,
//      catch-all proxy) forwards them as gRPC/HTTP metadata. On failure
//      (invalid/expired/revoked token), respond 401 — we never forward
//      a request the auth service rejected.
//
//   3. **No token + protected path → pass through.** Public paths
//      (login, refresh, register, public webhooks, /health) need to
//      reach the relevant handler without an Authorization header. The
//      catch-all proxy keeps handling unauthenticated traffic during
//      strangler-fig migration — the monolith continues to apply its
//      own auth gate where it owns the path. The header strip step
//      already prevents privilege escalation via the catch-all.
//
// CAD parallel: this is the BFF gate CAD's gateway has. The discipline
// "strip first, then stamp" is the same lesson — a forgotten strip is
// the same as no auth at all.

import { status as grpcStatus, Metadata } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Logger } from 'winston';

import { signPrincipalToken } from '@adopt-dont-shop/service-bootstrap';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';

export type AuthMiddlewareOptions = {
  authClient: AuthClient;
  logger: Logger;
  // ADS-800: when set, a signed x-principal-token is stamped alongside
  // the x-user-* headers after ValidateToken succeeds, signed over the
  // same principal. buildMetadata forwards it so downstream services
  // running with the same PRINCIPAL_SIGNING_KEY verify the principal
  // cryptographically instead of trusting the bare headers.
  principalSigningKey?: string;
  // ADS-863: the auth principal does not carry the rescue tenant key (the
  // rescue↔user membership lives in the rescue service, not auth). When a
  // rescue client is provided, rescue-staff principals get their `rescueId`
  // resolved here and stamped into `x-rescue-id` / the signed principal so
  // rescue-scoped writes (pet create, application review/approve) pass the
  // tenant scope check. Optional + fail-open: without it, behaviour is
  // unchanged.
  rescueClient?: RescueClient;
};

// Cache of userId → resolved rescueId (or null when the user has no
// membership). Staff memberships change rarely, so a short TTL keeps the
// rescue lookup off the per-request hot path while staying fresh.
const RESCUE_ID_TTL_MS = 5 * 60_000;
const rescueIdCache = new Map<string, { rescueId: string | null; expiresAt: number }>();

// Resolve a rescue-staff user's home rescue via the rescue service,
// memoised. Fail-open: a missing membership (NOT_FOUND) or any upstream
// error yields `null`, so the request proceeds without a rescue scope —
// exactly as it did before this enrichment existed.
async function resolveRescueId(
  userId: string,
  roleStrings: string[],
  permissions: string[],
  rescueClient: RescueClient,
  principalSigningKey: string | undefined,
  logger: Logger
): Promise<string | null> {
  const cached = rescueIdCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.rescueId;
  }

  let rescueId: string | null = null;
  try {
    const meta = new Metadata();
    meta.set('x-user-id', userId);
    meta.set('x-user-roles', roleStrings.join(','));
    meta.set('x-user-permissions', permissions.join(','));
    if (principalSigningKey) {
      meta.set(
        'x-principal-token',
        signPrincipalToken({ userId, roles: roleStrings, permissions }, principalSigningKey)
      );
    }
    const res = await rescueClient.getMyStaffMembership({}, meta);
    rescueId = res.staffMember?.rescueId ?? null;
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code !== grpcStatus.NOT_FOUND) {
      logger.warn('rescueId enrichment failed', {
        userId,
        err: (err as Error)?.message ?? String(err),
      });
    }
    rescueId = null;
  }

  rescueIdCache.set(userId, { rescueId, expiresAt: Date.now() + RESCUE_ID_TTL_MS });
  return rescueId;
}

// Headers we strip on every request — anything else the client sends
// is forwarded as-is. x-principal-token is in the list because the
// gateway mints it itself (ADS-800); a client-supplied one must never
// survive.
const SPOOFABLE_HEADERS = [
  'x-user-id',
  'x-user-roles',
  'x-user-permissions',
  'x-rescue-id',
  'x-principal-token',
] as const;

// Paths the gateway lets through WITHOUT requiring (or rejecting on
// invalid) Authorization. These are the routes that mint/verify
// credentials themselves OR that don't need a principal.
//
// The list stays small and explicit — anything outside it goes
// through best-effort validation. Adding a new public endpoint means
// editing this list, which is the audit point.
const PUBLIC_PATH_PREFIXES = [
  '/health',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh-token',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/resend-verification',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
] as const;

export const registerAuthenticate = async (
  app: FastifyInstance,
  opts: AuthMiddlewareOptions
): Promise<void> => {
  const { authClient, logger, principalSigningKey, rescueClient } = opts;

  app.addHook('onRequest', async (req, reply) => {
    // Step 1: strip spoofable headers. ALWAYS.
    for (const key of SPOOFABLE_HEADERS) {
      delete (req.headers as Record<string, unknown>)[key];
    }

    const token = extractBearerToken(req);

    // No token + public path → pass through. No token + non-public
    // path → still pass through (the downstream handler / catch-all
    // proxy decides whether to 401). Letting the gateway 401 here
    // would break the strangler-fig: the monolith handles its own
    // unauth responses today, and switching to gateway-side 401s is
    // a behaviour change we save for Phase 2.6 when all auth flows
    // come through the gateway.
    if (!token) {
      return;
    }

    // Public paths with a token: validate-but-don't-block. A login
    // request that happens to carry an old expired token shouldn't
    // 401 before the login attempt even starts.
    const isPublic = PUBLIC_PATH_PREFIXES.some(p => req.url.startsWith(p));

    try {
      const metadata = new Metadata();
      const res = await authClient.validateToken({ accessToken: token }, metadata);
      const principal = res.principal;
      if (!principal) {
        // Shouldn't happen — ValidateToken either throws or returns
        // a principal — but guard so a future contract drift fails
        // closed instead of silently forwarding unauth as auth.
        if (!isPublic) {
          logger.warn('rejecting request: token validated but no principal returned', {
            url: req.url,
          });
          return reply.code(401).send({ error: 'invalid token' });
        }
        return;
      }

      // Stamp the validated principal onto the request headers so
      // downstream code (gRPC client buildMetadata, catch-all proxy
      // forwarding) picks it up via the same paths that previously
      // trusted client-supplied versions.
      const headers = req.headers as Record<string, string>;
      const roles = principal.roles.map(stringifyRole);
      headers['x-user-id'] = principal.userId;
      headers['x-user-roles'] = roles.join(',');
      headers['x-user-permissions'] = principal.permissions.join(',');
      // ADS-863: resolve the rescue tenant key. The auth principal never
      // carries it (rescue membership lives in the rescue service), so for
      // rescue staff we look it up (cached, fail-open). Gated on the role so
      // non-rescue users never trigger the lookup.
      let rescueId = principal.rescueId || undefined;
      if (!rescueId && rescueClient && roles.includes('rescue_staff')) {
        rescueId =
          (await resolveRescueId(
            principal.userId,
            roles,
            [...principal.permissions],
            rescueClient,
            principalSigningKey,
            logger
          )) ?? undefined;
      }
      if (rescueId) {
        headers['x-rescue-id'] = rescueId;
      }
      // ADS-800: sign the same principal so downstream services can
      // verify it instead of trusting the headers. Minted per request —
      // well inside the token TTL for any gRPC call this request makes.
      if (principalSigningKey) {
        headers['x-principal-token'] = signPrincipalToken(
          {
            userId: principal.userId,
            roles,
            permissions: [...principal.permissions],
            ...(rescueId ? { rescueId } : {}),
          },
          principalSigningKey
        );
      }
    } catch (err) {
      // Invalid / expired / revoked token. On public paths, drop the
      // token and let the request continue unauthenticated (login,
      // refresh-token etc. don't need a valid existing token). On
      // protected paths, 401 — we never forward a request the auth
      // service rejected.
      if (isPublic) {
        return;
      }
      const grpcCode = (err as { code?: number }).code;
      const httpStatus = grpcCode === grpcStatus.UNAUTHENTICATED ? 401 : 500;
      if (httpStatus === 401) {
        // Invalid / expired / revoked token on a protected path. Log at
        // warn so a flood of 401s (e.g. a stale SPA session) is visible in
        // the gateway logs instead of failing silently.
        logger.warn('rejecting request: invalid token', { url: req.url });
      } else {
        logger.error('ValidateToken upstream error', {
          err: (err as Error)?.message ?? String(err),
          url: req.url,
        });
      }
      return reply.code(httpStatus).send({
        error: httpStatus === 401 ? 'invalid token' : 'internal_error',
      });
    }
  });
};

// --- Helpers ---------------------------------------------------------

// Avoid a regex with unbounded `\s+` — CodeQL flagged it as ReDoS-able
// on uncontrolled input. A plain prefix check + slice is O(n) and
// can't backtrack.
const BEARER_PREFIX = 'bearer ';

function extractBearerToken(req: FastifyRequest): string | undefined {
  const raw = req.headers.authorization;
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length <= BEARER_PREFIX.length) {
    return undefined;
  }
  if (trimmed.slice(0, BEARER_PREFIX.length).toLowerCase() !== BEARER_PREFIX) {
    return undefined;
  }
  const token = trimmed.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : undefined;
}

// The proto enum gives us the integer variant; we need the canonical
// string the downstream services compare against (`adopter`,
// `rescue_staff`, …). Defer the mapping to a tiny inline switch so
// this file doesn't depend on @adopt-dont-shop/lib.types.
function stringifyRole(role: number): string {
  switch (role) {
    case 1:
      return 'adopter';
    case 2:
      return 'rescue_staff';
    case 3:
      return 'admin';
    case 4:
      return 'moderator';
    case 5:
      return 'super_admin';
    case 6:
      return 'support_agent';
    default:
      return '';
  }
}

// Exported for tests so the constant stays in sync with the middleware
// behaviour without duplication.
export const __TEST_PUBLIC_PATH_PREFIXES = PUBLIC_PATH_PREFIXES;
export const __TEST_SPOOFABLE_HEADERS = SPOOFABLE_HEADERS;

// Helper handler reply type — used by the protected-without-token return
// branch shape so the FastifyReply isn't `void`d by accident.
export type AuthReply = FastifyReply;
