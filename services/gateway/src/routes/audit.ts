// REST → gRPC translation for /api/v1/audit/*.
//
// Phase 10.5 cutover. Same shape as routes/rescue.ts /
// routes/pets.ts / routes/auth.ts — Fastify plugin registers
// BEFORE the strangler-fig http-proxy catch-all, so first-
// registered-wins prefix routing picks it for /api/v1/audit/*
// requests before the catch-all sees them.
//
// Route map (mirrors monolith /api/v1/audit-logs but folds the
// per-target query under /api/v1/audit/targets/:type/:id):
//
//   GET /api/v1/audit                                 → AuditQueryService.Query
//   GET /api/v1/audit/targets/:type/:id               → AuditQueryService.GetByTarget
//   GET /api/v1/admin/audit-logs                      → AuditQueryService.Query (page mode)
//
// The /admin/audit-logs route (ADS-1152) backs lib.audit-logs, whose
// AuditLog contract predates the event-sourced audit service (it mirrors
// the monolith's old audit_logs row). It drives page-based navigation, so
// it uses Query's page/offset mode (total + jump-to-page) and projects
// each AuditEvent onto the AuditLog shape — every field maps from real
// event data or a documented transform (outcome → level/status), never
// fabricated.
//
// Both gated on admin.audit_logs at the handler (#915) — the
// gateway re-rate-limits but trusts the handler's authz check
// for the actual ability gate. The Phase 2.5 authenticate
// middleware already stamps x-user-* metadata.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import {
  AuditV1,
  type AuditEvent,
  type AuditGetByTargetRequest,
  type AuditQueryRequest,
} from '@adopt-dont-shop/proto';

import type { AuditClient } from '../grpc-clients/audit-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { buildPaginationEnvelope, parsePagination } from '../middleware/pagination.js';

export type AuditRoutesOptions = {
  client: AuditClient;
};

// Per-route rate limits. Audit is admin-only — these are sized for
// human use, not bulk scraping. The handler's own LIMIT clamp
// (#915: MAX_LIMIT=200) is the secondary guard.
const AUDIT_RATE_LIMITS = {
  query: { max: 60, timeWindow: '1 minute' },
  getByTarget: { max: 120, timeWindow: '1 minute' },
} as const;

