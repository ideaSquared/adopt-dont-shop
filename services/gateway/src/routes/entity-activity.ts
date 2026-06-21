// REST → gRPC translation for the admin SPA's per-entity "Activity" tab.
//
// `apps/admin/src/services/entityActivityService.ts` calls
// `GET <prefix>/:id/activity` for seven entity types and expects
// `{ success: true, data: EntityActivity[] }`. The backing data already
// exists — AuditQueryService.GetByTarget (service.audit) — but no REST
// surface exposed it under these paths; `/api/v1/audit/targets/:type/:id`
// (routes/audit.ts) serves the general Audit log page instead, in the
// raw proto shape. This file is the missing per-entity translation.
//
// aggregateType passed to GetByTarget is just the EntityType string
// ('user', 'pet', 'application', ...) — that's the convention audit
// producers use for the aggregate_type column.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import { AuditV1, type AuditEvent, type AuditGetByTargetRequest } from '@adopt-dont-shop/proto';

import type { AuditClient } from '../grpc-clients/audit-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type EntityActivityRoutesOptions = {
  client: AuditClient;
};

// Mirrors @adopt-dont-shop/lib.types EntityActivity / EntityActivityType —
// duplicated locally rather than imported because the gateway
// deliberately doesn't depend on lib.types (see middleware/authenticate.ts).
type EntityActivityType =
  | 'application'
  | 'chat'
  | 'favorite'
  | 'profile_update'
  | 'login'
  | 'other';

type EntityActivity = {
  activityId: string;
  activityType: EntityActivityType;
  action: string;
  description: string;
  category: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

const ENTITY_ACTIVITY_ROUTES: ReadonlyArray<{ path: string; aggregateType: string }> = [
  { path: '/api/v1/users/:id/activity', aggregateType: 'user' },
  { path: '/api/v1/pets/:id/activity', aggregateType: 'pet' },
  { path: '/api/v1/applications/:id/activity', aggregateType: 'application' },
  { path: '/api/v1/rescues/:id/activity', aggregateType: 'rescue' },
  { path: '/api/v1/chats/:id/activity', aggregateType: 'chat' },
  { path: '/api/v1/admin/moderation/reports/:id/activity', aggregateType: 'report' },
  { path: '/api/v1/admin/support/tickets/:id/activity', aggregateType: 'support_ticket' },
];

// Sized for human use (an admin paging through one entity's history), not
// bulk scraping — same posture as routes/audit.ts.
const ENTITY_ACTIVITY_RATE_LIMIT = { max: 120, timeWindow: '1 minute' } as const;

export const registerEntityActivityRoutes = async (
  app: FastifyInstance,
  opts: EntityActivityRoutesOptions
): Promise<void> => {
  const { client } = opts;

  await app.register(rateLimit, { global: false });

  for (const { path, aggregateType } of ENTITY_ACTIVITY_ROUTES) {
    app.get<{ Params: { id: string } }>(
      path,
      {
        config: { rateLimit: ENTITY_ACTIVITY_RATE_LIMIT },
        schema: {
          tags: ['entity-activity'],
          summary: `Get activity log for a ${aggregateType}`,
        },
      },
      async (req, reply) => {
        const query = req.query as Record<string, string | undefined>;
        const pagination = parsePagination(query, { limit: 20 });
        if (!pagination.ok) {
          return reply.code(400).send({ error: pagination.error });
        }
        const grpcReq: AuditGetByTargetRequest = {
          aggregateType,
          aggregateId: req.params.id,
          cursor: query.cursor,
          limit: pagination.limit,
        };
        try {
          const res = await client.getByTarget(grpcReq, buildMetadata(req));
          return reply.send({ success: true, data: res.events.map(toEntityActivity) });
        } catch (err) {
          return handleGrpcError(err, reply);
        }
      }
    );
  }
};

// --- Helpers ---------------------------------------------------------

// Coarse classification for the admin UI's activity badge. Falls back to
// 'other' for anything that doesn't match a known pattern — the UI
// renders activityType as plain text, so an imprecise match degrades
// gracefully rather than breaking.
function toActivityType(event: AuditEvent): EntityActivityType {
  const haystack = `${event.subject} ${event.action}`.toLowerCase();
  if (haystack.includes('login') || haystack.includes('logout')) {
    return 'login';
  }
  if (haystack.includes('favorite') || haystack.includes('favourite')) {
    return 'favorite';
  }
  if (haystack.includes('chat') || haystack.includes('message')) {
    return 'chat';
  }
  if (haystack.includes('application')) {
    return 'application';
  }
  if (haystack.includes('profile') || haystack.includes('update')) {
    return 'profile_update';
  }
  return 'other';
}

// Humanises the action name into a short sentence, e.g. 'updateStatus' →
// 'update status', and flags non-success outcomes since denied/failed
// actions are exactly the forensic detail an admin is looking for.
function toDescription(event: AuditEvent): string {
  const humanized = event.action
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();
  if (event.outcome === AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED) {
    return `${humanized} (denied)`;
  }
  if (event.outcome === AuditV1.AuditOutcome.AUDIT_OUTCOME_FAILURE) {
    return `${humanized} (failed)`;
  }
  return humanized;
}

function toEntityActivity(event: AuditEvent): EntityActivity {
  return {
    activityId: event.eventId,
    activityType: toActivityType(event),
    action: event.action,
    description: toDescription(event),
    category: event.service,
    ipAddress: event.ipAddress ?? null,
    userAgent: event.userAgent ?? null,
    createdAt: event.occurredAt,
  };
}
