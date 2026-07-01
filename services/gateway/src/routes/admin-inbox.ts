// REST → gRPC aggregation for the admin Triage Inbox
// (apps/admin Inbox.tsx via inboxService.ts).
//
// The SPA wants ONE unified queue across moderation reports and support
// tickets. service.moderation exposes these as two separate list RPCs,
// so the gateway fans out, maps each source into a common InboxItem
// shape, then merges / filters / sorts / paginates in memory.
//
// The frontend's third source, 'message', has no backing RPC yet, so we
// never emit message items and reject message assignments.

import type { FastifyInstance } from 'fastify';

import {
  ModerationV1,
  type ListReportsRequest,
  type ListSupportTicketsRequest,
  type Report,
  type SupportTicket,
} from '@adopt-dont-shop/proto';

import type { ModerationClient } from '../grpc-clients/moderation-client.js';

import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type AdminInboxRoutesOptions = {
  client: ModerationClient;
};

// Matches the SPA's InboxItem (apps/admin/src/services/inboxService.ts).
// The gateway must not depend on lib.types, so the type is defined here.
type InboxSource = 'moderation' | 'support';

type InboxItem = {
  id: string;
  source: InboxSource;
  title: string;
  summary: string;
  status: string;
  severity: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  relatedUserId: string | null;
  relatedUserEmail: string | null;
};

// Upper bound on the candidate window pulled from each source before the
// in-memory merge. The merged list is paginated locally, so we gather a
// bounded page from each RPC (gRPC clamps to its own MAX_LIMIT) rather
// than streaming every row.
const CANDIDATE_LIMIT = 200;

// Strip a proto enum's SCREAMING prefix and lowercase it
// (REPORT_STATUS_PENDING → 'pending'). Mirrors moderation-view.ts.
function tokenFromProto(
  toJSON: (v: number) => string,
  value: number,
  prefix: string
): string | undefined {
  if (value <= 0) {
    return undefined;
  }
  return toJSON(value).slice(prefix.length).toLowerCase();
}

function reportToInboxItem(r: Report): InboxItem {
  return {
    id: r.reportId,
    source: 'moderation',
    title: r.title,
    summary: r.description,
    status:
      tokenFromProto(ModerationV1.reportStatusToJSON, r.status, 'REPORT_STATUS_') ?? 'pending',
    severity: tokenFromProto(ModerationV1.severityToJSON, r.severity, 'SEVERITY_') ?? 'low',
    assignedTo: r.assignedModerator ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    relatedUserId: r.reportedUserId ?? null,
    relatedUserEmail: null,
  };
}

function ticketToInboxItem(t: SupportTicket): InboxItem {
  return {
    id: t.ticketId,
    source: 'support',
    title: t.subject,
    summary: t.description,
    status:
      tokenFromProto(ModerationV1.supportTicketStatusToJSON, t.status, 'SUPPORT_TICKET_STATUS_') ??
      'open',
    // Support tickets carry no severity; the SPA renders a ticket's
    // priority in the severity column.
    severity:
      tokenFromProto(
        ModerationV1.supportTicketPriorityToJSON,
        t.priority,
        'SUPPORT_TICKET_PRIORITY_'
      ) ?? 'low',
    assignedTo: t.assignedTo ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    relatedUserId: t.userId ?? null,
    relatedUserEmail: t.userEmail,
  };
}

type InboxQuery = {
  source?: string;
  status?: string;
  assignedTo?: string;
  severity?: string;
  search?: string;
};

function matchesFilters(item: InboxItem, q: InboxQuery): boolean {
  if (q.status !== undefined && q.status !== '' && item.status !== q.status) {
    return false;
  }
  if (q.severity !== undefined && q.severity !== '' && item.severity !== q.severity) {
    return false;
  }
  if (q.assignedTo !== undefined && q.assignedTo !== '' && item.assignedTo !== q.assignedTo) {
    return false;
  }
  if (q.search !== undefined && q.search !== '') {
    const needle = q.search.toLowerCase();
    const haystack = `${item.title} ${item.summary}`.toLowerCase();
    if (!haystack.includes(needle)) {
      return false;
    }
  }
  return true;
}

