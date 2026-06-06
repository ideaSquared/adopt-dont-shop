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
