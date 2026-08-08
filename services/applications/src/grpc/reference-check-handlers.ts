// gRPC handler — UpdateReferenceCheck (ADS-1140).
//
// Minimal-viable reference-check workflow: rescue staff record the
// contact outcome for a referee named on an application. The referee
// list itself stays the event-sourced Application.references_json
// (name / email / relationship — SaveDraftAnswers replaces it
// wholesale); this handler only tracks operational status ABOUT a
// referee (pending → contacted → completed | failed) in the plain
// application_reference_checks table, so it's a raw-SQL handler, not a
// domain command, per the applications service's architecture split.
//
// A row is seeded lazily from the application's stored references list
// the first time a given reference_id is touched — there is no separate
// "create" RPC. Runs OUTSIDE a transaction (straight off deps.pool),
// matching document-handlers.ts's precedent for auxiliary tables.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { APPLICATIONS_PROCESS, type RescueId } from '@adopt-dont-shop/lib.types';
import type {
  ReferenceCheck,
  UpdateReferenceCheckRequest,
  UpdateReferenceCheckResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';

const VALID_STATUSES = new Set(['pending', 'contacted', 'completed', 'failed']);

type ApplicationRow = {
  rescue_id: string;
  documents: { references?: ReadonlyArray<StoredReference> } | null;
};

type StoredReference = {
  name?: unknown;
  email?: unknown;
  relationship?: unknown;
};

type CheckRow = {
  reference_id: string;
  application_id: string;
  name: string;
  email: string;
  relationship: string;
  status: string;
  notes: string | null;
  contacted_at: Date | null;
  contacted_by: string | null;
};

function toReferenceCheck(row: CheckRow): ReferenceCheck {
  const check: ReferenceCheck = {
    referenceId: row.reference_id,
    applicationId: row.application_id,
    name: row.name,
    email: row.email,
    relationship: row.relationship,
    status: row.status,
  };
  if (row.notes !== null) {
    check.notes = row.notes;
  }
  if (row.contacted_at !== null) {
    check.contactedAt = row.contacted_at.toISOString();
  }
  if (row.contacted_by !== null) {
    check.contactedBy = row.contacted_by;
  }
  return check;
}

// The event-sourced references list identifies a referee by array
// position; the frontend mints "ref-<index>" ids off that same
// position (RescueApplicationService.getReferenceChecks). Extract the
// matching stored reference, if any, to seed name/email/relationship on
// first touch.
function findStoredReference(
  application: ApplicationRow,
  referenceId: string
): StoredReference | undefined {
  const match = /^ref-(\d+)$/.exec(referenceId);
  if (match === null) {
    return undefined;
  }
  const index = Number.parseInt(match[1], 10);
  return application.documents?.references?.[index];
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function updateReferenceCheck(
  deps: HandlerDeps,
  principal: Principal,
  req: UpdateReferenceCheckRequest
): Promise<UpdateReferenceCheckResponse> {
  if (req.applicationId === undefined || req.applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }
  if (req.referenceId === undefined || req.referenceId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'reference_id is required');
  }
  if (req.status !== undefined && !VALID_STATUSES.has(req.status)) {
    throw new HandlerError('INVALID_ARGUMENT', `invalid status '${req.status}'`);
  }

  const { rows } = await deps.pool.query<ApplicationRow>(
    `SELECT rescue_id, documents FROM applications WHERE application_id = $1 AND deleted_at IS NULL`,
    [req.applicationId]
  );
  const application = rows[0];
  if (application === undefined) {
    throw new HandlerError('NOT_FOUND', 'application not found');
  }
  if (
    !requirePermission(principal, APPLICATIONS_PROCESS, {
      rescueId: application.rescue_id as RescueId,
    })
  ) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_PROCESS}' required`);
  }

  const stored = findStoredReference(application, req.referenceId);
  const name = asString(stored?.name);
  const email = asString(stored?.email);
  const relationship = asString(stored?.relationship);

  const { rows: upserted } = await deps.pool.query<CheckRow>(
    `INSERT INTO application_reference_checks
       (application_id, reference_id, name, email, relationship, status, notes, contacted_at, contacted_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'pending'), $7, $8, $9, now())
     ON CONFLICT (application_id, reference_id) DO UPDATE SET
       status = COALESCE($6, application_reference_checks.status),
       notes = COALESCE($7, application_reference_checks.notes),
       contacted_at = COALESCE($8, application_reference_checks.contacted_at),
       contacted_by = COALESCE($9, application_reference_checks.contacted_by),
       updated_at = now()
     RETURNING reference_id, application_id, name, email, relationship, status, notes, contacted_at, contacted_by`,
    [
      req.applicationId,
      req.referenceId,
      name,
      email,
      relationship,
      req.status ?? null,
      req.notes ?? null,
      req.contactedAt ?? null,
      principal.userId,
    ]
  );

  return { reference: toReferenceCheck(upserted[0]) };
}