export const registerAuditRoutes = async (
  app: FastifyInstance,
  opts: AuditRoutesOptions
): Promise<void> => {
  const { client } = opts;

  await app.register(rateLimit, { global: false });

  app.get(
    '/api/v1/audit',
    {
      config: { rateLimit: AUDIT_RATE_LIMITS.query },
      schema: {
        tags: ['audit'],
        summary: 'Query audit log entries',
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'string' },
            service: { type: 'string' },
            subject: { type: 'string' },
            actor_user_id: { type: 'string' },
            outcome: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(query, { limit: 0 });
      if (!pagination.ok) {
        return reply.code(400).send({ error: pagination.error });
      }
      const grpcReq: AuditQueryRequest = {
        cursor: query.cursor,
        limit: pagination.limit,
        service: query.service,
        subject: query.subject,
        actorUserId: query.actor_user_id,
        outcome: parseOutcome(query.outcome),
        occurredAtFrom: query.from,
        occurredAtTo: query.to,
      };
      try {
        const res = await client.query(grpcReq, buildMetadata(req));
        return reply.send(AuditV1.QueryResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get<{ Params: { type: string; id: string } }>(
    '/api/v1/audit/targets/:type/:id',
    {
      config: { rateLimit: AUDIT_RATE_LIMITS.getByTarget },
      schema: {
        tags: ['audit'],
        summary: 'Get audit log entries for a specific target',
        params: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            id: { type: 'string' },
          },
          required: ['type', 'id'],
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(query, { limit: 0 });
      if (!pagination.ok) {
        return reply.code(400).send({ error: pagination.error });
      }
      const grpcReq: AuditGetByTargetRequest = {
        aggregateType: req.params.type,
        aggregateId: req.params.id,
        cursor: query.cursor,
        limit: pagination.limit,
      };
      try {
        const res = await client.getByTarget(grpcReq, buildMetadata(req));
        return reply.send(AuditV1.GetByTargetResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/admin/audit-logs — page-based projection for lib.audit-logs.
  app.get(
    '/api/v1/admin/audit-logs',
    {
      config: { rateLimit: AUDIT_RATE_LIMITS.query },
      schema: {
        tags: ['audit'],
        summary: 'Admin audit logs (page-based projection of the audit event stream)',
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            action: { type: 'string' },
            userId: { type: 'string' },
            entity: { type: 'string' },
            level: { type: 'string' },
            status: { type: 'string' },
            page: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'object', additionalProperties: true } },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' },
                  hasNext: { type: 'boolean' },
                  hasPrev: { type: 'boolean' },
                },
              },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(query, { page: 1, limit: 50 });
      if (!pagination.ok) {
        return reply.code(400).send({ error: pagination.error });
      }
      // `level` is a display-only projection of `outcome` — it is NOT a
      // server filter (the SPA never sends it as one). `status`
      // (success/failure) narrows on outcome; a 'failure' filter matches
      // FAILURE only, so DENIED rows surface unfiltered but not under it.
      const grpcReq: AuditQueryRequest = {
        limit: pagination.limit,
        page: pagination.page,
        action: query.action,
        actorUserId: query.userId,
        aggregateType: query.entity,
        outcome: parseOutcome(query.status),
        occurredAtFrom: query.startDate,
        occurredAtTo: query.endDate,
      };
      try {
        const res = await client.query(grpcReq, buildMetadata(req));
        return reply.send({
          success: true,
          data: res.events.map(eventToAuditLog),
          pagination: buildPaginationEnvelope({
            mode: 'offset',
            page: pagination.page,
            limit: pagination.limit,
            total: res.total ?? 0,
          }),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

// parseOutcome accepts the DB string ('success', 'denied', 'failure')
// AND the SCREAMING proto form ('AUDIT_OUTCOME_DENIED'). Unknown
// coerces to UNSPECIFIED so the handler's filter loop treats it as
// "no filter".
function parseOutcome(raw: string | undefined): AuditV1.AuditOutcome {
  if (!raw) {
    return AuditV1.AuditOutcome.AUDIT_OUTCOME_UNSPECIFIED;
  }
  const upper = `AUDIT_OUTCOME_${raw.toUpperCase()}`;
  const candidate = Object.values(AuditV1.AuditOutcome).includes(upper as never) ? upper : raw;
  const out = AuditV1.auditOutcomeFromJSON(candidate);
  return out === AuditV1.AuditOutcome.UNRECOGNIZED
    ? AuditV1.AuditOutcome.AUDIT_OUTCOME_UNSPECIFIED
    : out;
}

// outcome → the SPA's log level. A denied action is a soft-failure the
// operator should notice (WARNING); a raised exception is an ERROR;
// everything else (success) is INFO.
function outcomeToLevel(outcome: AuditV1.AuditOutcome): 'INFO' | 'WARNING' | 'ERROR' {
  if (outcome === AuditV1.AuditOutcome.AUDIT_OUTCOME_FAILURE) {
    return 'ERROR';
  }
  if (outcome === AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED) {
    return 'WARNING';
  }
  return 'INFO';
}

function outcomeToStatus(outcome: AuditV1.AuditOutcome): 'success' | 'failure' {
  return outcome === AuditV1.AuditOutcome.AUDIT_OUTCOME_SUCCESS ? 'success' : 'failure';
}

function parseDetails(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw || raw.trim() === '') {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

// Project an AuditEvent onto the AuditLog shape lib.audit-logs expects.
// The event's uuid event_id fills `id` (the SPA only ever renders it via
// .toString() as a row key — a numeric id is a monolith artefact). The
// actor email snapshot is the only human-readable identity the event
// carries, so it stands in for both userName and userEmail.
function eventToAuditLog(e: AuditEvent): Record<string, unknown> {
  return {
    id: e.eventId,
    service: e.service,
    user: e.actorUserId ?? null,
    userName: e.actorEmailSnapshot ?? null,
    userEmail: e.actorEmailSnapshot ?? null,
    userType: null,
    action: e.action,
    level: outcomeToLevel(e.outcome),
    status: outcomeToStatus(e.outcome),
    timestamp: e.occurredAt,
    metadata: {
      entity: e.aggregateType,
      entityId: e.aggregateId,
      details: parseDetails(e.payloadJson),
      ipAddress: e.ipAddress ?? undefined,
      userAgent: e.userAgent ?? undefined,
    },
    category: e.aggregateType,
    ip_address: e.ipAddress ?? null,
    user_agent: e.userAgent ?? null,
  };
}
