// Row → proto mappers for UserSanction + SupportTicket +
// SupportTicketResponse. Completes the moderation row-mapper set
// (Report + ReportStatusTransition in mapper.ts, ModeratorAction +
// Evidence in action-evidence-mapper.ts, this file ships the rest).
//
// DB row shapes mirror moderation.user_sanctions +
// moderation.support_tickets + moderation.support_ticket_responses
// from #886. Proto messages are UserSanction + SupportTicket +
// SupportTicketResponse from #889. Pure functions — no I/O.

import type { SupportTicket, SupportTicketResponse, UserSanction } from '@adopt-dont-shop/proto';

import {
  responderTypeFromDb,
  sanctionReasonFromDb,
  sanctionTypeFromDb,
  ticketCategoryFromDb,
  ticketPriorityFromDb,
  ticketStatusFromDb,
} from './enum-map.js';

// --- UserSanction row → proto ----------------------------------------

export type UserSanctionRow = {
  sanction_id: string;
  user_id: string;
  sanction_type: string;
  reason: string;
  description: string;
  is_active: boolean;
  start_date: Date;
  end_date: Date | null;
  duration: number | null;
  issued_by: string;
  report_id: string | null;
  moderator_action_id: string | null;
  appealed_at: Date | null;
  appeal_reason: string | null;
  // appeal_status is a Postgres enum (pending / approved / rejected)
  // but the proto carries it as an `optional string` so the gateway
  // forwards the raw value unchanged. No enum-map dispatch here.
  appeal_status: string | null;
  acknowledged_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export function sanctionRowToProto(row: UserSanctionRow): UserSanction {
  const sanction: UserSanction = {
    sanctionId: row.sanction_id,
    userId: row.user_id,
    sanctionType: sanctionTypeFromDb(row.sanction_type),
    reason: sanctionReasonFromDb(row.reason),
    description: row.description,
    isActive: row.is_active,
    startDate: row.start_date.toISOString(),
    issuedBy: row.issued_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };

  if (row.end_date !== null) {
    sanction.endDate = row.end_date.toISOString();
  }
  if (row.duration !== null) {
    sanction.duration = row.duration;
  }
  if (row.report_id !== null) {
    sanction.reportId = row.report_id;
  }
  if (row.moderator_action_id !== null) {
    sanction.moderatorActionId = row.moderator_action_id;
  }
  if (row.appealed_at !== null) {
    sanction.appealedAt = row.appealed_at.toISOString();
  }
  if (row.appeal_reason !== null) {
    sanction.appealReason = row.appeal_reason;
  }
  if (row.appeal_status !== null) {
    sanction.appealStatus = row.appeal_status;
  }
  if (row.acknowledged_at !== null) {
    sanction.acknowledgedAt = row.acknowledged_at.toISOString();
  }

  return sanction;
}

// --- SupportTicket row → proto ---------------------------------------

export type SupportTicketRow = {
  ticket_id: string;
  user_id: string | null;
  user_email: string;
  user_name: string | null;
  assigned_to: string | null;
  status: string;
  priority: string;
  category: string;
  subject: string;
  description: string;
  tags: string[];
  metadata: unknown;
  first_response_at: Date | null;
  last_response_at: Date | null;
  resolved_at: Date | null;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export function ticketRowToProto(row: SupportTicketRow): SupportTicket {
  const ticket: SupportTicket = {
    ticketId: row.ticket_id,
    userEmail: row.user_email,
    status: ticketStatusFromDb(row.status),
    priority: ticketPriorityFromDb(row.priority),
    category: ticketCategoryFromDb(row.category),
    subject: row.subject,
    description: row.description,
    tags: row.tags,
    metadataJson: JSON.stringify(row.metadata ?? {}),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };

  if (row.user_id !== null) {
    ticket.userId = row.user_id;
  }
  if (row.user_name !== null) {
    ticket.userName = row.user_name;
  }
  if (row.assigned_to !== null) {
    ticket.assignedTo = row.assigned_to;
  }
  if (row.first_response_at !== null) {
    ticket.firstResponseAt = row.first_response_at.toISOString();
  }
  if (row.last_response_at !== null) {
    ticket.lastResponseAt = row.last_response_at.toISOString();
  }
  if (row.resolved_at !== null) {
    ticket.resolvedAt = row.resolved_at.toISOString();
  }
  if (row.closed_at !== null) {
    ticket.closedAt = row.closed_at.toISOString();
  }

  return ticket;
}

// --- SupportTicketResponse row → proto -------------------------------

export type SupportTicketResponseRow = {
  response_id: string;
  ticket_id: string;
  responder_id: string;
  responder_type: string;
  content: string;
  is_internal: boolean;
  created_at: Date;
};

export function responseRowToProto(row: SupportTicketResponseRow): SupportTicketResponse {
  return {
    responseId: row.response_id,
    ticketId: row.ticket_id,
    responderId: row.responder_id,
    responderType: responderTypeFromDb(row.responder_type),
    content: row.content,
    isInternal: row.is_internal,
    createdAt: row.created_at.toISOString(),
  };
}
