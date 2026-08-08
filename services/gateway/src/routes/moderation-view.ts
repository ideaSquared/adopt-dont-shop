// Stage B — moderation response adapter.
//
// service.moderation returns proto-JSON Report / ModeratorAction /
// SupportTicket where enum fields are SCREAMING (REPORT_STATUS_PENDING).
// The frontend (lib.moderation, lib.support-tickets) expects lowercase
// tokens ('pending') in a { data } / { data, pagination } envelope.
//
// Pure functions, no I/O — keeps the route handlers thin.

import {
  ModerationV1,
  type GetModerationMetricsResponse,
  type GetSupportTicketStatsResponse,
  type ModeratorAction,
  type Report,
  type SupportTicket,
  type SupportTicketResponse,
} from '@adopt-dont-shop/proto';

// Strip the SCREAMING prefix from a proto enum's JSON name and lowercase
// the rest — e.g. REPORT_STATUS_PENDING → 'pending'.
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

// proto-JSON envelopes (from ts-proto) — declared minimally so this
// module doesn't take a hard dep on every generated interface.
type ReportLike = Report & { evidence?: unknown[]; metadataJson?: string };

function parseJsonObject(json: string | undefined): Record<string, unknown> {
  if (!json || json === '{}') {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export type ReportView = {
  reportId: string;
  reporterId: string;
  reportedEntityType: string;
  reportedEntityId: string;
  reportedUserId: string | null;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  evidence: unknown[];
  metadata: Record<string, unknown>;
  assignedModerator: string | null;
  assignedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  resolutionNotes: string | null;
  escalatedTo: string | null;
  escalatedAt: string | null;
  escalationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export function reportToView(r: ReportLike): ReportView {
  return {
    reportId: r.reportId,
    reporterId: r.reporterId,
    reportedEntityType:
      tokenFromProto(
        ModerationV1.reportEntityTypeToJSON,
        r.reportedEntityType,
        'REPORT_ENTITY_TYPE_'
      ) ?? 'user',
    reportedEntityId: r.reportedEntityId,
    reportedUserId: r.reportedUserId ?? null,
    category:
      tokenFromProto(ModerationV1.reportCategoryToJSON, r.category, 'REPORT_CATEGORY_') ?? 'other',
    severity: tokenFromProto(ModerationV1.severityToJSON, r.severity, 'SEVERITY_') ?? 'low',
    status:
      tokenFromProto(ModerationV1.reportStatusToJSON, r.status, 'REPORT_STATUS_') ?? 'pending',
    title: r.title,
    description: r.description,
    evidence: r.evidence ?? [],
    metadata: parseJsonObject(r.metadataJson),
    assignedModerator: r.assignedModerator ?? null,
    assignedAt: r.assignedAt ?? null,
    resolvedBy: r.resolvedBy ?? null,
    resolvedAt: r.resolvedAt ?? null,
    resolution: r.resolution ?? null,
    resolutionNotes: r.resolutionNotes ?? null,
    escalatedTo: r.escalatedTo ?? null,
    escalatedAt: r.escalatedAt ?? null,
    escalationReason: r.escalationReason ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export type ModeratorActionView = {
  actionId: string;
  moderatorId: string;
  actionType: string;
  severity: string;
  reason: string;
  description: string | null;
  targetEntityType: string;
  targetEntityId: string;
  targetUserId: string | null;
  reportId: string | null;
  duration: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  expiresAt: string | null;
};

type ModeratorActionLike = ModeratorAction & { metadataJson?: string };

export function moderatorActionToView(a: ModeratorActionLike): ModeratorActionView {
  return {
    actionId: a.actionId,
    moderatorId: a.moderatorId,
    actionType:
      tokenFromProto(
        ModerationV1.moderatorActionTypeToJSON,
        a.actionType,
        'MODERATOR_ACTION_TYPE_'
      ) ?? 'no_action',
    severity: tokenFromProto(ModerationV1.severityToJSON, a.severity, 'SEVERITY_') ?? 'low',
    reason: a.reason,
    description: a.description ?? null,
    targetEntityType:
      tokenFromProto(
        ModerationV1.reportEntityTypeToJSON,
        a.targetEntityType,
        'REPORT_ENTITY_TYPE_'
      ) ?? 'user',
    targetEntityId: a.targetEntityId,
    targetUserId: a.targetUserId ?? null,
    reportId: a.reportId ?? null,
    duration: a.duration ?? null,
    metadata: parseJsonObject(a.metadataJson),
    createdAt: a.createdAt,
    expiresAt: a.expiresAt ?? null,
  };
}

export type SupportTicketView = {
  ticketId: string;
  userId: string | null;
  userEmail: string;
  userName: string | null;
  status: string;
  priority: string;
  category: string;
  subject: string;
  description: string;
  assignedTo: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
};

export function supportTicketToView(t: SupportTicket): SupportTicketView {
  return {
    ticketId: t.ticketId,
    userId: t.userId ?? null,
    userEmail: t.userEmail,
    userName: t.userName ?? null,
    status:
      tokenFromProto(ModerationV1.supportTicketStatusToJSON, t.status, 'SUPPORT_TICKET_STATUS_') ??
      'open',
    priority:
      tokenFromProto(
        ModerationV1.supportTicketPriorityToJSON,
        t.priority,
        'SUPPORT_TICKET_PRIORITY_'
      ) ?? 'normal',
    category:
      tokenFromProto(
        ModerationV1.supportTicketCategoryToJSON,
        t.category,
        'SUPPORT_TICKET_CATEGORY_'
      ) ?? 'other',
    subject: t.subject,
    description: t.description,
    assignedTo: t.assignedTo ?? null,
    tags: t.tags,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    resolvedAt: t.resolvedAt ?? null,
    closedAt: t.closedAt ?? null,
  };
}

export type SupportTicketResponseView = {
  responseId: string;
  ticketId: string;
  responderId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
};

export function supportTicketResponseToView(r: SupportTicketResponse): SupportTicketResponseView {
  return {
    responseId: r.responseId,
    ticketId: r.ticketId,
    responderId: r.responderId,
    content: r.content,
    isInternal: r.isInternal,
    createdAt: r.createdAt,
  };
}

// The thread view embeds the response list INSIDE the ticket, with the
// responder_type token each response needs — this is the shape the frontend
// SupportTicketSchema parses for the /messages endpoint (responses are a
// nested array on the ticket, not a sibling field).
export type SupportTicketThreadResponseView = {
  responseId: string;
  responderId: string;
  responderType: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
};

export type SupportTicketThreadView = SupportTicketView & {
  responses: SupportTicketThreadResponseView[];
};

export function supportTicketWithThreadToView(
  t: SupportTicket,
  responses: SupportTicketResponse[]
): SupportTicketThreadView {
  return {
    ...supportTicketToView(t),
    responses: responses.map(r => ({
      responseId: r.responseId,
      responderId: r.responderId,
      responderType:
        tokenFromProto(
          ModerationV1.supportTicketResponderTypeToJSON,
          r.responderType,
          'SUPPORT_TICKET_RESPONDER_TYPE_'
        ) ?? 'user',
      content: r.content,
      isInternal: r.isInternal,
      createdAt: r.createdAt,
    })),
  };
}

export type SupportTicketStatsView = {
  total: number;
  open: number;
  inProgress: number;
  waitingForUser: number;
  resolved: number;
  closed: number;
  escalated: number;
  overdue: number;
  unassigned: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  satisfactionAverage: number | null;
  ticketsToday: number;
  ticketsThisWeek: number;
  ticketsThisMonth: number;
  byPriority: { low: number; normal: number; high: number; urgent: number; critical: number };
  byCategory: Array<{ category: string; count: number }>;
  staffActivity: Array<{ staffId: string; assignedCount: number; resolvedCount: number }>;
};

// GetSupportTicketStats proto → the dashboard's TicketStats shape. Only the
// category enum needs token-lowering; the counts pass through. An absent
// satisfaction average is surfaced as null (the schema requires the key).
export function ticketStatsToView(s: GetSupportTicketStatsResponse): SupportTicketStatsView {
  return {
    total: s.total,
    open: s.open,
    inProgress: s.inProgress,
    waitingForUser: s.waitingForUser,
    resolved: s.resolved,
    closed: s.closed,
    escalated: s.escalated,
    overdue: s.overdue,
    unassigned: s.unassigned,
    averageResponseTime: s.averageResponseTime,
    averageResolutionTime: s.averageResolutionTime,
    satisfactionAverage: s.satisfactionAverage ?? null,
    ticketsToday: s.ticketsToday,
    ticketsThisWeek: s.ticketsThisWeek,
    ticketsThisMonth: s.ticketsThisMonth,
    byPriority: s.byPriority ?? { low: 0, normal: 0, high: 0, urgent: 0, critical: 0 },
    byCategory: s.byCategory.map(c => ({
      category:
        tokenFromProto(
          ModerationV1.supportTicketCategoryToJSON,
          c.category,
          'SUPPORT_TICKET_CATEGORY_'
        ) ?? 'other',
      count: c.count,
    })),
    staffActivity: s.staffActivity.map(a => ({
      staffId: a.staffId,
      assignedCount: a.assignedCount,
      resolvedCount: a.resolvedCount,
    })),
  };
}

export type ModerationMetricsView = {
  totalReports: number;
  pendingReports: number;
  underReviewReports: number;
  resolvedReports: number;
  dismissedReports: number;
  escalatedReports: number;
  criticalReports: number;
  averageResolutionTime: number;
  reportsToday: number;
  reportsThisWeek: number;
  reportsThisMonth: number;
  topCategories: Array<{ category: string; count: number }>;
  moderatorActivity: Array<{ moderatorId: string; actionsCount: number; resolvedCount: number }>;
};

// GetModerationMetrics proto → the dashboard's ModerationMetrics shape.
// Only the report-category enum needs token-lowering; the counts pass
// through and the moderator-activity rows are already frontend-shaped.
export function metricsToView(m: GetModerationMetricsResponse): ModerationMetricsView {
  return {
    totalReports: m.totalReports,
    pendingReports: m.pendingReports,
    underReviewReports: m.underReviewReports,
    resolvedReports: m.resolvedReports,
    dismissedReports: m.dismissedReports,
    escalatedReports: m.escalatedReports,
    criticalReports: m.criticalReports,
    averageResolutionTime: m.averageResolutionTime,
    reportsToday: m.reportsToday,
    reportsThisWeek: m.reportsThisWeek,
    reportsThisMonth: m.reportsThisMonth,
    topCategories: m.topCategories.map(c => ({
      category:
        tokenFromProto(ModerationV1.reportCategoryToJSON, c.category, 'REPORT_CATEGORY_') ??
        'other',
      count: c.count,
    })),
    moderatorActivity: m.moderatorActivity.map(a => ({
      moderatorId: a.moderatorId,
      actionsCount: a.actionsCount,
      resolvedCount: a.resolvedCount,
    })),
  };
}

// Wrap a single item in { data }.
export function dataEnvelope<T>(item: T): { data: T } {
  return { data: item };
}

// Wrap a list in { data, pagination } — lib.moderation uses keyset
// cursors under the hood but exposes a paginated view to the SPA.
export function listEnvelope<T>(
  items: T[],
  opts: { nextCursor?: string }
): { data: T[]; pagination: { hasNext: boolean; nextCursor?: string } } {
  return {
    data: items,
    pagination: {
      hasNext: opts.nextCursor !== undefined && opts.nextCursor !== '',
      ...(opts.nextCursor !== undefined && opts.nextCursor !== ''
        ? { nextCursor: opts.nextCursor }
        : {}),
    },
  };
}
