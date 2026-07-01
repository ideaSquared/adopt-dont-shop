// REST → gRPC translation for /api/v1/moderation/*.
//
// Phase 8.5 cutover. Same strangler-fig shape as routes/audit.ts
// (#917) / routes/matching.ts (#923) — registers BEFORE the catch-all
// proxy so first-registered-wins prefix routing picks it off.
//
// Route map (all 15 ModerationService RPCs):
//
//   Reports
//   POST   /api/v1/moderation/reports                       → FileReport
//   GET    /api/v1/moderation/reports                       → ListReports
//   GET    /api/v1/moderation/reports/:id                   → GetReport
//   POST   /api/v1/moderation/reports/:id/assign            → AssignReport
//   POST   /api/v1/moderation/reports/:id/resolve           → ResolveReport
//   Moderator actions
//   POST   /api/v1/moderation/actions                       → LogModeratorAction
//   GET    /api/v1/moderation/actions                       → ListModeratorActions
//   Evidence
//   POST   /api/v1/moderation/evidence                      → AddEvidence
//   Sanctions
//   POST   /api/v1/moderation/sanctions                     → IssueSanction
//   GET    /api/v1/moderation/users/:userId/sanctions       → ListUserSanctions
//   POST   /api/v1/moderation/sanctions/:id/appeal          → AppealSanction
//   Support tickets
//   POST   /api/v1/moderation/tickets                       → OpenSupportTicket
//   GET    /api/v1/moderation/tickets                       → ListSupportTickets
//   GET    /api/v1/moderation/tickets/:id                   → GetSupportTicket
//   POST   /api/v1/moderation/tickets/:id/responses         → RespondToTicket
//
// Authz lives in the handlers (most gate on admin.dashboard;
// FileReport + OpenSupportTicket are open to any authenticated user;
// ListUserSanctions allows self-or-admin). The gateway stamps
// x-user-* metadata via the Phase 2.5 authenticate middleware.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import {
  ModerationV1,
  type AddEvidenceRequest,
  type AppealSanctionRequest,
  type AssignReportRequest,
  type FileReportRequest,
  type IssueSanctionRequest,
  type ListModeratorActionsRequest,
  type ListReportsRequest,
  type ListSupportTicketsRequest,
  type LogModeratorActionRequest,
  type OpenSupportTicketRequest,
  type ResolveReportRequest,
  type RespondToTicketRequest,
  type UserSanction,
} from '@adopt-dont-shop/proto';

import type { ModerationClient } from '../grpc-clients/moderation-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type ModerationRoutesOptions = {
  client: ModerationClient;
};

// Writes 30/min, reads 120/min — moderation is admin-driven so these
// are sized for human use.
const RL_WRITE = { max: 30, timeWindow: '1 minute' } as const;
const RL_READ = { max: 120, timeWindow: '1 minute' } as const;

