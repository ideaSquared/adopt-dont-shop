// Stage B (ADR 0002) — applications response adapter.
//
// The service.applications gRPC surface returns proto-JSON that diverges
// from the frontend's `ApplicationSchema` (lib.applications). This module
// is the read-side translation: a decoded proto `Application` →
// the frontend's view shape, so the gateway serves a shape the SPA's Zod
// parse accepts unchanged.
//
// Two divergences handled here:
//
//  1. Status collapse. The service has a 9-state lifecycle; the frontend
//     has a 4-value `status` plus a finer optional `stage`. We map each
//     service state onto a (status, stage) pair — the `stage` enum was
//     clearly designed for exactly this granularity. `draft` and the
//     UNSPECIFIED sentinel map to null: a draft is not a frontend-visible
//     "application" (the SPA's status enum has no draft), so the read
//     routes filter those out / 404 them.
//
//  2. Field + envelope shape. applicationId→id, adopterId→userId, the
//     `answersJson` blob → the nested `data` object, and the frontend
//     wraps every payload in `{ data: ... }` (the routes do the wrap).
//
// Pure functions, no I/O — unit-tested against the frontend's required
// fields. The WRITE path (1 REST call → N gRPC commands), stats, and
// documents are separate Stage B follow-ups; so is the data migration
// that must backfill the (currently empty) event store before any flip.

import {
  ApplicationsV1,
  type Application,
  type GetStatsResponse,
  type HomeVisitRecord,
  type ReferenceCheck,
  type TimelineEntry,
  type TimelineNote,
} from '@adopt-dont-shop/proto';

type FrontendStatus = 'submitted' | 'approved' | 'rejected' | 'withdrawn';
type FrontendStage = 'pending' | 'reviewing' | 'visiting' | 'deciding' | 'resolved' | 'withdrawn';

