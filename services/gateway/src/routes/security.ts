// REST → gRPC translation for /api/v1/admin/security/* — the Security
// Center surface the admin SPA calls (app.admin securityService.ts).
//
// Backed entirely by service.auth's admin security RPCs:
//   GET    /api/v1/admin/security/sessions               adminListSessions
//   DELETE /api/v1/admin/security/sessions/:sessionId     adminRevokeSession (204)
//   DELETE /api/v1/admin/security/users/:userId/sessions  adminRevokeAllUserSessions
//   POST   /api/v1/admin/security/users/:userId/lock      adminLockAccount (204)
//   POST   /api/v1/admin/security/users/:userId/unlock    adminUnlockAccount
//
// Permission gating (admin.security.read / admin.security.manage) lives in
// the gRPC handlers; the gateway just forwards principal metadata. IP-rule,
// login-history and suspicious-activity endpoints the SPA also references
// are not wired here — they need durable infrastructure that does not yet
// exist (no ip_rules table, no failed-login audit trail).

import type { FastifyInstance } from 'fastify';

import type { AdminListSessionsRequest } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type SecurityRoutesOptions = {
  client: AuthClient;
};

export const registerSecurityRoutes = async (
  app: FastifyInstance,
  opts: SecurityRoutesOptions
): Promise<void> => {
  const { client } = opts;

  // GET /api/v1/admin/security/sessions — cross-user active sessions,
  // paginated. The SPA's Session shape denormalises the owning user under
  // `user`, so reshape AdminSessionInfo here.
  app.get(
    '/api/v1/admin/security/sessions',
    {
      schema: {
        tags: ['security', 'admin'],
        summary: 'List active sessions across users (admin)',
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(q, { limit: 20 });
      if (!pagination.ok) {
        return reply.code(400).send({ error: pagination.error });
      }
      const grpcReq: AdminListSessionsRequest = {
        userId: q.userId ?? q.user_id,
        page: pagination.page,
        limit: pagination.limit,
      };
      try {
        const res = await client.adminListSessions(grpcReq, buildMetadata(req));
        return reply.send({
          data: (res.sessions ?? []).map(s => ({
            sessionId: s.sessionId,
            userId: s.userId,
            familyId: s.familyId,
            isRevoked: false,
            expiresAt: s.expiresAt,
            createdAt: s.createdAt,
            user: {
              userId: s.userId,
              email: s.email,
              firstName: s.firstName ?? null,
              lastName: s.lastName ?? null,
            },
          })),
          pagination: {
            page: res.page,
            limit: pagination.limit,
            total: res.total,
            totalPages: res.totalPages,
            hasNext: res.page < res.totalPages,
            hasPrev: res.page > 1,
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // DELETE /api/v1/admin/security/sessions/:sessionId — revoke any session.
  app.delete<{ Params: { sessionId: string } }>(
    '/api/v1/admin/security/sessions/:sessionId',
    {
      schema: {
        tags: ['security', 'admin'],
        summary: 'Revoke any session by id (admin)',
      },
    },
    async (req, reply) => {
      try {
        await client.adminRevokeSession({ sessionId: req.params.sessionId }, buildMetadata(req));
        return reply.code(204).send();
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // DELETE /api/v1/admin/security/users/:userId/sessions — revoke all of a
  // user's sessions. Returns the count so the SPA can surface it.
  app.delete<{ Params: { userId: string } }>(
    '/api/v1/admin/security/users/:userId/sessions',
    {
      schema: {
        tags: ['security', 'admin'],
        summary: "Revoke all of a user's sessions (admin)",
      },
    },
    async (req, reply) => {
      try {
        const res = await client.adminRevokeAllUserSessions(
          { userId: req.params.userId },
          buildMetadata(req)
        );
        return reply.send({ success: true, data: { revokedCount: res.revokedCount } });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/admin/security/users/:userId/lock — force-lock an account.
  app.post<{ Params: { userId: string } }>(
    '/api/v1/admin/security/users/:userId/lock',
    {
      schema: {
        tags: ['security', 'admin'],
        summary: 'Force-lock a user account (admin)',
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as { reason?: string };
      try {
        await client.adminLockAccount(
          { userId: req.params.userId, reason: body.reason },
          buildMetadata(req)
        );
        return reply.code(204).send();
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/admin/security/users/:userId/unlock — clear a lockout.
  app.post<{ Params: { userId: string } }>(
    '/api/v1/admin/security/users/:userId/unlock',
    {
      schema: {
        tags: ['security', 'admin'],
        summary: 'Unlock a user account (admin)',
      },
    },
    async (req, reply) => {
      try {
        const res = await client.adminUnlockAccount(
          { userId: req.params.userId },
          buildMetadata(req)
        );
        return reply.send({ success: true, data: { wasLocked: res.wasLocked } });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};
