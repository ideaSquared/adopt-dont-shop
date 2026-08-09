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

// Page size for each keyset round-trip to a source (the moderation RPCs
// clamp to their own MAX_LIMIT of 200).
const PAGE_SIZE = 200;

// Safety bound on how many matching rows we pull from a single source
// before merging. The two sources are merged, sorted and paginated in
// memory, so we must gather the WHOLE filtered set — not just the first
// page — for `total`/`totalPages` and deep pages to be correct (ADS-1180).
// Server-side status/severity filters keep this set small in practice; the
// cap only guards against a pathological, unfiltered queue.
const MAX_CANDIDATES = 2000;

// Drain a keyset-paginated source into a single array, following
// nextCursor until the source is exhausted or the safety cap is hit.
async function collectAll<T>(
  fetchPage: (cursor: string | undefined) => Promise<{ items: T[]; nextCursor?: string }>,
  cap: number
): Promise<T[]> {
  const collected: T[] = [];
  let cursor: string | undefined;
  for (;;) {
    const { items, nextCursor } = await fetchPage(cursor);
    collected.push(...items);
    if (nextCursor === undefined || nextCursor === '' || collected.length >= cap) {
      break;
    }
    cursor = nextCursor;
  }
  return collected.length > cap ? collected.slice(0, cap) : collected;
}

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

      // Resolve the status/severity filters into each source's own enum
      // space and push them into the RPCs, so we drain only matching rows
      // rather than a bounded raw window (ADS-1180). A value that isn't a
      // member of a source's enum resolves to UNSPECIFIED — that source can
      // hold no matching row, so it is skipped entirely instead of fetched
      // only to be filtered out in memory. Severity maps to a ticket's
      // priority (the column the inbox renders as severity for tickets).
      const statusProvided = q.status !== undefined && q.status !== '';
      const severityProvided = q.severity !== undefined && q.severity !== '';

      const reportStatus = parseEnum(
        ModerationV1.ReportStatus,
        'REPORT_STATUS',
        ModerationV1.reportStatusFromJSON,
        ModerationV1.ReportStatus.REPORT_STATUS_UNSPECIFIED,
        ModerationV1.ReportStatus.UNRECOGNIZED,
        q.status
      );
      const reportSeverity = parseEnum(
        ModerationV1.Severity,
        'SEVERITY',
        ModerationV1.severityFromJSON,
        ModerationV1.Severity.SEVERITY_UNSPECIFIED,
        ModerationV1.Severity.UNRECOGNIZED,
        q.severity
      );
      const ticketStatus = parseEnum(
        ModerationV1.SupportTicketStatus,
        'SUPPORT_TICKET_STATUS',
        ModerationV1.supportTicketStatusFromJSON,
        ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_UNSPECIFIED,
        ModerationV1.SupportTicketStatus.UNRECOGNIZED,
        q.status
      );
      const ticketPriority = parseEnum(
        ModerationV1.SupportTicketPriority,
        'SUPPORT_TICKET_PRIORITY',
        ModerationV1.supportTicketPriorityFromJSON,
        ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_UNSPECIFIED,
        ModerationV1.SupportTicketPriority.UNRECOGNIZED,
        q.severity
      );

      const reportsMatchFilters =
        (!statusProvided || reportStatus !== ModerationV1.ReportStatus.REPORT_STATUS_UNSPECIFIED) &&
        (!severityProvided || reportSeverity !== ModerationV1.Severity.SEVERITY_UNSPECIFIED);
      const ticketsMatchFilters =
        (!statusProvided ||
          ticketStatus !== ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_UNSPECIFIED) &&
        (!severityProvided ||
          ticketPriority !==
            ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_UNSPECIFIED);

      try {
        const items: InboxItem[] = [];

        if (wantModeration && reportsMatchFilters) {
          const reports = await collectAll<Report>(async cursor => {
            const grpcReq: ListReportsRequest = {
              limit: PAGE_SIZE,
              cursor,
              status: reportStatus,
              severity: reportSeverity,
              assignedModerator: q.assignedTo,
            };
            const res = await client.listReports(grpcReq, meta);
            return { items: res.reports, nextCursor: res.nextCursor };
          }, MAX_CANDIDATES);
          items.push(...reports.map(reportToInboxItem));
        }

        if (wantSupport && ticketsMatchFilters) {
          const tickets = await collectAll<SupportTicket>(async cursor => {
            const grpcReq: ListSupportTicketsRequest = {
              limit: PAGE_SIZE,
              cursor,
              status: ticketStatus,
              priority: ticketPriority,
              assignedTo: q.assignedTo,
            };
            const res = await client.listSupportTickets(grpcReq, meta);
            return { items: res.tickets, nextCursor: res.nextCursor };
          }, MAX_CANDIDATES);
          items.push(...tickets.map(ticketToInboxItem));
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

// --- Helpers ---------------------------------------------------------

// Same generic enum parser moderation-admin.ts uses — accepts the DB form
// ('pending') AND the SCREAMING proto form ('REPORT_STATUS_PENDING'), and
// returns UNSPECIFIED for an empty or foreign token.
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
