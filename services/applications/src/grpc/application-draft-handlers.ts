// gRPC handlers — backend-synced application drafts (autosave scratchpad).
//
// The (user_id, pet_id) draft the SPA writes while an adopter fills out a
// form — distinct from the event-sourced draft Application (handlers.ts).
// Last-write-wins; every upsert stamps a fresh 30-day TTL (a daily purge
// reaps expired rows). Always scoped to the calling principal's own
// user_id — there's no cross-adopter read or write, so like
// application-defaults-handlers.ts there's no owner row to load first.
// All three run OUTSIDE a transaction (straight off deps.pool).

import { randomUUID } from 'node:crypto';

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { APPLICATIONS_UPDATE, APPLICATIONS_VIEW } from '@adopt-dont-shop/lib.types';
import type {
  DeleteApplicationDraftRequest,
  DeleteApplicationDraftResponse,
  GetApplicationDraftRequest,
  GetApplicationDraftResponse,
  SaveApplicationDraftRequest,
  SaveApplicationDraftResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { type JsonObject } from './json-merge.js';

type DraftRow = {
  answers: JsonObject;
  updated_at: Date;
  expires_at: Date | null;
};

export async function getApplicationDraft(
  deps: HandlerDeps,
  principal: Principal,
  req: GetApplicationDraftRequest
): Promise<GetApplicationDraftResponse> {
  if (!requirePermission(principal, APPLICATIONS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_VIEW}' required`);
  }
  if (req.petId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
  }

  const { rows } = await deps.pool.query<DraftRow>(
    `SELECT answers, updated_at, expires_at
       FROM application_drafts
      WHERE user_id = $1 AND pet_id = $2`,
    [principal.userId, req.petId]
  );

  const row = rows[0];
  if (row === undefined) {
    return { found: false, answersJson: '', updatedAt: '' };
  }
  return rowToResponse(row, { found: true });
}

export async function saveApplicationDraft(
  deps: HandlerDeps,
  principal: Principal,
  req: SaveApplicationDraftRequest
): Promise<SaveApplicationDraftResponse> {
  if (!requirePermission(principal, APPLICATIONS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_UPDATE}' required`);
  }
  if (req.petId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
  }
  const answers = parseAnswers(req.answersJson);

  const { rows } = await deps.pool.query<DraftRow>(
    `INSERT INTO application_drafts (draft_id, user_id, pet_id, answers, expires_at, updated_at)
     VALUES ($1, $2, $3, $4, now() + interval '30 days', now())
     ON CONFLICT (user_id, pet_id) DO UPDATE
       SET answers = $4, expires_at = now() + interval '30 days', updated_at = now()
     RETURNING answers, updated_at, expires_at`,
    [randomUUID(), principal.userId, req.petId, JSON.stringify(answers)]
  );

  return rowToResponse(rows[0], {});
}

export async function deleteApplicationDraft(
  deps: HandlerDeps,
  principal: Principal,
  req: DeleteApplicationDraftRequest
): Promise<DeleteApplicationDraftResponse> {
  if (!requirePermission(principal, APPLICATIONS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_UPDATE}' required`);
  }
  if (req.petId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
  }

  // Idempotent: deleting a draft that isn't there is success — the SPA
  // calls this best-effort on submit and shouldn't see a 404.
  await deps.pool.query(`DELETE FROM application_drafts WHERE user_id = $1 AND pet_id = $2`, [
    principal.userId,
    req.petId,
  ]);

  return {};
}

function rowToResponse<T extends { found?: boolean }>(
  row: DraftRow,
  extra: T
): T & { answersJson: string; updatedAt: string; expiresAt?: string } {
  return {
    ...extra,
    answersJson: JSON.stringify(row.answers),
    updatedAt: row.updated_at.toISOString(),
    ...(row.expires_at !== null ? { expiresAt: row.expires_at.toISOString() } : {}),
  };
}

function parseAnswers(raw: string): JsonObject {
  if (raw === '') {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HandlerError('INVALID_ARGUMENT', 'answers_json must be valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new HandlerError('INVALID_ARGUMENT', 'answers_json must be a JSON object');
  }
  return parsed as JsonObject;
}
