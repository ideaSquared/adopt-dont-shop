// GET /api/v1/users/me/export — self-service data export (GDPR Art. 15/20).
//
// Reuses the same AuthService.ExportUserData RPC the admin Privacy Tools
// page calls (routes/privacy.ts), but always scoped to the caller's own
// userId — never a path parameter — so a signed-in user can only ever
// export their own data. The handler (services/auth/src/grpc/privacy-
// handlers.ts) allows this without admin.data.export when req.userId
// equals the caller's own principal userId, and publishes an
// auth.actionTaken audit event for the export either way.
//
// Rate-limited the same as the erasure route (5/hour, keyed by userId) —
// both are step-up-free, low-cost reads/writes a script could otherwise
// hammer.
//
// The per-user cap is enforced as a route preHandler, NOT via
// config.rateLimit.keyGenerator (ADS-1421): @fastify/rate-limit's
// keyGenerator runs at Fastify's onRequest phase, before authenticate.ts's
// own onRequest hook has stripped a client-forged x-user-id and re-stamped
// the validated principal (the global rate-limit plugin registers ahead of
// registerAuthenticate in server.ts). A key read there is either absent
// (real callers don't send that header) or attacker-controlled. preHandler
// always runs after every onRequest hook completes, so by the time this
// fires the header can only hold the real authenticated userId.

import { AuthV1, type ExportUserDataRequest } from '@adopt-dont-shop/proto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { userToApiJson } from './auth-user-json.js';

import type { EmailRateLimiter } from './email-rate-limiter.js';

export type UsersExportRoutesOptions = {
  client: AuthClient;
  // Per-authenticated-user cap (ADS-1421), enforced as a route preHandler.
  // Optional so tests / dev that don't wire it keep the per-IP-only
  // backstop behaviour.
  exportUserRateLimiter?: EmailRateLimiter;
};

// Per-route IP backstop: 5 requests per hour per source IP, applied before
// authentication runs. The INTENDED per-user cap (same 5/hour) is enforced
// separately below as a preHandler keyed on the authenticated principal —
// see exportUserRateLimiter (ADS-1421). This no longer keys on x-user-id:
// that header isn't trustworthy yet at the onRequest phase where
// @fastify/rate-limit's keyGenerator runs.
const EXPORT_RATE_LIMIT = {
  max: 5,
  timeWindow: '1 hour',
};

function principalUserId(req: FastifyRequest): string | null {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const raw = headers['x-user-id'];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

export const registerUsersExportRoutes = async (
  app: FastifyInstance,
  opts: UsersExportRoutesOptions
): Promise<void> => {
  const { client, exportUserRateLimiter } = opts;

  // Per-principal cap preHandler (ADS-1421) — runs after authenticate.ts's
  // onRequest hook has already stripped any client-forged x-user-id and
  // re-stamped the validated principal, so the key is never attacker-
  // controlled. A no-op when no limiter is wired (tests / dev).
  const exportUserRateLimit = exportUserRateLimiter
    ? async (req: FastifyRequest, reply: FastifyReply) => {
        const userId = principalUserId(req);
        if (!userId) {
          return;
        }
        const allowed = await exportUserRateLimiter.consume(userId);
        if (!allowed) {
          return reply.code(429).send({ success: false, error: 'rate_limit_exceeded' });
        }
      }
    : undefined;

  app.get(
    '/api/v1/users/me/export',
    {
      config: { rateLimit: EXPORT_RATE_LIMIT },
      preHandler: exportUserRateLimit,
      schema: {
        tags: ['users'],
        summary: 'Export the signed-in user own data (GDPR Art. 15/20)',
        response: {
          200: { type: 'object', additionalProperties: true },
          401: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = principalUserId(req);
      if (!userId) {
        return reply.code(401).send({ success: false, error: 'unauthenticated' });
      }
      const grpcReq: ExportUserDataRequest = { userId };
      try {
        const res = await client.exportUserData(grpcReq, buildMetadata(req));
        return reply.send({
          user: res.user ? userToApiJson(res.user) : undefined,
          privacyPreferences: res.privacyPreferences
            ? AuthV1.PrivacyPreferences.toJSON(res.privacyPreferences)
            : undefined,
          exportedAt: res.exportedAt,
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};