export const registerModerationRoutes = async (
  app: FastifyInstance,
  opts: ModerationRoutesOptions
): Promise<void> => {
  const { client } = opts;

  await app.register(rateLimit, { global: false });

  // ---------- Reports ----------

  app.post(
    '/api/v1/moderation/reports',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation'],
        summary: 'File a moderation report',
        body: { type: 'object', additionalProperties: true },
        response: {
          201: { type: 'object', additionalProperties: true },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: FileReportRequest = {
        reportedEntityType: parseEntityType(b.reportedEntityType as string | undefined),
        reportedEntityId: (b.reportedEntityId as string) ?? '',
        reportedUserId: b.reportedUserId as string | undefined,
        category: parseCategory(b.category as string | undefined),
        severity: parseSeverity(b.severity as string | undefined),
        title: (b.title as string) ?? '',
        description: (b.description as string) ?? '',
        metadataJson: b.metadataJson as string | undefined,
      };
      try {
        const res = await client.fileReport(grpcReq, buildMetadata(req));
        return reply.code(201).send(ModerationV1.FileReportResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get(
    '/api/v1/moderation/reports',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation'],
        summary: 'List moderation reports',
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'string' },
            status: { type: 'string' },
            severity: { type: 'string' },
            category: { type: 'string' },
            assigned: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(q, { limit: 0 });
      if (!pagination.ok) {
        return reply.code(400).send({ error: pagination.error });
      }
      const grpcReq: ListReportsRequest = {
        cursor: q.cursor,
        limit: pagination.limit,
        status: parseReportStatus(q.status),
        severity: parseSeverity(q.severity),
        category: parseCategory(q.category),
        assignedModerator: q.assigned,
      };
      try {
        const res = await client.listReports(grpcReq, buildMetadata(req));
        return reply.send(ModerationV1.ListReportsResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    '/api/v1/moderation/reports/:id',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation'],
        summary: 'Get a moderation report by ID',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        querystring: { type: 'object', properties: { transitions: { type: 'string' } } },
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      try {
        const res = await client.getReport(
          { reportId: req.params.id, includeTransitions: q.transitions === 'true' },
          buildMetadata(req)
        );
        return reply.send(ModerationV1.GetReportResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/moderation/reports/:id/assign',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation'],
        summary: 'Assign a moderation report to a moderator',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          properties: { moderatorId: { type: 'string' }, reason: { type: 'string' } },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: AssignReportRequest = {
        reportId: req.params.id,
        moderatorId: (b.moderatorId as string) ?? '',
        reason: b.reason as string | undefined,
      };
      try {
        const res = await client.assignReport(grpcReq, buildMetadata(req));
        return reply.send(ModerationV1.AssignReportResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/moderation/reports/:id/resolve',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation'],
        summary: 'Resolve a moderation report',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          properties: { resolution: { type: 'string' }, resolutionNotes: { type: 'string' } },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: ResolveReportRequest = {
        reportId: req.params.id,
        resolution: (b.resolution as string) ?? '',
        resolutionNotes: b.resolutionNotes as string | undefined,
      };
      try {
        const res = await client.resolveReport(grpcReq, buildMetadata(req));
        return reply.send(ModerationV1.ResolveReportResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---------- Moderator actions ----------

  app.post(
    '/api/v1/moderation/actions',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation'],
        summary: 'Log a moderator action',
        body: { type: 'object', additionalProperties: true },
        response: {
          201: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: LogModeratorActionRequest = {
        reportId: b.reportId as string | undefined,
        targetEntityType: parseEntityType(b.targetEntityType as string | undefined),
        targetEntityId: (b.targetEntityId as string) ?? '',
        targetUserId: b.targetUserId as string | undefined,
        actionType: parseActionType(b.actionType as string | undefined),
        severity: parseSeverity(b.severity as string | undefined),
        reason: (b.reason as string) ?? '',
        description: b.description as string | undefined,
        metadataJson: b.metadataJson as string | undefined,
        duration: b.duration as number | undefined,
      };
      try {
        const res = await client.logModeratorAction(grpcReq, buildMetadata(req));
        return reply.code(201).send(ModerationV1.LogModeratorActionResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get(
    '/api/v1/moderation/actions',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation'],
        summary: 'List moderator actions',
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'string' },
            user: { type: 'string' },
            report: { type: 'string' },
            action: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(q, { limit: 0 });
      if (!pagination.ok) {
        return reply.code(400).send({ error: pagination.error });
      }
      const grpcReq: ListModeratorActionsRequest = {
        cursor: q.cursor,
        limit: pagination.limit,
        targetUserId: q.user,
        reportId: q.report,
        actionType: parseActionType(q.action),
      };
      try {
        const res = await client.listModeratorActions(grpcReq, buildMetadata(req));
        return reply.send(ModerationV1.ListModeratorActionsResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---------- Evidence ----------

  app.post(
    '/api/v1/moderation/evidence',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation'],
        summary: 'Add evidence to a moderation report or action',
        body: { type: 'object', additionalProperties: true },
        response: {
          201: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: AddEvidenceRequest = {
        parentType: parseEvidenceParentType(b.parentType as string | undefined),
        parentId: (b.parentId as string) ?? '',
        type: parseEvidenceType(b.type as string | undefined),
        content: (b.content as string) ?? '',
        description: b.description as string | undefined,
      };
      try {
        const res = await client.addEvidence(grpcReq, buildMetadata(req));
        return reply.code(201).send(ModerationV1.AddEvidenceResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---------- Sanctions ----------

  app.post(
    '/api/v1/moderation/sanctions',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation'],
        summary: 'Issue a sanction against a user',
        body: { type: 'object', additionalProperties: true },
        response: {
          201: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: IssueSanctionRequest = {
        userId: (b.userId as string) ?? '',
        sanctionType: parseSanctionType(b.sanctionType as string | undefined),
        reason: parseSanctionReason(b.reason as string | undefined),
        description: (b.description as string) ?? '',
        duration: b.duration as number | undefined,
        reportId: b.reportId as string | undefined,
        moderatorActionId: b.moderatorActionId as string | undefined,
      };
      try {
        const res = await client.issueSanction(grpcReq, buildMetadata(req));
        return reply.code(201).send(ModerationV1.IssueSanctionResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get<{ Params: { userId: string } }>(
    '/api/v1/moderation/users/:userId/sanctions',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation'],
        summary: 'List sanctions for a user',
        params: {
          type: 'object',
          properties: { userId: { type: 'string' } },
          required: ['userId'],
        },
        querystring: { type: 'object', properties: { includeInactive: { type: 'string' } } },
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      try {
        const res = await client.listUserSanctions(
          {
            userId: req.params.userId,
            includeInactive: q.includeInactive === 'true',
            unacknowledgedOnly: false,
          },
          buildMetadata(req)
        );
        return reply.send(ModerationV1.ListUserSanctionsResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/moderation/sanctions/:id/appeal',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation'],
        summary: 'Appeal a sanction',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: { type: 'object', properties: { appealReason: { type: 'string' } } },
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: AppealSanctionRequest = {
        sanctionId: req.params.id,
        appealReason: (b.appealReason as string) ?? '',
      };
      try {
        const res = await client.appealSanction(grpcReq, buildMetadata(req));
        return reply.send(ModerationV1.AppealSanctionResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---------- Self-service sanctions (in-app banner) ----------
  //
  // These carry the SPA's /api/v1/auth/sanctions/* paths (app.client's
  // SanctionBannerHost) but are backed by the moderation service — the
  // gateway is just a router, and the moderation client lives here. Both
  // are scoped to the CALLING user: the list passes the caller's own id
  // (the service allows self-reads) and acknowledge gates on ownership.

  app.get(
    '/api/v1/auth/sanctions/active',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation'],
        summary: "List the caller's active, unacknowledged sanctions",
        response: {
          200: {
            type: 'object',
            properties: {
              sanctions: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const userId = headerUserId(req);
      if (userId === undefined) {
        return reply.code(401).send({ error: 'unauthenticated' });
      }
      try {
        const res = await client.listUserSanctions(
          { userId, includeInactive: false, unacknowledgedOnly: true },
          buildMetadata(req)
        );
        return reply.send({ sanctions: res.sanctions.map(sanctionToActiveSanction) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/auth/sanctions/:id/acknowledge',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation'],
        summary: "Acknowledge (dismiss the banner for) one of the caller's sanctions",
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (req, reply) => {
      try {
        await client.acknowledgeSanction({ sanctionId: req.params.id }, buildMetadata(req));
        return reply.code(204).send();
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---------- Support tickets ----------

  app.post(
    '/api/v1/moderation/tickets',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation'],
        summary: 'Open a support ticket (moderation admin surface)',
        body: { type: 'object', additionalProperties: true },
        response: {
          201: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: OpenSupportTicketRequest = {
        userId: b.userId as string | undefined,
        userEmail: (b.userEmail as string) ?? '',
        userName: b.userName as string | undefined,
        priority: parseTicketPriority(b.priority as string | undefined),
        category: parseTicketCategory(b.category as string | undefined),
        subject: (b.subject as string) ?? '',
        description: (b.description as string) ?? '',
        tags: (b.tags as string[]) ?? [],
      };
      try {
        const res = await client.openSupportTicket(grpcReq, buildMetadata(req));
        return reply.code(201).send(ModerationV1.OpenSupportTicketResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get(
    '/api/v1/moderation/tickets',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation'],
        summary: 'List support tickets (moderation admin surface)',
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'string' },
            status: { type: 'string' },
            priority: { type: 'string' },
            category: { type: 'string' },
            assigned: { type: 'string' },
            user: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(q, { limit: 0 });
      if (!pagination.ok) {
        return reply.code(400).send({ error: pagination.error });
      }
      const grpcReq: ListSupportTicketsRequest = {
        cursor: q.cursor,
        limit: pagination.limit,
        status: parseTicketStatus(q.status),
        priority: parseTicketPriority(q.priority),
        category: parseTicketCategory(q.category),
        assignedTo: q.assigned,
        userId: q.user,
      };
      try {
        const res = await client.listSupportTickets(grpcReq, buildMetadata(req));
        return reply.send(ModerationV1.ListSupportTicketsResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    '/api/v1/moderation/tickets/:id',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation'],
        summary: 'Get a support ticket by ID (moderation admin surface)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        querystring: { type: 'object', properties: { responses: { type: 'string' } } },
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      try {
        const res = await client.getSupportTicket(
          { ticketId: req.params.id, includeResponses: q.responses === 'true' },
          buildMetadata(req)
        );
        return reply.send(ModerationV1.GetSupportTicketResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/moderation/tickets/:id/responses',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation'],
        summary: 'Respond to a support ticket (moderation admin surface)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          properties: { content: { type: 'string' }, isInternal: { type: 'boolean' } },
        },
        response: {
          201: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: RespondToTicketRequest = {
        ticketId: req.params.id,
        content: (b.content as string) ?? '',
        isInternal: (b.isInternal as boolean) ?? false,
      };
      try {
        const res = await client.respondToTicket(grpcReq, buildMetadata(req));
        return reply.code(201).send(ModerationV1.RespondToTicketResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

// Enum parsers — each accepts DB form ('harassment') AND the SCREAMING
// proto form ('REPORT_CATEGORY_HARASSMENT'). Unknown coerces to
// UNSPECIFIED so the moderation service's INVALID_ARGUMENT guard
// produces a clean 400.

function parseEnum<E extends Record<string, string | number>>(
  enumObj: E,
  prefix: string,
  fromJSON: (s: string) => number,
  unspecified: number,
  unrecognized: number,
  raw: string | undefined
): number {
  if (!raw) {
    return unspecified;
  }
  const upper = `${prefix}_${raw.toUpperCase()}`;
  const candidate = Object.values(enumObj).includes(upper as never) ? upper : raw;
  const out = fromJSON(candidate);
  return out === unrecognized ? unspecified : out;
}

function parseEntityType(raw: string | undefined): ModerationV1.ReportEntityType {
  return parseEnum(
    ModerationV1.ReportEntityType,
    'REPORT_ENTITY_TYPE',
    ModerationV1.reportEntityTypeFromJSON,
    ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_UNSPECIFIED,
    ModerationV1.ReportEntityType.UNRECOGNIZED,
    raw
  );
}

function parseCategory(raw: string | undefined): ModerationV1.ReportCategory {
  return parseEnum(
    ModerationV1.ReportCategory,
    'REPORT_CATEGORY',
    ModerationV1.reportCategoryFromJSON,
    ModerationV1.ReportCategory.REPORT_CATEGORY_UNSPECIFIED,
    ModerationV1.ReportCategory.UNRECOGNIZED,
    raw
  );
}

function parseSeverity(raw: string | undefined): ModerationV1.Severity {
  return parseEnum(
    ModerationV1.Severity,
    'SEVERITY',
    ModerationV1.severityFromJSON,
    ModerationV1.Severity.SEVERITY_UNSPECIFIED,
    ModerationV1.Severity.UNRECOGNIZED,
    raw
  );
}

function parseReportStatus(raw: string | undefined): ModerationV1.ReportStatus {
  return parseEnum(
    ModerationV1.ReportStatus,
    'REPORT_STATUS',
    ModerationV1.reportStatusFromJSON,
    ModerationV1.ReportStatus.REPORT_STATUS_UNSPECIFIED,
    ModerationV1.ReportStatus.UNRECOGNIZED,
    raw
  );
}

function parseActionType(raw: string | undefined): ModerationV1.ModeratorActionType {
  return parseEnum(
    ModerationV1.ModeratorActionType,
    'MODERATOR_ACTION_TYPE',
    ModerationV1.moderatorActionTypeFromJSON,
    ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_UNSPECIFIED,
    ModerationV1.ModeratorActionType.UNRECOGNIZED,
    raw
  );
}

function parseEvidenceParentType(raw: string | undefined): ModerationV1.EvidenceParentType {
  return parseEnum(
    ModerationV1.EvidenceParentType,
    'EVIDENCE_PARENT_TYPE',
    ModerationV1.evidenceParentTypeFromJSON,
    ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_UNSPECIFIED,
    ModerationV1.EvidenceParentType.UNRECOGNIZED,
    raw
  );
}

function parseEvidenceType(raw: string | undefined): ModerationV1.EvidenceType {
  return parseEnum(
    ModerationV1.EvidenceType,
    'EVIDENCE_TYPE',
    ModerationV1.evidenceTypeFromJSON,
    ModerationV1.EvidenceType.EVIDENCE_TYPE_UNSPECIFIED,
    ModerationV1.EvidenceType.UNRECOGNIZED,
    raw
  );
}

function parseSanctionType(raw: string | undefined): ModerationV1.SanctionType {
  return parseEnum(
    ModerationV1.SanctionType,
    'SANCTION_TYPE',
    ModerationV1.sanctionTypeFromJSON,
    ModerationV1.SanctionType.SANCTION_TYPE_UNSPECIFIED,
    ModerationV1.SanctionType.UNRECOGNIZED,
    raw
  );
}

function parseSanctionReason(raw: string | undefined): ModerationV1.SanctionReason {
  return parseEnum(
    ModerationV1.SanctionReason,
    'SANCTION_REASON',
    ModerationV1.sanctionReasonFromJSON,
    ModerationV1.SanctionReason.SANCTION_REASON_UNSPECIFIED,
    ModerationV1.SanctionReason.UNRECOGNIZED,
    raw
  );
}

function parseTicketStatus(raw: string | undefined): ModerationV1.SupportTicketStatus {
  return parseEnum(
    ModerationV1.SupportTicketStatus,
    'SUPPORT_TICKET_STATUS',
    ModerationV1.supportTicketStatusFromJSON,
    ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_UNSPECIFIED,
    ModerationV1.SupportTicketStatus.UNRECOGNIZED,
    raw
  );
}

function parseTicketPriority(raw: string | undefined): ModerationV1.SupportTicketPriority {
  return parseEnum(
    ModerationV1.SupportTicketPriority,
    'SUPPORT_TICKET_PRIORITY',
    ModerationV1.supportTicketPriorityFromJSON,
    ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_UNSPECIFIED,
    ModerationV1.SupportTicketPriority.UNRECOGNIZED,
    raw
  );
}

function parseTicketCategory(raw: string | undefined): ModerationV1.SupportTicketCategory {
  return parseEnum(
    ModerationV1.SupportTicketCategory,
    'SUPPORT_TICKET_CATEGORY',
    ModerationV1.supportTicketCategoryFromJSON,
    ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_UNSPECIFIED,
    ModerationV1.SupportTicketCategory.UNRECOGNIZED,
    raw
  );
}

// Read the authenticated caller's id from the gateway-stamped header
// (the same header buildMetadata forwards as the gRPC principal).
function headerUserId(req: FastifyRequest): string | undefined {
  const raw = (req.headers as Record<string, string | string[] | undefined>)['x-user-id'];
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

// UserSanction → the SPA's ActiveSanction banner shape. The banner keys
// its title/variant off ModeratorActionType-style strings, so the 7
// SanctionType values collapse onto the 4 it recognises. `reason` carries
// the moderator's free-text description; severity is a display hint only.
type ActiveSanctionView = {
  id: string;
  type: string;
  reason: string;
  severity: string;
  expiresAt: string | null;
  acknowledgedAt: string | null;
};

const SANCTION_TYPE_VIEW: Record<ModerationV1.SanctionType, { type: string; severity: string }> = {
  [ModerationV1.SanctionType.SANCTION_TYPE_WARNING]: { type: 'warning_issued', severity: 'low' },
  [ModerationV1.SanctionType.SANCTION_TYPE_RESTRICTION]: {
    type: 'account_restricted',
    severity: 'medium',
  },
  [ModerationV1.SanctionType.SANCTION_TYPE_MESSAGING_RESTRICTION]: {
    type: 'account_restricted',
    severity: 'medium',
  },
  [ModerationV1.SanctionType.SANCTION_TYPE_POSTING_RESTRICTION]: {
    type: 'account_restricted',
    severity: 'medium',
  },
  [ModerationV1.SanctionType.SANCTION_TYPE_APPLICATION_RESTRICTION]: {
    type: 'account_restricted',
    severity: 'medium',
  },
  [ModerationV1.SanctionType.SANCTION_TYPE_TEMPORARY_BAN]: {
    type: 'user_suspended',
    severity: 'high',
  },
  [ModerationV1.SanctionType.SANCTION_TYPE_PERMANENT_BAN]: {
    type: 'user_banned',
    severity: 'critical',
  },
  [ModerationV1.SanctionType.SANCTION_TYPE_UNSPECIFIED]: {
    type: 'account_restricted',
    severity: 'medium',
  },
  [ModerationV1.SanctionType.UNRECOGNIZED]: { type: 'account_restricted', severity: 'medium' },
};

function sanctionToActiveSanction(s: UserSanction): ActiveSanctionView {
  const view = SANCTION_TYPE_VIEW[s.sanctionType];
  return {
    id: s.sanctionId,
    type: view.type,
    reason: s.description,
    severity: view.severity,
    expiresAt: s.endDate ?? null,
    acknowledgedAt: s.acknowledgedAt ?? null,
  };
}
