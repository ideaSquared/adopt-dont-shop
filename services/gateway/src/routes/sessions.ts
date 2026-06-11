// REST → gRPC translation for /api/v1/sessions/*.
//
// Maps the SPA's existing session-management surface onto the auth
// service's new ListSessions / RevokeSession RPCs (introduced in the
// same PR that wires this route). Path shapes mirror the monolith
// exactly so the SPA needs no change at cutover:
//
//   GET    /api/v1/sessions              listSessions
//   DELETE /api/v1/sessions/:sessionId   revokeSession (204 on success)
//
// Mounted under the existing CUTOVER_AUTH flag — sessions are an auth
// surface, so they cut over together with login/logout/etc.

import type { FastifyInstance } from 'fastify';

import { AuthV1, type RevokeSessionRequest } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';

export type SessionsRoutesOptions = {
  client: AuthClient;
};

export const registerSessionsRoutes = async (
  app: FastifyInstance,
  opts: SessionsRoutesOptions
): Promise<void> => {
  const { client } = opts;

  // GET /api/v1/sessions — list active sessions for the calling user.
  // Monolith response shape: { data: [{sessionId, familyId, expiresAt,
  // createdAt}, ...] }. We mirror it.
  app.get('/api/v1/sessions', async (req, reply) => {
    const metadata = buildMetadata(req);
    try {
      const res = await client.listSessions({}, metadata);
      // toJSON would yield `{ sessions: [...] }` (proto field name);
      // the monolith uses `data: [...]`. Reshape here.
      return reply.send({
        data: (res.sessions ?? []).map(s => ({
          sessionId: s.sessionId,
          familyId: s.familyId,
          expiresAt: s.expiresAt,
          createdAt: s.createdAt,
        })),
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // DELETE /api/v1/sessions/:sessionId — revoke. Returns 204 to match
  // monolith parity. The gRPC response payload is discarded.
  app.delete<{ Params: { sessionId: string } }>(
    '/api/v1/sessions/:sessionId',
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const grpcReq: RevokeSessionRequest = { sessionId: req.params.sessionId };
      try {
        await client.revokeSession(grpcReq, metadata);
        return reply.code(204).send();
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

// Re-export AuthV1 so tests can use the proto namespace without
// pulling it in separately.
export { AuthV1 };