function sortItems(
  items: ReadonlyArray<InboxItem>,
  sortBy: 'createdAt' | 'updatedAt',
  sortOrder: 'asc' | 'desc'
): InboxItem[] {
  const direction = sortOrder === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const cmp = a[sortBy].localeCompare(b[sortBy]);
    return cmp * direction;
  });
}

export const registerAdminInboxRoutes = async (
  app: FastifyInstance,
  opts: AdminInboxRoutesOptions
): Promise<void> => {
  const { client } = opts;

  app.get(
    '/api/v1/admin/inbox',
    {
      schema: {
        tags: ['admin', 'inbox'],
        summary: 'List unified admin triage inbox (moderation + support)',
        querystring: {
          type: 'object',
          properties: {
            source: { type: 'string', enum: ['moderation', 'support'] },
            status: { type: 'string' },
            severity: { type: 'string' },
            assignedTo: { type: 'string' },
            search: { type: 'string' },
            sortBy: { type: 'string' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
            page: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'array', items: { type: 'object', additionalProperties: true } },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  total: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(q, { page: 1, limit: 20 });
      if (!pagination.ok) {
        return reply.code(400).send({ error: pagination.error });
      }

      const source = q.source;
      const sortBy = q.sortBy === 'createdAt' ? 'createdAt' : 'updatedAt';
      const sortOrder = q.sortOrder === 'asc' ? 'asc' : 'desc';
      const meta = buildMetadata(req);

      const wantModeration = source === undefined || source === '' || source === 'moderation';
      const wantSupport = source === undefined || source === '' || source === 'support';

      try {
        const items: InboxItem[] = [];

        if (wantModeration) {
          const grpcReq: ListReportsRequest = {
            limit: CANDIDATE_LIMIT,
            assignedModerator: q.assignedTo,
          };
          const res = await client.listReports(grpcReq, meta);
          items.push(...res.reports.map(reportToInboxItem));
        }

        if (wantSupport) {
          const grpcReq: ListSupportTicketsRequest = {
            limit: CANDIDATE_LIMIT,
            assignedTo: q.assignedTo,
          };
          const res = await client.listSupportTickets(grpcReq, meta);
          items.push(...res.tickets.map(ticketToInboxItem));
        }

        const filtered = items.filter(item => matchesFilters(item, q));
        const sorted = sortItems(filtered, sortBy, sortOrder);

        const total = sorted.length;
        const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.limit);
        const start = (pagination.page - 1) * pagination.limit;
        const pageItems = sorted.slice(start, start + pagination.limit);

        return reply.send({
          data: pageItems,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages,
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/admin/inbox/assign',
    {
      schema: {
        tags: ['admin', 'inbox'],
        summary: 'Assign an inbox item (report or support ticket) to a moderator',
        body: {
          type: 'object',
          properties: {
            itemId: { type: 'string' },
            source: { type: 'string', enum: ['moderation', 'support'] },
            assignedTo: { type: 'string' },
          },
        },
        response: {
          204: { type: 'null' },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as { itemId?: string; source?: string; assignedTo?: string };
      if (
        b.itemId === undefined ||
        b.itemId === '' ||
        b.assignedTo === undefined ||
        b.assignedTo === ''
      ) {
        return reply.code(400).send({ error: 'itemId and assignedTo are required' });
      }

      if (b.source === 'moderation') {
        try {
          await client.assignReport(
            { reportId: b.itemId, moderatorId: b.assignedTo },
            buildMetadata(req)
          );
          return reply.code(204).send();
        } catch (err) {
          return handleGrpcError(err, reply);
        }
      }

      if (b.source === 'support') {
        try {
          await client.assignSupportTicket(
            { ticketId: b.itemId, assignedTo: b.assignedTo },
            buildMetadata(req)
          );
          return reply.code(204).send();
        } catch (err) {
          return handleGrpcError(err, reply);
        }
      }

      return reply.code(400).send({ error: `unsupported inbox source: ${b.source ?? ''}` });
    }
  );
};
