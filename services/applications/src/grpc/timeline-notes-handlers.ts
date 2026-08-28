// gRPC handlers — application timeline notes (ADS-1139, add + list).
//
// Free-text notes rescue staff attach to an application's timeline —
// separate from the event-sourced status-transition timeline
// (application_events, folded by timeline.ts / read-handlers.ts's Get).
// The gateway composes the two into the SPA's combined timeline view.
// Plain non-aggregate data (not a domain command): both handlers run
// OUTSIDE a transaction (straight off deps.pool), matching
// document-handlers.ts's precedent — a single INSERT / SELECT.
//
// Authz mirrors document-handlers.ts: adopter-owns OR
// rescue-staff-of-this-rescue OR admin for reads; APPLICATIONS_UPDATE
// with the same scope for writes (a rescue-staff/adopter note, not a
// staff-only action — an adopter may want to leave a note for
// themselves too).

import { randomUUID } from 'node:crypto';

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import {
  APPLICATIONS_UPDATE,
  APPLICATIONS_VIEW,
  type Permission,
  type RescueId,
  type UserId,
} from '@adopt-dont-shop/lib.types';
import type {
  AddTimelineNoteRequest,
  AddTimelineNoteResponse,
  ListTimelineNotesRequest,
  ListTimelineNotesResponse,
  TimelineNote,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { requireDraftAwareReadScope } from './command-runner.js';

type NoteRow = {
  note_id: string;
  application_id: string;
  title: string;
  description: string;
  note_type: string;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: Date;
};

type OwnerRow = {
  user_id: string;
  rescue_id: string;
  status: string;
};

function toTimelineNote(row: NoteRow): TimelineNote {
  return {
    noteId: row.note_id,
    applicationId: row.application_id,
    title: row.title,
    description: row.description,
    noteType: row.note_type,
    metadataJson: JSON.stringify(row.metadata ?? {}),
    createdBy: row.created_by ?? '',
    createdAt: row.created_at.toISOString(),
  };
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

function assertOwnerOrRescue(principal: Principal, owner: OwnerRow, permission: Permission): void {
  const ok =
    requirePermission(principal, permission, { userId: owner.user_id as UserId }) ||
    requirePermission(principal, permission, { rescueId: owner.rescue_id as RescueId });
  if (!ok) {
    throw new HandlerError('PERMISSION_DENIED', `'${permission}' required`);
  }
}

function parseMetadata(raw: string | undefined): Record<string, unknown> {
  if (raw === undefined || raw === '') {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HandlerError('INVALID_ARGUMENT', 'metadata_json must be valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new HandlerError('INVALID_ARGUMENT', 'metadata_json must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

// --- AddTimelineNote -----------------------------------------------------

export async function addTimelineNote(
  deps: HandlerDeps,
  principal: Principal,
  req: AddTimelineNoteRequest
): Promise<AddTimelineNoteResponse> {
  if (req.applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }
  if (req.title === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'title is required');
  }
  const owner = await loadOwnerOrThrow(deps, req.applicationId);
  assertOwnerOrRescue(principal, owner, APPLICATIONS_UPDATE);

  const metadata = parseMetadata(req.metadataJson);

  const { rows } = await deps.pool.query<NoteRow>(
    `INSERT INTO application_timeline_notes
       (note_id, application_id, title, description, note_type, metadata, created_by)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
     RETURNING note_id, application_id, title, description, note_type, metadata, created_by, created_at`,
    [
      randomUUID(),
      req.applicationId,
      req.title,
      req.description,
      req.noteType ?? 'general',
      JSON.stringify(metadata),
      principal.userId,
    ]
  );

  return { note: toTimelineNote(rows[0]) };
}

// --- ListTimelineNotes -----------------------------------------------------

export async function listTimelineNotes(
  deps: HandlerDeps,
  principal: Principal,
  req: ListTimelineNotesRequest
): Promise<ListTimelineNotesResponse> {
  if (req.applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }
  // ADS-1261: a draft application's timeline notes are private to the owning
  // adopter; rescue staff may read them only once it has left draft.
  const owner = await loadOwnerOrThrow(deps, req.applicationId);
  requireDraftAwareReadScope(principal, APPLICATIONS_VIEW, {
    status: owner.status,
    adopterId: owner.user_id,
    rescueId: owner.rescue_id,
  });

  const { rows } = await deps.pool.query<NoteRow>(
    `SELECT note_id, application_id, title, description, note_type, metadata, created_by, created_at
       FROM application_timeline_notes
      WHERE application_id = $1
      ORDER BY created_at ASC`,
    [req.applicationId]
  );

  return { notes: rows.map(toTimelineNote) };
}
