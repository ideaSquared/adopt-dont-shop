// REST → gRPC translation for /api/v1/admin/security/* — the Security
// Center surface the admin SPA calls (app.admin securityService.ts).
//
// Backed entirely by service.auth's admin security RPCs:
//   GET    /api/v1/admin/security/sessions               adminListSessions
//   DELETE /api/v1/admin/security/sessions/:sessionId     adminRevokeSession (204)
//   DELETE /api/v1/admin/security/users/:userId/sessions  adminRevokeAllUserSessions
//   POST   /api/v1/admin/security/users/:userId/lock      adminLockAccount (204)
//   POST   /api/v1/admin/security/users/:userId/unlock    adminUnlockAccount
//   GET    /api/v1/admin/security/ip-rules                listIpRules
//   POST   /api/v1/admin/security/ip-rules                createIpRule
//   DELETE /api/v1/admin/security/ip-rules/:ipRuleId       deleteIpRule (204)
//
// Permission gating (admin.security.read / admin.security.manage) lives in
// the gRPC handlers; the gateway just forwards principal metadata.
//
// login-history and suspicious-activity are backed by service.audit's
// AuditQueryService.Query, reading the auth.actionTaken events
// service.auth now publishes for every login outcome (success, unknown
// email, locked, suspended, wrong password, bad 2FA):
//   GET /api/v1/admin/security/login-history        AuditQueryService.Query
//   GET /api/v1/admin/security/suspicious-activity   AuditQueryService.Query (aggregated)

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import {
  AuditV1,
  AuthV1,
  type AdminListSessionsRequest,
  type AuditQueryRequest,
} from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { AuditClient } from '../grpc-clients/audit-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type SecurityRoutesOptions = {
  client: AuthClient;
  auditClient?: AuditClient;
};

const LOGIN_HISTORY_SUBJECT = 'auth.actionTaken';

// Per-route rate limits for the audit-backed reads. Admin-only and sized
// for human use, not bulk scraping — mirrors routes/audit.ts (the handler's
// own LIMIT clamp is the secondary guard).
const SECURITY_AUDIT_RATE_LIMITS = {
  loginHistory: { max: 60, timeWindow: '1 minute' },
  suspiciousActivity: { max: 60, timeWindow: '1 minute' },
} as const;

// auth.actionTaken only ever publishes 'success' or 'denied' for login
// (no exception path raises 'failure') — the SPA's binary
// 'success'|'failure' status maps onto that one-to-one.
const loginStatusToOutcome = (status: string | undefined): AuditV1.AuditOutcome | undefined => {
  if (status === 'success') {
    return AuditV1.AuditOutcome.AUDIT_OUTCOME_SUCCESS;
  }
  if (status === 'failure') {
    return AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED;
  }
  return undefined;
};

const outcomeToLoginStatus = (outcome: AuditV1.AuditOutcome): 'success' | 'failure' | null => {
  if (outcome === AuditV1.AuditOutcome.AUDIT_OUTCOME_SUCCESS) {
    return 'success';
  }
  if (
    outcome === AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED ||
    outcome === AuditV1.AuditOutcome.AUDIT_OUTCOME_FAILURE
  ) {
    return 'failure';
  }
  return null;
};

