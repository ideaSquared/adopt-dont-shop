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

import { ApplicationsV1, type Application, type GetStatsResponse } from '@adopt-dont-shop/proto';

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
