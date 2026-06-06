// Row → proto mappers for Application + TimelineEntry.
//
// The DB row shapes mirror the applications + application_status_transitions
// tables from #887. The proto messages are the Application + TimelineEntry
// types from #878. Pure functions — no I/O, no logger.
//
// Two transformations worth flagging:
//   - JSONB columns (answers, references) stringify via JSON.stringify.
//     Empty objects/arrays normalise to '{}' / '[]' so the SPA never has
//     to handle the JSON `null` literal (the blob trick — pets extra_json,
//     rescue settings_json, moderation metadata_json).
//   - NULL optional timestamp + outcome columns are omitted from the
//     proto rather than set to a sentinel; the proto's `optional`
//     fields carry the semantic "this stage hasn't happened yet".

import type { Application, ApplicationsV1, TimelineEntry } from '@adopt-dont-shop/proto';

import { homeVisitOutcomeFromDb, statusFromDb } from './enum-map.js';

// --- Application row → proto -----------------------------------------

export type ApplicationRow = {
  application_id: string;
  user_id: string;
  pet_id: string;
  rescue_id: string;
  status: string;
  version: number;
  answers: unknown;
  references: unknown;
  submitted_at: Date | null;
  review_started_at: Date | null;
  home_visit_scheduled_at: Date | null;
  home_visit_completed_at: Date | null;
  home_visit_outcome: string | null;
  home_visit_notes: string | null;
  decided_at: Date | null;
  decided_by: string | null;
  decision_notes: string | null;
  rejection_reason: string | null;
  adopted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export function applicationRowToProto(row: ApplicationRow): Application {
  const app: Application = {
    applicationId: row.application_id,
    adopterId: row.user_id,
    petId: row.pet_id,
    rescueId: row.rescue_id,
    status: statusFromDb(row.status),
    answersJson: JSON.stringify(row.answers ?? {}),
    referencesJson: JSON.stringify(row.references ?? []),
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };

  if (row.submitted_at !== null) {
    app.submittedAt = row.submitted_at.toISOString();
  }
  if (row.review_started_at !== null) {
    app.reviewStartedAt = row.review_started_at.toISOString();
  }
  if (row.home_visit_scheduled_at !== null) {
    app.homeVisitScheduledAt = row.home_visit_scheduled_at.toISOString();
  }
  if (row.home_visit_completed_at !== null) {
    app.homeVisitCompletedAt = row.home_visit_completed_at.toISOString();
  }
  if (row.home_visit_outcome !== null) {
    app.homeVisitOutcome = homeVisitOutcomeFromDb(row.home_visit_outcome);
  }
  if (row.home_visit_notes !== null) {
    app.homeVisitNotes = row.home_visit_notes;
  }
  if (row.decided_at !== null) {
    app.decidedAt = row.decided_at.toISOString();
  }
  if (row.decided_by !== null) {
    app.decidedBy = row.decided_by;
  }
  if (row.decision_notes !== null) {
    app.decisionNotes = row.decision_notes;
  }
  if (row.rejection_reason !== null) {
    app.rejectionReason = row.rejection_reason;
  }
  if (row.adopted_at !== null) {
    app.adoptedAt = row.adopted_at.toISOString();
  }

  return app;
}

// --- TimelineEntry row → proto ---------------------------------------

export type TimelineEntryRow = {
  transition_id: string;
  application_id: string;
  // from_status is NULL on the first transition (draft creation); the
  // proto requires it so we surface UNSPECIFIED for that case rather
  // than dropping the entry. (The SPA renders "Application started"
  // for from_status=UNSPECIFIED.)
  from_status: string | null;
  to_status: string;
  // The principal whose command produced the transition. Soft pointer
  // to auth.users.
  transitioned_by: string | null;
  transitioned_at: Date;
  reason: string | null;
};

export function timelineRowToProto(row: TimelineEntryRow): TimelineEntry {
  const entry: TimelineEntry = {
    entryId: row.transition_id,
    applicationId: row.application_id,
    fromStatus:
      row.from_status === null
        ? (0 as ApplicationsV1.ApplicationStatus)
        : statusFromDb(row.from_status),
    toStatus: statusFromDb(row.to_status),
    actorUserId: row.transitioned_by ?? '',
    occurredAt: row.transitioned_at.toISOString(),
  };

  if (row.reason !== null) {
    entry.note = row.reason;
  }

  return entry;
}