const parsePayloadJson = (raw: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

// Suspicious-activity scans a rolling window of denied logins, so an
// unbounded query is never issued — this is the proto's documented max.
const SUSPICIOUS_ACTIVITY_QUERY_LIMIT = 200;

// IpRuleType proto enum <-> the 'allow'|'block' string the SPA's
// securityService.ts contract uses.
const ipRuleTypeToProto = (type: string): AuthV1.IpRuleType =>
  type === 'block' ? AuthV1.IpRuleType.IP_RULE_TYPE_BLOCK : AuthV1.IpRuleType.IP_RULE_TYPE_ALLOW;

const ipRuleTypeFromProto = (type: AuthV1.IpRuleType): 'allow' | 'block' =>
  type === AuthV1.IpRuleType.IP_RULE_TYPE_BLOCK ? 'block' : 'allow';

const toApiIpRule = (rule: {
  ipRuleId: string;
  type: AuthV1.IpRuleType;
  cidr: string;
  label?: string;
  isActive: boolean;
  expiresAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}) => ({
  ipRuleId: rule.ipRuleId,
  type: ipRuleTypeFromProto(rule.type),
  cidr: rule.cidr,
  label: rule.label ?? null,
  isActive: rule.isActive,
  expiresAt: rule.expiresAt ?? null,
  createdBy: rule.createdBy ?? null,
  createdAt: rule.createdAt,
  updatedAt: rule.updatedAt,
});

export const registerSecurityRoutes = async (
  app: FastifyInstance,
  opts: SecurityRoutesOptions
): Promise<void> => {
  const { client, auditClient } = opts;

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

  // GET /api/v1/admin/security/ip-rules — list all allow/block rules.
  app.get(
    '/api/v1/admin/security/ip-rules',
    {
      schema: {
        tags: ['security', 'admin'],
        summary: 'List IP allow/block rules (admin)',
      },
    },
    async (req, reply) => {
      try {
        const res = await client.listIpRules({}, buildMetadata(req));
        return reply.send({ success: true, data: (res.rules ?? []).map(toApiIpRule) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/admin/security/ip-rules — add an allow/block rule.
  app.post<{
    Body: { type: string; cidr: string; label?: string | null; expiresAt?: string | null };
  }>(
    '/api/v1/admin/security/ip-rules',
    {
      schema: {
        tags: ['security', 'admin'],
        summary: 'Create an IP allow/block rule (admin)',
      },
    },
    async (req, reply) => {
      const body = req.body;
      try {
        const res = await client.createIpRule(
          {
            type: ipRuleTypeToProto(body.type),
            cidr: body.cidr,
            label: body.label ?? undefined,
            expiresAt: body.expiresAt ?? undefined,
          },
          buildMetadata(req)
        );
        if (!res.rule) {
          return reply.code(500).send({ error: 'createIpRule returned no rule' });
        }
        return reply.send({ success: true, data: toApiIpRule(res.rule) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // DELETE /api/v1/admin/security/ip-rules/:ipRuleId — remove a rule.
  app.delete<{ Params: { ipRuleId: string } }>(
    '/api/v1/admin/security/ip-rules/:ipRuleId',
    {
      schema: {
        tags: ['security', 'admin'],
        summary: 'Delete an IP allow/block rule (admin)',
      },
    },
    async (req, reply) => {
      try {
        await client.deleteIpRule({ ipRuleId: req.params.ipRuleId }, buildMetadata(req));
        return reply.code(204).send();
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  if (!auditClient) {
    return;
  }

  await app.register(rateLimit, { global: false });

  // GET /api/v1/admin/security/login-history — auth.actionTaken events,
  // newest first. The SPA fetches once per filter change with no "next
  // page" control, so pagination is synthesised from the query's
  // next_cursor rather than wired to true offset paging.
  app.get(
    '/api/v1/admin/security/login-history',
    {
      config: { rateLimit: SECURITY_AUDIT_RATE_LIMITS.loginHistory },
      schema: {
        tags: ['security', 'admin'],
        summary: 'List login history from the audit log (admin)',
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(q, { limit: 50 });
      if (!pagination.ok) {
        return reply.code(400).send({ error: pagination.error });
      }
      const grpcReq: AuditQueryRequest = {
        subject: LOGIN_HISTORY_SUBJECT,
        actorUserId: q.userId ?? q.user_id,
        outcome: loginStatusToOutcome(q.status),
        occurredAtFrom: q.startDate,
        occurredAtTo: q.endDate,
        limit: pagination.limit,
      };
      try {
        const res = await auditClient.query(grpcReq, buildMetadata(req));
        const data = res.events.map(event => ({
          id: event.eventId,
          timestamp: event.occurredAt,
          action: event.action,
          status: outcomeToLoginStatus(event.outcome),
          userId: event.actorUserId ?? null,
          userEmail: event.actorEmailSnapshot ?? null,
          ipAddress: event.ipAddress ?? null,
          userAgent: event.userAgent ?? null,
          metadata: parsePayloadJson(event.payloadJson),
        }));
        return reply.send({
          data,
          pagination: {
            page: 1,
            limit: pagination.limit,
            total: data.length,
            totalPages: res.nextCursor ? 2 : 1,
            hasNext: Boolean(res.nextCursor),
            hasPrev: false,
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/admin/security/suspicious-activity — denied logins within
  // a rolling window, aggregated per user (or per IP for unknown-email
  // attempts), filtered to groups at/above failureThreshold.
  app.get(
    '/api/v1/admin/security/suspicious-activity',
    {
      config: { rateLimit: SECURITY_AUDIT_RATE_LIMITS.suspiciousActivity },
      schema: {
        tags: ['security', 'admin'],
        summary: 'List suspicious login activity from the audit log (admin)',
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const failureThreshold = parsePositiveInt(q.failureThreshold, 5);
      const windowHours = parsePositiveInt(q.windowHours, 24);
      if (failureThreshold === undefined || windowHours === undefined) {
        return reply
          .code(400)
          .send({ error: 'failureThreshold and windowHours must be positive integers' });
      }
      const occurredAtFrom = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
      const grpcReq: AuditQueryRequest = {
        subject: LOGIN_HISTORY_SUBJECT,
        outcome: AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED,
        occurredAtFrom,
        limit: SUSPICIOUS_ACTIVITY_QUERY_LIMIT,
      };
      try {
        const res = await auditClient.query(grpcReq, buildMetadata(req));
        const groups = new Map<
          string,
          {
            userId: string | null;
            userEmail: string | null;
            failureCount: number;
            lastAttempt: string;
            lastIp: string | null;
          }
        >();
        for (const event of res.events) {
          const key = event.actorUserId ?? event.ipAddress ?? 'unknown';
          const existing = groups.get(key);
          if (!existing) {
            groups.set(key, {
              userId: event.actorUserId ?? null,
              userEmail: event.actorEmailSnapshot ?? null,
              failureCount: 1,
              lastAttempt: event.occurredAt,
              lastIp: event.ipAddress ?? null,
            });
            continue;
          }
          existing.failureCount += 1;
          if (event.occurredAt > existing.lastAttempt) {
            existing.lastAttempt = event.occurredAt;
            existing.lastIp = event.ipAddress ?? existing.lastIp;
            existing.userEmail = event.actorEmailSnapshot ?? existing.userEmail;
          }
        }
        const data = Array.from(groups.values())
          .filter(g => g.failureCount >= failureThreshold)
          .sort((a, b) => b.failureCount - a.failureCount);
        return reply.send({ success: true, data });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// parsePositiveInt accepts an undefined raw value (falls back to
// `fallback`) or a positive-integer string; anything else is invalid.
const POSITIVE_INTEGER_PATTERN = /^\d+$/;
function parsePositiveInt(raw: string | undefined, fallback: number): number | undefined {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  if (!POSITIVE_INTEGER_PATTERN.test(raw.trim())) {
    return undefined;
  }
  const n = Number.parseInt(raw, 10);
  return n > 0 ? n : undefined;
}
