// REST → gRPC translation for /api/v1/admin/moderation/* and
// /api/v1/admin/support/* — the paths the SPA actually calls
// (lib.moderation, lib.support-tickets). Stage B finishes the
// moderation contract: response shapes are adapted via moderation-view
// (lowercase enum tokens + { data } / { data, pagination } envelopes)
// rather than raw proto-JSON.
//
// The pre-existing /api/v1/moderation/* surface is kept as an
// internal/raw shape (rescue-staff tooling etc.); this module is the
// SPA-facing layer.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import {
  ModerationV1,
  type AssignReportRequest,
  type AssignSupportTicketRequest,
  type EscalateReportRequest,
  type EscalateSupportTicketRequest,
  type FileReportRequest,
  type ListModeratorActionsRequest,
  type ListReportsRequest,
  type ListSupportTicketsRequest,
  type LogModeratorActionRequest,
  type OpenSupportTicketRequest,
  type ResolveReportRequest,
  type RespondToTicketRequest,
  type UpdateSupportTicketRequest,
} from '@adopt-dont-shop/proto';

import type { ModerationClient } from '../grpc-clients/moderation-client.js';

import {
  dataEnvelope,
  listEnvelope,
  metricsToView,
  moderatorActionToView,
  reportToView,
  supportTicketResponseToView,
  supportTicketToView,
  supportTicketWithThreadToView,
  ticketStatsToView,
} from './moderation-view.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type ModerationAdminRoutesOptions = {
  client: ModerationClient;
};

const RL_WRITE = { max: 30, timeWindow: '1 minute' } as const;
const RL_READ = { max: 120, timeWindow: '1 minute' } as const;

// Upper bound on a single bulk-update batch — each id is one sequential gRPC
// call, so the array can't be unbounded.
const MAX_BULK_REPORT_IDS = 100;