// The frontend ApplicationSchema view. Only id/petId/userId/rescueId/
// status/createdAt/updatedAt are required there; the rest are
// optional/nullish, so we emit null for "not reached yet" and omit
// `data` when there are no answers.
export type ApplicationView = {
  id: string;
  petId: string;
  userId: string;
  rescueId: string;
  status: FrontendStatus;
  stage: FrontendStage;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  data?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const S = ApplicationsV1.ApplicationStatus;

// 9 service states → (frontend status, stage). null = not shown to the
// frontend (draft / unspecified): the SPA has no way to render it.
const STATUS_VIEW: ReadonlyMap<number, { status: FrontendStatus; stage: FrontendStage } | null> =
  new Map([
    [S.APPLICATION_STATUS_UNSPECIFIED, null],
    [S.APPLICATION_STATUS_DRAFT, null],
    [S.APPLICATION_STATUS_SUBMITTED, { status: 'submitted', stage: 'pending' }],
    [S.APPLICATION_STATUS_UNDER_REVIEW, { status: 'submitted', stage: 'reviewing' }],
    [S.APPLICATION_STATUS_HOME_VISIT_SCHEDULED, { status: 'submitted', stage: 'visiting' }],
    [S.APPLICATION_STATUS_HOME_VISIT_COMPLETED, { status: 'submitted', stage: 'deciding' }],
    [S.APPLICATION_STATUS_APPROVED, { status: 'approved', stage: 'resolved' }],
    [S.APPLICATION_STATUS_REJECTED, { status: 'rejected', stage: 'resolved' }],
    [S.APPLICATION_STATUS_WITHDRAWN, { status: 'withdrawn', stage: 'withdrawn' }],
    // Post-adoption is still "approved" to the SPA; the pet collection is
    // surfaced elsewhere.
    [S.APPLICATION_STATUS_ADOPTED, { status: 'approved', stage: 'resolved' }],
  ]);

// True when the application has no frontend-visible representation
// (draft / unspecified) — the read routes skip these.
export function isHiddenFromFrontend(app: Application): boolean {
  const mapped = STATUS_VIEW.get(app.status);
  return mapped === undefined || mapped === null;
}

// Map a decoded proto Application to the frontend view, or null when the
// application is not frontend-visible (draft / unspecified).
export function applicationToView(app: Application): ApplicationView | null {
  const mapped = STATUS_VIEW.get(app.status);
  if (mapped === undefined || mapped === null) {
    return null;
  }

  const view: ApplicationView = {
    id: app.applicationId,
    petId: app.petId,
    userId: app.adopterId,
    rescueId: app.rescueId,
    status: mapped.status,
    stage: mapped.stage,
    submittedAt: app.submittedAt ?? null,
    // "reviewed" on the frontend means the decision (or, before that, the
    // review opening). Prefer the decision timestamp.
    reviewedAt: app.decidedAt ?? app.reviewStartedAt ?? null,
    reviewedBy: app.decidedBy ?? null,
    reviewNotes: app.decisionNotes ?? app.rejectionReason ?? null,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };

  const data = parseAnswers(app.answersJson);
  if (data !== undefined) {
    view.data = data;
  }

  return view;
}

// The frontend ApplicationStatsSchema — counts the rescue dashboard shows.
export type StatsView = {
  total: number;
  submitted: number;
  underReview: number;
  approved: number;
  rejected: number;
  pendingReferences: number;
};

// Collapse the service's raw per-status counts (GetStats) onto the
// frontend's stats shape, the same collapse `applicationToView` applies
// to a single application:
//   - drafts are not frontend-visible → excluded from `total`.
//   - the review/visit states fold into `underReview`.
//   - `adopted` counts as `approved`.
//   - `pendingReferences` has no service equivalent → 0.
export function statsToView(stats: GetStatsResponse): StatsView {
  const underReview = stats.underReview + stats.homeVisitScheduled + stats.homeVisitCompleted;
  const approved = stats.approved + stats.adopted;
  return {
    total: stats.total - stats.draft,
    submitted: stats.submitted,
    underReview,
    approved,
    rejected: stats.rejected,
    pendingReferences: 0,
  };
}

// answersJson is the opaque blob the write path stored (the frontend's
// own nested `data` object round-trips through it). Empty / invalid → omit
// `data` entirely (the field is optional on the frontend schema).
function parseAnswers(answersJson: string | undefined): Record<string, unknown> | undefined {
  if (answersJson === undefined || answersJson === '' || answersJson === '{}') {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(answersJson);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

// --- Document view -----------------------------------------------------
//
// The proto Document carries `documentId`; the frontend Document /
// DocumentUpload schemas want `id`. Otherwise a 1:1 field rename.

export type DocumentView = {
  id: string;
  applicationId: string;
  type: string;
  filename: string;
  url: string;
  uploadedAt: string;
  size?: number;
  mimeType?: string;
};

type ProtoDocument = {
  documentId: string;
  applicationId: string;
  type: string;
  filename: string;
  url: string;
  uploadedAt: string;
  size?: number;
  mimeType?: string;
};

export function documentToView(d: ProtoDocument): DocumentView {
  const view: DocumentView = {
    id: d.documentId,
    applicationId: d.applicationId,
    type: d.type,
    filename: d.filename,
    url: d.url,
    uploadedAt: d.uploadedAt,
  };
  if (d.size !== undefined) {
    view.size = d.size;
  }
  if (d.mimeType !== undefined) {
    view.mimeType = d.mimeType;
  }
  return view;
}

// --- Home visit view (ADS-1152) -----------------------------------------
//
// The proto HomeVisitRecord → the rescue app's HomeVisit shape
// (apps/rescue/src/types/applications.ts). rescheduleReason has no
// matching HomeVisit field (the frontend never reads it back); carried
// through as an extra property is harmless.

export type HomeVisitView = {
  id: string;
  applicationId: string;
  scheduledDate: string;
  scheduledTime: string;
  assignedStaff: string;
  status: string;
  notes?: string;
  outcome?: string;
  outcomeNotes?: string;
  cancelReason?: string;
  completedAt?: string;
};

export function homeVisitToView(v: HomeVisitRecord): HomeVisitView {
  const view: HomeVisitView = {
    id: v.visitId,
    applicationId: v.applicationId,
    scheduledDate: v.scheduledDate,
    scheduledTime: v.scheduledTime,
    assignedStaff: v.assignedStaff ?? '',
    status: v.status,
  };
  if (v.notes !== undefined) {
    view.notes = v.notes;
  }
  if (v.outcome !== undefined) {
    view.outcome = v.outcome;
  }
  if (v.outcomeNotes !== undefined) {
    view.outcomeNotes = v.outcomeNotes;
  }
  if (v.cancelledReason !== undefined) {
    view.cancelReason = v.cancelledReason;
  }
  if (v.completedAt !== undefined) {
    view.completedAt = v.completedAt;
  }
  return view;
}

// --- Reference check view (ADS-1140) --------------------------------------

export type ReferenceCheckView = {
  id: string;
  applicationId: string;
  name: string;
  email: string;
  relationship: string;
  status: string;
  notes?: string;
  contactedAt?: string;
  contactedBy?: string;
};

export function referenceCheckToView(r: ReferenceCheck): ReferenceCheckView {
  const view: ReferenceCheckView = {
    id: r.referenceId,
    applicationId: r.applicationId,
    name: r.name,
    email: r.email,
    relationship: r.relationship,
    status: r.status,
  };
  if (r.notes !== undefined) {
    view.notes = r.notes;
  }
  if (r.contactedAt !== undefined) {
    view.contactedAt = r.contactedAt;
  }
  if (r.contactedBy !== undefined) {
    view.contactedBy = r.contactedBy;
  }
  return view;
}

// --- Timeline view (ADS-1139) ---------------------------------------------
//
// Composes the event-sourced status-transition timeline (GetApplication's
// include_timeline) with the plain-table timeline notes into the shape
// apps/rescue's getApplicationTimeline() transformer already tolerates
// (snake_case field names — it checks both cases). Both entry kinds map
// onto the same RawTimelineItem-ish shape so the SPA renders one merged,
// chronological list.

export type TimelineItemView = {
  id: string;
  application_id: string;
  event_type: string;
  title: string;
  description: string;
  created_at: string;
  created_by: string;
  previous_status?: string;
  new_status?: string;
};

// The proto's SCREAMING_SNAKE JSON name (APPLICATION_STATUS_UNDER_REVIEW)
// collapsed to the DB-style label (under_review) the frontend renders.
function statusLabel(status: ApplicationsV1.ApplicationStatus): string {
  return ApplicationsV1.applicationStatusToJSON(status)
    .replace('APPLICATION_STATUS_', '')
    .toLowerCase();
}

export function timelineEntryToView(e: TimelineEntry): TimelineItemView {
  const newStatus = statusLabel(e.toStatus);
  return {
    id: e.entryId,
    application_id: e.applicationId,
    event_type: 'status_change',
    title: 'Status changed',
    description: e.note ?? `Status changed to ${newStatus}`,
    created_at: e.occurredAt,
    created_by: e.actorUserId,
    previous_status: statusLabel(e.fromStatus),
    new_status: newStatus,
  };
}

export function timelineNoteToView(n: TimelineNote): TimelineItemView {
  return {
    id: n.noteId,
    application_id: n.applicationId,
    event_type: n.noteType,
    title: n.title,
    description: n.description,
    created_at: n.createdAt,
    created_by: n.createdBy,
  };
}

// Merge the two timeline sources chronologically (oldest first).
export function buildTimeline(
  entries: ReadonlyArray<TimelineEntry>,
  notes: ReadonlyArray<TimelineNote>
): TimelineItemView[] {
  return [...entries.map(timelineEntryToView), ...notes.map(timelineNoteToView)].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
}

export type TimelineStatsView = {
  totalEvents: number;
  lastActivity?: string;
  eventTypeCounts: Record<string, number>;
};

export function buildTimelineStats(items: ReadonlyArray<TimelineItemView>): TimelineStatsView {
  const eventTypeCounts: Record<string, number> = {};
  for (const item of items) {
    eventTypeCounts[item.event_type] = (eventTypeCounts[item.event_type] ?? 0) + 1;
  }
  const stats: TimelineStatsView = { totalEvents: items.length, eventTypeCounts };
  const last = [...items].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (last !== undefined) {
    stats.lastActivity = last.created_at;
  }
  return stats;
}
