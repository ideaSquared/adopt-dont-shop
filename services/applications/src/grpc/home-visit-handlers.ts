// gRPC handlers — home-visit scheduling detail (ADS-1152).
//
// The home_visits / home_visit_status_transitions tables (migrations
// 004-006) hold the granular per-visit lifecycle (scheduled →
// in_progress → completed | cancelled) — non-aggregate operational
// detail alongside the event-sourced Application's single-visit
// summary (home_visit_scheduled_at / outcome / notes on
// ApplicationState). A home_visits row is created by ScheduleHomeVisit
// (review-handlers.ts) the first time an application's visit is
// scheduled; UpdateHomeVisit drives the granular status machine from
// there by INSERTing into home_visit_status_transitions — the AFTER
// INSERT trigger (migration 006) propagates the new status onto
// home_visits.status, so the status-machine invariant is enforced by
// the database, not re-implemented here.
//
// Both handlers run OUTSIDE a transaction (straight off deps.pool),
// matching document-handlers.ts's precedent for auxiliary,
// non-aggregate tables: a read, and a single UPDATE + optional INSERT
// pair against one row.

import { randomUUID } from 'node:crypto';

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { APPLICATIONS_PROCESS, APPLICATIONS_VIEW, type RescueId } from '@adopt-dont-shop/lib.types';
import type {
  HomeVisitRecord,
  ListHomeVisitsRequest,
  ListHomeVisitsResponse,
  UpdateHomeVisitRequest,
  UpdateHomeVisitResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { requireDraftAwareReadScope } from './command-runner.js';

const VALID_STATUSES = new Set(['scheduled', 'in_progress', 'completed', 'cancelled']);
const VALID_OUTCOMES = new Set(['approved', 'rejected', 'conditional']);

// Legal target statuses per current status — scheduled → in_progress →
// completed | cancelled, plus a same-status "update" (reschedule) which
// the caller signals by omitting `status` entirely (checked separately).
const ALLOWED_NEXT: Record<string, ReadonlyArray<string>> = {
  scheduled: ['scheduled', 'in_progress', 'cancelled'],
  in_progress: ['in_progress', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

type VisitRow = {
  visit_id: string;
  application_id: string;
  scheduled_date: string;
  scheduled_time: string;
  assigned_staff: string | null;
  status: string;
  notes: string | null;
  outcome: string | null;
  outcome_notes: string | null;
  reschedule_reason: string | null;
  cancelled_reason: string | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type OwnerRow = {
  user_id: string;
  rescue_id: string;
  status: string;
};

function toHomeVisitRecord(row: VisitRow): HomeVisitRecord {
  const record: HomeVisitRecord = {
    visitId: row.visit_id,
    applicationId: row.application_id,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
  if (row.assigned_staff !== null) {
    record.assignedStaff = row.assigned_staff;
  }
  if (row.notes !== null) {
    record.notes = row.notes;
  }
  if (row.outcome !== null) {
    record.outcome = row.outcome;
  }
  if (row.outcome_notes !== null) {
    record.outcomeNotes = row.outcome_notes;
  }
  if (row.reschedule_reason !== null) {
    record.rescheduleReason = row.reschedule_reason;
  }
  if (row.cancelled_reason !== null) {
    record.cancelledReason = row.cancelled_reason;
  }
  if (row.completed_at !== null) {
    record.completedAt = row.completed_at.toISOString();
  }
  return record;
}

function requireApplicationId(applicationId: string | undefined): string {
  if (applicationId === undefined || applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }
  return applicationId;
}

async function loadOwnerOrThrow(deps: HandlerDeps, applicationId: string): Promise<OwnerRow> {
  const { rows } = await deps.pool.query<OwnerRow>(
    `SELECT user_id, rescue_id, status FROM applications WHERE application_id = $1 AND deleted_at IS NULL`,
    [applicationId]
  );
  if (rows.length === 0) {
    throw new HandlerError('NOT_FOUND', 'application not found');
  }
  return rows[0];
}

// --- ListHomeVisits ----------------------------------------------------

export async function listHomeVisits(
  deps: HandlerDeps,
  principal: Principal,
  req: ListHomeVisitsRequest
): Promise<ListHomeVisitsResponse> {
  const applicationId = requireApplicationId(req.applicationId);
  const owner = await loadOwnerOrThrow(deps, applicationId);

  // ADS-1261: a draft application's home visits are private to the owning
  // adopter; rescue staff may read them only once it has left draft.
  requireDraftAwareReadScope(principal, APPLICATIONS_VIEW, {
    status: owner.status,
    adopterId: owner.user_id,
    rescueId: owner.rescue_id,
  });

  const { rows } = await deps.pool.query<VisitRow>(
    `SELECT visit_id, application_id, scheduled_date, scheduled_time, assigned_staff, status,
            notes, outcome, outcome_notes, reschedule_reason, cancelled_reason, completed_at,
            created_at, updated_at
       FROM home_visits
      WHERE application_id = $1
      ORDER BY created_at DESC`,
    [applicationId]
  );

  return { visits: rows.map(toHomeVisitRecord) };
}

// --- UpdateHomeVisit -----------------------------------------------------

export async function updateHomeVisit(
  deps: HandlerDeps,
  principal: Principal,
  req: UpdateHomeVisitRequest
): Promise<UpdateHomeVisitResponse> {
  const applicationId = requireApplicationId(req.applicationId);
  if (req.visitId === undefined || req.visitId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'visit_id is required');
  }

  const owner = await loadOwnerOrThrow(deps, applicationId);
  if (
    !requirePermission(principal, APPLICATIONS_PROCESS, { rescueId: owner.rescue_id as RescueId })
  ) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_PROCESS}' required`);
  }
  // ADS-1272 (defence-in-depth): refuse to mutate a home visit while the
  // application is still a private draft. A visit normally only exists
  // post-submission, but guard the write path for parity with the read scope.
  if (owner.status === 'draft') {
    throw new HandlerError('PERMISSION_DENIED', 'application is a draft');
  }

  const { rows } = await deps.pool.query<VisitRow>(
    `SELECT visit_id, application_id, scheduled_date, scheduled_time, assigned_staff, status,
            notes, outcome, outcome_notes, reschedule_reason, cancelled_reason, completed_at,
            created_at, updated_at
       FROM home_visits
      WHERE visit_id = $1 AND application_id = $2`,
    [req.visitId, applicationId]
  );
  const current = rows[0];
  if (current === undefined) {
    throw new HandlerError('NOT_FOUND', 'home visit not found');
  }

  if (req.status !== undefined) {
    if (!VALID_STATUSES.has(req.status)) {
      throw new HandlerError('INVALID_ARGUMENT', `invalid status '${req.status}'`);
    }
    const allowed = ALLOWED_NEXT[current.status] ?? [];
    if (req.status !== current.status && !allowed.includes(req.status)) {
      throw new HandlerError(
        'INVALID_ARGUMENT',
        `cannot transition home visit from '${current.status}' to '${req.status}'`
      );
    }
  }
  if (req.outcome !== undefined && !VALID_OUTCOMES.has(req.outcome)) {
    throw new HandlerError('INVALID_ARGUMENT', `invalid outcome '${req.outcome}'`);
  }

  await deps.pool.query(
    `UPDATE home_visits SET
       scheduled_date = COALESCE($1, scheduled_date),
       scheduled_time = COALESCE($2, scheduled_time),
       assigned_staff = COALESCE($3, assigned_staff),
       notes = COALESCE($4, notes),
       outcome = COALESCE($5, outcome),
       outcome_notes = COALESCE($6, outcome_notes),
       reschedule_reason = COALESCE($7, reschedule_reason),
       cancelled_reason = COALESCE($8, cancelled_reason),
       completed_at = COALESCE($9, completed_at),
       updated_by = $10,
       updated_at = now()
     WHERE visit_id = $11`,
    [
      req.scheduledDate ?? null,
      req.scheduledTime ?? null,
      req.assignedStaff ?? null,
      req.notes ?? null,
      req.outcome ?? null,
      req.outcomeNotes ?? null,
      req.rescheduleReason ?? null,
      req.cancelledReason ?? null,
      req.completedAt ?? null,
      principal.userId,
      req.visitId,
    ]
  );

  // A status transition is logged via the append-only transitions table
  // — the AFTER INSERT trigger (migration 006) propagates it onto
  // home_visits.status. Omitting `status` (a plain reschedule) or
  // resending the current status skips this so no spurious transition
  // row is written.
  if (req.status !== undefined && req.status !== current.status) {
    await deps.pool.query(
      `INSERT INTO home_visit_status_transitions
         (transition_id, visit_id, from_status, to_status, transitioned_by, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        randomUUID(),
        req.visitId,
        current.status,
        req.status,
        principal.userId,
        req.rescheduleReason ?? req.cancelledReason ?? null,
      ]
    );
  }

  const { rows: after } = await deps.pool.query<VisitRow>(
    `SELECT visit_id, application_id, scheduled_date, scheduled_time, assigned_staff, status,
            notes, outcome, outcome_notes, reschedule_reason, cancelled_reason, completed_at,
            created_at, updated_at
       FROM home_visits
      WHERE visit_id = $1`,
    [req.visitId]
  );

  return { visit: toHomeVisitRecord(after[0]) };
}
