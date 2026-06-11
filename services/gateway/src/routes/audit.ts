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
//
// Both gated on admin.audit_logs at the handler (#915) — the
// gateway re-rate-limits but trusts the handler's authz check
// for the actual ability gate. The Phase 2.5 authenticate
// middleware already stamps x-user-* metadata.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import {
  AuditV1,
  type AuditGetByTargetRequest,
  type AuditQueryRequest,
} from '@adopt-dont-shop/proto';

import type { AuditClient } from '../grpc-clients/audit-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

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
    { config: { rateLimit: AUDIT_RATE_LIMITS.query } },
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
    { config: { rateLimit: AUDIT_RATE_LIMITS.getByTarget } },
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
