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

import { AuthV1, type ExportUserDataRequest } from '@adopt-dont-shop/proto';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { userToApiJson } from './auth-user-json.js';

export type UsersExportRoutesOptions = {
  client: AuthClient;
};

const EXPORT_RATE_LIMIT = {
  max: 5,
  timeWindow: '1 hour',
  keyGenerator: (req: FastifyRequest) => {
    const headers = req.headers as Record<string, string | string[] | undefined>;
    const userId = headers['x-user-id'];
    return typeof userId === 'string' && userId.length > 0 ? `users-export:${userId}` : req.ip;
  },
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
  const { client } = opts;

  app.get(
    '/api/v1/users/me/export',
    {
      config: { rateLimit: EXPORT_RATE_LIMIT },
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