export const registerModerationAdminRoutes = async (
  app: FastifyInstance,
  opts: ModerationAdminRoutesOptions
): Promise<void> => {
  const { client } = opts;

  await app.register(rateLimit, { global: false });

  // ---------- Reports ----------

  app.get(
    '/api/v1/admin/moderation/reports',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'List moderation reports (admin)',
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
        status: parseEnum(
          ModerationV1.ReportStatus,
          'REPORT_STATUS',
          ModerationV1.reportStatusFromJSON,
          ModerationV1.ReportStatus.REPORT_STATUS_UNSPECIFIED,
          ModerationV1.ReportStatus.UNRECOGNIZED,
          q.status
        ),
        severity: parseEnum(
          ModerationV1.Severity,
          'SEVERITY',
          ModerationV1.severityFromJSON,
          ModerationV1.Severity.SEVERITY_UNSPECIFIED,
          ModerationV1.Severity.UNRECOGNIZED,
          q.severity
        ),
        category: parseEnum(
          ModerationV1.ReportCategory,
          'REPORT_CATEGORY',
          ModerationV1.reportCategoryFromJSON,
          ModerationV1.ReportCategory.REPORT_CATEGORY_UNSPECIFIED,
          ModerationV1.ReportCategory.UNRECOGNIZED,
          q.category
        ),
        assignedModerator: q.assigned,
      };
      try {
        const res = await client.listReports(grpcReq, buildMetadata(req));
        return reply.send(
          listEnvelope(res.reports.map(reportToView), { nextCursor: res.nextCursor })
        );
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    '/api/v1/admin/moderation/reports/:id',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Get a moderation report by ID (admin)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        response: {
          200: { type: 'object', additionalProperties: true },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getReport(
          { reportId: req.params.id, includeTransitions: false },
          buildMetadata(req)
        );
        if (res.report === undefined) {
          return reply.code(404).send({ error: 'report not found' });
        }
        return reply.send(dataEnvelope(reportToView(res.report)));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/admin/moderation/reports',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'File a moderation report (admin)',
        body: { type: 'object', additionalProperties: true },
        response: {
          201: { type: 'object', additionalProperties: true },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: FileReportRequest = {
        reportedEntityType: parseEnum(
          ModerationV1.ReportEntityType,
          'REPORT_ENTITY_TYPE',
          ModerationV1.reportEntityTypeFromJSON,
          ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_UNSPECIFIED,
          ModerationV1.ReportEntityType.UNRECOGNIZED,
          b.reportedEntityType as string | undefined
        ),
        reportedEntityId: (b.reportedEntityId as string) ?? '',
        reportedUserId: b.reportedUserId as string | undefined,
        category: parseEnum(
          ModerationV1.ReportCategory,
          'REPORT_CATEGORY',
          ModerationV1.reportCategoryFromJSON,
          ModerationV1.ReportCategory.REPORT_CATEGORY_UNSPECIFIED,
          ModerationV1.ReportCategory.UNRECOGNIZED,
          b.category as string | undefined
        ),
        severity: parseEnum(
          ModerationV1.Severity,
          'SEVERITY',
          ModerationV1.severityFromJSON,
          ModerationV1.Severity.SEVERITY_UNSPECIFIED,
          ModerationV1.Severity.UNRECOGNIZED,
          b.severity as string | undefined
        ),
        title: (b.title as string) ?? '',
        description: (b.description as string) ?? '',
        metadataJson:
          b.metadata !== undefined
            ? JSON.stringify(b.metadata)
            : ((b.metadataJson as string) ?? ''),
      };
      try {
        const res = await client.fileReport(grpcReq, buildMetadata(req));
        if (res.report === undefined) {
          return reply.code(500).send({ error: 'fileReport returned no report' });
        }
        return reply.code(201).send(dataEnvelope(reportToView(res.report)));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // PATCH /reports/:id/status — the SPA's updateReportStatus. The body
  // status drives which RPC we call (resolve / dismiss / escalate-as-
  // resolution). Assignment is a separate route.
  app.patch<{ Params: { id: string } }>(
    '/api/v1/admin/moderation/reports/:id/status',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Update the status of a moderation report (admin)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            resolution: { type: 'string' },
            resolutionNotes: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const target = b.status as string | undefined;
      if (target !== 'resolved' && target !== 'dismissed') {
        return reply.code(400).send({ error: `unsupported status transition: ${target ?? ''}` });
      }
      const grpcReq: ResolveReportRequest = {
        reportId: req.params.id,
        resolution: target === 'dismissed' ? 'dismissed' : ((b.resolution as string) ?? 'resolved'),
        resolutionNotes: b.resolutionNotes as string | undefined,
      };
      try {
        const res = await client.resolveReport(grpcReq, buildMetadata(req));
        if (res.report === undefined) {
          return reply.code(404).send({ error: 'report not found' });
        }
        return reply.send(dataEnvelope(reportToView(res.report)));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/moderation/reports/:id/assign',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Assign a moderation report to a moderator (admin)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          properties: { moderatorId: { type: 'string' }, reason: { type: 'string' } },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          404: { type: 'object', properties: { error: { type: 'string' } } },
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
        if (res.report === undefined) {
          return reply.code(404).send({ error: 'report not found' });
        }
        return reply.send(dataEnvelope(reportToView(res.report)));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/moderation/reports/:id/escalate',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Escalate a moderation report (admin)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          properties: { escalatedTo: { type: 'string' }, reason: { type: 'string' } },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: EscalateReportRequest = {
        reportId: req.params.id,
        escalatedTo: (b.escalatedTo as string) ?? '',
        reason: (b.reason as string) ?? '',
      };
      try {
        const res = await client.escalateReport(grpcReq, buildMetadata(req));
        if (res.report === undefined) {
          return reply.code(404).send({ error: 'report not found' });
        }
        return reply.send(dataEnvelope(reportToView(res.report)));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /reports/bulk-update — sequential fan-out over the per-report
  // RPCs. The frontend body shape is { reportIds: string[], action:
  // 'resolve'|'dismiss'|'assign', moderatorId?, reason? }. Any per-report
  // failure short-circuits the loop and surfaces the first error.
  app.post(
    '/api/v1/admin/moderation/reports/bulk-update',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Bulk update moderation reports (admin)',
        body: { type: 'object', additionalProperties: true },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'array', items: { type: 'object', additionalProperties: true } },
              updated: { type: 'integer' },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as {
        reportIds?: string[];
        action?: string;
        moderatorId?: string;
        reason?: string;
        resolution?: string;
        resolutionNotes?: string;
      };
      const ids = Array.isArray(b.reportIds) ? b.reportIds : [];
      if (ids.length === 0) {
        return reply.code(400).send({ error: 'reportIds is required' });
      }
      // Bound the batch — each id is a sequential gRPC round trip, so an
      // unbounded array would tie up a worker.
      if (ids.length > MAX_BULK_REPORT_IDS) {
        return reply
          .code(400)
          .send({ error: `reportIds exceeds the maximum of ${MAX_BULK_REPORT_IDS}` });
      }
      const meta = buildMetadata(req);
      const reports: ReturnType<typeof reportToView>[] = [];
      try {
        for (const reportId of ids) {
          if (b.action === 'resolve' || b.action === 'dismiss') {
            const res = await client.resolveReport(
              {
                reportId,
                resolution: b.action === 'dismiss' ? 'dismissed' : (b.resolution ?? 'resolved'),
                resolutionNotes: b.resolutionNotes,
              },
              meta
            );
            if (res.report) {
              reports.push(reportToView(res.report));
            }
          } else if (b.action === 'assign') {
            const res = await client.assignReport(
              { reportId, moderatorId: b.moderatorId ?? '', reason: b.reason },
              meta
            );
            if (res.report) {
              reports.push(reportToView(res.report));
            }
          } else {
            return reply.code(400).send({ error: `unsupported bulk action: ${b.action ?? ''}` });
          }
        }
        return reply.send({ data: reports, updated: reports.length });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---------- Moderator actions ----------

  app.get(
    '/api/v1/admin/moderation/actions',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'List moderator actions (admin)',
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
        actionType: parseEnum(
          ModerationV1.ModeratorActionType,
          'MODERATOR_ACTION_TYPE',
          ModerationV1.moderatorActionTypeFromJSON,
          ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_UNSPECIFIED,
          ModerationV1.ModeratorActionType.UNRECOGNIZED,
          q.action
        ),
      };
      try {
        const res = await client.listModeratorActions(grpcReq, buildMetadata(req));
        return reply.send(
          listEnvelope(res.actions.map(moderatorActionToView), { nextCursor: res.nextCursor })
        );
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /actions/active — in-force sanctions/actions only (lib.moderation
  // getActiveActions). Sets active_only so the handler filters is_active +
  // unexpired; optionally scoped to a single target user (?userId=).
  app.get(
    '/api/v1/admin/moderation/actions/active',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'List active (in-force) moderator actions (admin)',
        querystring: {
          type: 'object',
          properties: { userId: { type: 'string' } },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const grpcReq: ListModeratorActionsRequest = {
        limit: 0,
        activeOnly: true,
        targetUserId: q.userId,
      } as ListModeratorActionsRequest;
      try {
        const res = await client.listModeratorActions(grpcReq, buildMetadata(req));
        return reply.send({ data: res.actions.map(moderatorActionToView) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/admin/moderation/actions',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Log a moderator action (admin)',
        body: { type: 'object', additionalProperties: true },
        response: {
          201: { type: 'object', additionalProperties: true },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: LogModeratorActionRequest = {
        reportId: b.reportId as string | undefined,
        targetEntityType: parseEnum(
          ModerationV1.ReportEntityType,
          'REPORT_ENTITY_TYPE',
          ModerationV1.reportEntityTypeFromJSON,
          ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_UNSPECIFIED,
          ModerationV1.ReportEntityType.UNRECOGNIZED,
          b.targetEntityType as string | undefined
        ),
        targetEntityId: (b.targetEntityId as string) ?? '',
        targetUserId: b.targetUserId as string | undefined,
        actionType: parseEnum(
          ModerationV1.ModeratorActionType,
          'MODERATOR_ACTION_TYPE',
          ModerationV1.moderatorActionTypeFromJSON,
          ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_UNSPECIFIED,
          ModerationV1.ModeratorActionType.UNRECOGNIZED,
          b.actionType as string | undefined
        ),
        severity: parseEnum(
          ModerationV1.Severity,
          'SEVERITY',
          ModerationV1.severityFromJSON,
          ModerationV1.Severity.SEVERITY_UNSPECIFIED,
          ModerationV1.Severity.UNRECOGNIZED,
          b.severity as string | undefined
        ),
        reason: (b.reason as string) ?? '',
        description: b.description as string | undefined,
        metadataJson:
          b.metadata !== undefined
            ? JSON.stringify(b.metadata)
            : ((b.metadataJson as string) ?? ''),
        duration: b.duration as number | undefined,
      };
      try {
        const res = await client.logModeratorAction(grpcReq, buildMetadata(req));
        if (res.action === undefined) {
          return reply.code(500).send({ error: 'logModeratorAction returned no action' });
        }
        return reply.code(201).send(dataEnvelope(moderatorActionToView(res.action)));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---------- Metrics ----------

  // GET /api/v1/admin/moderation/metrics — the dashboard stat-card snapshot
  // (lib.moderation useModerationMetrics). Envelope is { success, data } —
  // the client parses `data` with ModerationMetricsSchema.
  app.get(
    '/api/v1/admin/moderation/metrics',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Aggregate moderation metrics for the admin dashboard',
        response: {
          200: { type: 'object', additionalProperties: true },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getModerationMetrics({}, buildMetadata(req));
        return reply.send({ success: true, data: metricsToView(res) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---------- Support tickets ----------

  app.get(
    '/api/v1/admin/support/tickets',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'List support tickets (admin)',
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
        status: parseEnum(
          ModerationV1.SupportTicketStatus,
          'SUPPORT_TICKET_STATUS',
          ModerationV1.supportTicketStatusFromJSON,
          ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_UNSPECIFIED,
          ModerationV1.SupportTicketStatus.UNRECOGNIZED,
          q.status
        ),
        priority: parseEnum(
          ModerationV1.SupportTicketPriority,
          'SUPPORT_TICKET_PRIORITY',
          ModerationV1.supportTicketPriorityFromJSON,
          ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_UNSPECIFIED,
          ModerationV1.SupportTicketPriority.UNRECOGNIZED,
          q.priority
        ),
        category: parseEnum(
          ModerationV1.SupportTicketCategory,
          'SUPPORT_TICKET_CATEGORY',
          ModerationV1.supportTicketCategoryFromJSON,
          ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_UNSPECIFIED,
          ModerationV1.SupportTicketCategory.UNRECOGNIZED,
          q.category
        ),
        assignedTo: q.assigned,
        userId: q.user,
      };
      try {
        const res = await client.listSupportTickets(grpcReq, buildMetadata(req));
        return reply.send(
          listEnvelope(res.tickets.map(supportTicketToView), { nextCursor: res.nextCursor })
        );
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    '/api/v1/admin/support/tickets/:id',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Get a support ticket by ID (admin)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'object', additionalProperties: true },
              responses: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getSupportTicket(
          { ticketId: req.params.id, includeResponses: true },
          buildMetadata(req)
        );
        if (res.ticket === undefined) {
          return reply.code(404).send({ error: 'ticket not found' });
        }
        return reply.send({
          data: supportTicketToView(res.ticket),
          responses: res.responses.map(supportTicketResponseToView),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/admin/support/tickets',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Open a support ticket (admin)',
        body: { type: 'object', additionalProperties: true },
        response: {
          201: { type: 'object', additionalProperties: true },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: OpenSupportTicketRequest = {
        userId: b.userId as string | undefined,
        userEmail: (b.userEmail as string) ?? '',
        userName: b.userName as string | undefined,
        priority: parseEnum(
          ModerationV1.SupportTicketPriority,
          'SUPPORT_TICKET_PRIORITY',
          ModerationV1.supportTicketPriorityFromJSON,
          ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_UNSPECIFIED,
          ModerationV1.SupportTicketPriority.UNRECOGNIZED,
          b.priority as string | undefined
        ),
        category: parseEnum(
          ModerationV1.SupportTicketCategory,
          'SUPPORT_TICKET_CATEGORY',
          ModerationV1.supportTicketCategoryFromJSON,
          ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_UNSPECIFIED,
          ModerationV1.SupportTicketCategory.UNRECOGNIZED,
          b.category as string | undefined
        ),
        subject: (b.subject as string) ?? '',
        description: (b.description as string) ?? '',
        tags: (b.tags as string[]) ?? [],
      };
      try {
        const res = await client.openSupportTicket(grpcReq, buildMetadata(req));
        if (res.ticket === undefined) {
          return reply.code(500).send({ error: 'openSupportTicket returned no ticket' });
        }
        return reply.code(201).send(dataEnvelope(supportTicketToView(res.ticket)));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/support/tickets/:id/responses',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Respond to a support ticket (admin)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          properties: { content: { type: 'string' }, isInternal: { type: 'boolean' } },
        },
        response: {
          201: { type: 'object', additionalProperties: true },
          500: { type: 'object', properties: { error: { type: 'string' } } },
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
        if (res.response === undefined) {
          return reply.code(500).send({ error: 'respondToTicket returned no response' });
        }
        return reply.code(201).send(dataEnvelope(supportTicketResponseToView(res.response)));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/support/tickets/:id/assign',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Assign a support ticket to a moderator (admin)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: { type: 'object', properties: { assignedTo: { type: 'string' } } },
        response: {
          200: { type: 'object', additionalProperties: true },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: AssignSupportTicketRequest = {
        ticketId: req.params.id,
        assignedTo: (b.assignedTo as string) ?? '',
      };
      try {
        const res = await client.assignSupportTicket(grpcReq, buildMetadata(req));
        if (res.ticket === undefined) {
          return reply.code(500).send({ error: 'assignSupportTicket returned no ticket' });
        }
        return reply.send(dataEnvelope(supportTicketToView(res.ticket)));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /support/stats — aggregate stat cards (lib.support-tickets
  // useTicketStats). Envelope is { success, data } — the client parses
  // `data` with TicketStatsSchema.
  app.get(
    '/api/v1/admin/support/stats',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Aggregate support-ticket stats for the admin dashboard',
        response: {
          200: { type: 'object', additionalProperties: true },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getSupportTicketStats({}, buildMetadata(req));
        return reply.send({ success: true, data: ticketStatsToView(res) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /support/my-tickets — tickets assigned to the calling staff member
  // (lib.support-tickets getMyTickets). Scopes listSupportTickets by the
  // principal's own user id (stamped as x-user-id by the authenticate hook).
  app.get(
    '/api/v1/admin/support/my-tickets',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'List support tickets assigned to the current staff member (admin)',
        querystring: {
          type: 'object',
          properties: { status: { type: 'string' } },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const headers = req.headers as Record<string, string | string[] | undefined>;
      const userId = headers['x-user-id'];
      const grpcReq: ListSupportTicketsRequest = {
        limit: 0,
        status: parseEnum(
          ModerationV1.SupportTicketStatus,
          'SUPPORT_TICKET_STATUS',
          ModerationV1.supportTicketStatusFromJSON,
          ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_UNSPECIFIED,
          ModerationV1.SupportTicketStatus.UNRECOGNIZED,
          q.status
        ),
        assignedTo: typeof userId === 'string' ? userId : undefined,
      } as ListSupportTicketsRequest;
      try {
        const res = await client.listSupportTickets(grpcReq, buildMetadata(req));
        return reply.send({ data: res.tickets.map(supportTicketToView) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /support/tickets/:id/messages — the ticket plus its full response
  // thread (lib.support-tickets getTicketMessages parses `data` as a
  // SupportTicket with a nested responses array).
  app.get<{ Params: { id: string } }>(
    '/api/v1/admin/support/tickets/:id/messages',
    {
      config: { rateLimit: RL_READ },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Get a support ticket with its response thread (admin)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        response: {
          200: { type: 'object', additionalProperties: true },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getSupportTicket(
          { ticketId: req.params.id, includeResponses: true },
          buildMetadata(req)
        );
        if (res.ticket === undefined) {
          return reply.code(404).send({ error: 'ticket not found' });
        }
        return reply.send(dataEnvelope(supportTicketWithThreadToView(res.ticket, res.responses)));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // PATCH /support/tickets/:id — partial update of status/priority/category/
  // tags (lib.support-tickets updateTicket).
  app.patch<{ Params: { id: string } }>(
    '/api/v1/admin/support/tickets/:id',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Update a support ticket (admin)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            priority: { type: 'string' },
            category: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: UpdateSupportTicketRequest = {
        ticketId: req.params.id,
        status: parseEnum(
          ModerationV1.SupportTicketStatus,
          'SUPPORT_TICKET_STATUS',
          ModerationV1.supportTicketStatusFromJSON,
          ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_UNSPECIFIED,
          ModerationV1.SupportTicketStatus.UNRECOGNIZED,
          b.status as string | undefined
        ),
        priority: parseEnum(
          ModerationV1.SupportTicketPriority,
          'SUPPORT_TICKET_PRIORITY',
          ModerationV1.supportTicketPriorityFromJSON,
          ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_UNSPECIFIED,
          ModerationV1.SupportTicketPriority.UNRECOGNIZED,
          b.priority as string | undefined
        ),
        category: parseEnum(
          ModerationV1.SupportTicketCategory,
          'SUPPORT_TICKET_CATEGORY',
          ModerationV1.supportTicketCategoryFromJSON,
          ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_UNSPECIFIED,
          ModerationV1.SupportTicketCategory.UNRECOGNIZED,
          b.category as string | undefined
        ),
        tags: Array.isArray(b.tags) ? (b.tags as string[]) : [],
      };
      try {
        const res = await client.updateSupportTicket(grpcReq, buildMetadata(req));
        if (res.ticket === undefined) {
          return reply.code(404).send({ error: 'ticket not found' });
        }
        return reply.send(dataEnvelope(supportTicketToView(res.ticket)));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /support/tickets/:id/escalate — mark escalated, optionally reassign
  // (lib.support-tickets escalateTicket). Mirrors the report-escalate route.
  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/support/tickets/:id/escalate',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation', 'admin'],
        summary: 'Escalate a support ticket (admin)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          properties: {
            escalatedTo: { type: 'string' },
            assignedTo: { type: 'string' },
            reason: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: EscalateSupportTicketRequest = {
        ticketId: req.params.id,
        // Frontend sends escalatedTo (senior queue / staff member); the proto
        // carries it as assigned_to (an optional reassignment on escalation).
        assignedTo: (b.assignedTo as string | undefined) ?? (b.escalatedTo as string | undefined),
        reason: b.reason as string | undefined,
      };
      try {
        const res = await client.escalateSupportTicket(grpcReq, buildMetadata(req));
        if (res.ticket === undefined) {
          return reply.code(404).send({ error: 'ticket not found' });
        }
        return reply.send(dataEnvelope(supportTicketToView(res.ticket)));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/pets/:id/report — a user reporting a pet (lib.pets
  // reportPet). Maps to FileReport (open to any authenticated principal) with
  // reported_entity_type = pet. The param name MUST be `id` to share the
  // parametric node the pets routes already declared at /api/v1/pets/:id/*.
  app.post<{ Params: { id: string } }>(
    '/api/v1/pets/:id/report',
    {
      config: { rateLimit: RL_WRITE },
      schema: {
        tags: ['moderation'],
        summary: 'Report a pet',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: { type: 'object', additionalProperties: true },
        response: {
          201: { type: 'object', additionalProperties: true },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const reason = b.reason as string | undefined;
      // reason is a free-text label from the client; use it as the category
      // when it happens to name a known one, else fall back to OTHER. It is
      // preserved verbatim as the title / metadata for the moderator.
      let category = parseEnum(
        ModerationV1.ReportCategory,
        'REPORT_CATEGORY',
        ModerationV1.reportCategoryFromJSON,
        ModerationV1.ReportCategory.REPORT_CATEGORY_UNSPECIFIED,
        ModerationV1.ReportCategory.UNRECOGNIZED,
        (b.category as string | undefined) ?? reason
      );
      if (category === ModerationV1.ReportCategory.REPORT_CATEGORY_UNSPECIFIED) {
        category = ModerationV1.ReportCategory.REPORT_CATEGORY_OTHER;
      }
      let severity = parseEnum(
        ModerationV1.Severity,
        'SEVERITY',
        ModerationV1.severityFromJSON,
        ModerationV1.Severity.SEVERITY_UNSPECIFIED,
        ModerationV1.Severity.UNRECOGNIZED,
        b.severity as string | undefined
      );
      if (severity === ModerationV1.Severity.SEVERITY_UNSPECIFIED) {
        severity = ModerationV1.Severity.SEVERITY_MEDIUM;
      }
      const description =
        (b.description as string | undefined) ?? reason ?? 'Reported via the pet report action';
      const grpcReq: FileReportRequest = {
        reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_PET,
        reportedEntityId: req.params.id,
        reportedUserId: b.reportedUserId as string | undefined,
        category,
        severity,
        title: (b.title as string | undefined) ?? reason ?? 'Pet report',
        description,
        metadataJson: reason !== undefined ? JSON.stringify({ reason }) : undefined,
      };
      try {
        const res = await client.fileReport(grpcReq, buildMetadata(req));
        if (res.report === undefined) {
          return reply.code(500).send({ error: 'fileReport returned no report' });
        }
        return reply.code(201).send({
          data: { reportId: res.report.reportId, message: 'Report submitted successfully' },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

// Same generic enum parser the existing moderation.ts uses — accepts
// DB form ('pending') AND the SCREAMING proto form ('REPORT_STATUS_PENDING').
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
