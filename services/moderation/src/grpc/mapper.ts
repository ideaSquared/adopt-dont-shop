// Row → proto mappers for Report + ReportStatusTransition.
//
// DB row shapes mirror moderation.reports + moderation.report_status_transitions
// from #886. Proto messages are Report + ReportStatusTransition from
// #889. Pure functions — no I/O.
//
// metadata JSONB column stringifies via JSON.stringify; null
// normalises to '{}' (blob trick — same as pets extra_json /
// rescue settings_json / applications answers_json).
//
// The other moderation row mappers (ModeratorAction, Evidence,
// UserSanction, SupportTicket, SupportTicketResponse) port in
// follow-up PRs to keep diffs reviewable.

import type { Report, ReportStatusTransition } from '@adopt-dont-shop/proto';

import {
  categoryFromDb,
  entityTypeFromDb,
  reportStatusFromDb,
  severityFromDb,
} from './enum-map.js';

// --- Report row → proto ----------------------------------------------

export type ReportRow = {
  report_id: string;
  reporter_id: string;
  reported_entity_type: string;
  reported_entity_id: string;
  reported_user_id: string | null;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  metadata: unknown;
  assigned_moderator: string | null;
  assigned_at: Date | null;
  resolved_by: string | null;
  resolved_at: Date | null;
  resolution: string | null;
  resolution_notes: string | null;
  escalated_to: string | null;
  escalated_at: Date | null;
  escalation_reason: string | null;
  created_at: Date;
  updated_at: Date;
};

export function reportRowToProto(row: ReportRow): Report {
  const report: Report = {
    reportId: row.report_id,
    reporterId: row.reporter_id,
    reportedEntityType: entityTypeFromDb(row.reported_entity_type),
    reportedEntityId: row.reported_entity_id,
    category: categoryFromDb(row.category),
    severity: severityFromDb(row.severity),
    status: reportStatusFromDb(row.status),
    title: row.title,
    description: row.description,
    metadataJson: JSON.stringify(row.metadata ?? {}),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };

  if (row.reported_user_id !== null) {
    report.reportedUserId = row.reported_user_id;
  }
  if (row.assigned_moderator !== null) {
    report.assignedModerator = row.assigned_moderator;
  }
  if (row.assigned_at !== null) {
    report.assignedAt = row.assigned_at.toISOString();
  }
  if (row.resolved_by !== null) {
    report.resolvedBy = row.resolved_by;
  }
  if (row.resolved_at !== null) {
    report.resolvedAt = row.resolved_at.toISOString();
  }
  if (row.resolution !== null) {
    report.resolution = row.resolution;
  }
  if (row.resolution_notes !== null) {
    report.resolutionNotes = row.resolution_notes;
  }
  if (row.escalated_to !== null) {
    report.escalatedTo = row.escalated_to;
  }
  if (row.escalated_at !== null) {
    report.escalatedAt = row.escalated_at.toISOString();
  }
  if (row.escalation_reason !== null) {
    report.escalationReason = row.escalation_reason;
  }

  return report;
}

// --- ReportStatusTransition row → proto ------------------------------

export type ReportStatusTransitionRow = {
  transition_id: string;
  report_id: string;
  // from_status is NULL on the first transition (report creation —
  // status goes from "implicit none" to 'pending'). The proto's
  // from_status is `optional` so we omit rather than set to a
  // sentinel.
  from_status: string | null;
  to_status: string;
  transitioned_at: Date;
  transitioned_by: string | null;
  reason: string | null;
};

export function transitionRowToProto(row: ReportStatusTransitionRow): ReportStatusTransition {
  const transition: ReportStatusTransition = {
    transitionId: row.transition_id,
    reportId: row.report_id,
    toStatus: reportStatusFromDb(row.to_status),
    transitionedAt: row.transitioned_at.toISOString(),
  };

  if (row.from_status !== null) {
    transition.fromStatus = reportStatusFromDb(row.from_status);
  }
  if (row.transitioned_by !== null) {
    transition.transitionedBy = row.transitioned_by;
  }
  if (row.reason !== null) {
    transition.reason = row.reason;
  }

  return transition;
}
