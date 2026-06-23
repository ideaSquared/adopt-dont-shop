// REST → gRPC translation for the admin Privacy Tools page (GDPR).
//
// app.admin's PrivacyTools page calls two endpoints the gateway never
// served (they 404'd):
//
//   GET  /api/v1/privacy/admin/users/:userId/export         → AuthService.ExportUserData
//   POST /api/v1/privacy/admin/users/:userId/delete-request → AuthService.RequestAccountDeletion
//
// Both are auth-scoped: the export bundles only auth-owned data (profile +
// privacy preferences); the deletion schedules + locks the account and stops
// at a published event (the anonymisation job is downstream). Authz is
// enforced at the handlers (admin.data.export / users.delete); the gateway
// re-rate-limits and threads x-user-* metadata.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import { AuthV1, type ExportUserDataRequest } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { userToApiJson } from './auth-user-json.js';

export type PrivacyRoutesOptions = {
  client: AuthClient;
};

const RL_EXPORT = { max: 30, timeWindow: '1 minute' } as const;
const RL_DELETE = { max: 10, timeWindow: '1 minute' } as const;

export const registerPrivacyRoutes = async (
  app: FastifyInstance,
  opts: PrivacyRoutesOptions
): Promise<void> => {
  const { client } = opts;

  await app.register(rateLimit, { global: false });

  // GET /api/v1/privacy/admin/users/:userId/export — the page downloads the
  // response body verbatim as the data archive, so return the bundle itself
  // (no envelope), with the user enums normalised to the canonical strings.
  app.get<{ Params: { userId: string } }>(
    '/api/v1/privacy/admin/users/:userId/export',
    {
      config: { rateLimit: RL_EXPORT },
      schema: { tags: ['privacy'], summary: 'Export a user data (GDPR Art. 20, admin)' },
    },
    async (req, reply) => {
      const grpcReq: ExportUserDataRequest = { userId: req.params.userId };
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

  // POST /api/v1/privacy/admin/users/:userId/delete-request
  app.post<{ Params: { userId: string }; Body: { reason?: string } }>(
    '/api/v1/privacy/admin/users/:userId/delete-request',
    {
      config: { rateLimit: RL_DELETE },
      schema: { tags: ['privacy'], summary: 'Schedule account deletion (GDPR Art. 17, admin)' },
    },
    async (req, reply) => {
      try {
        const res = await client.requestAccountDeletion(
          { userId: req.params.userId, reason: req.body?.reason },
          buildMetadata(req)
        );
        return reply.send({
          success: true,
          message: 'Account deletion scheduled',
          data: { deletionScheduledFor: res.deletionScheduledFor },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};
