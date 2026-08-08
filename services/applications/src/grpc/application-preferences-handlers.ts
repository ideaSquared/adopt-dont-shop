// gRPC handlers — adopter application preferences (ADS-1140, read + merge-write).
//
// Feature-toggle preferences (auto-populate, quick-apply, reminders) the
// SPA uses to drive the quick-application flow — distinct from
// GetApplicationDefaults' saved form-answer data. Same shape and
// merge-write pattern as application-defaults-handlers.ts: always scoped
// to the calling principal's own user_id, both run OUTSIDE a transaction
// (straight off deps.pool) — a single SELECT, or a SELECT + upsert for
// the merge-write.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { APPLICATIONS_UPDATE, APPLICATIONS_VIEW } from '@adopt-dont-shop/lib.types';
import type {
  GetApplicationPreferencesRequest,
  GetApplicationPreferencesResponse,
  UpdateApplicationPreferencesRequest,
  UpdateApplicationPreferencesResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { mergeJson, type JsonObject } from './json-merge.js';

type PreferencesRow = {
  data: JsonObject;
};

async function fetchStoredPreferences(
  deps: HandlerDeps,
  userId: string
): Promise<JsonObject | undefined> {
  const { rows } = await deps.pool.query<PreferencesRow>(
    `SELECT data FROM application_preferences WHERE user_id = $1`,
    [userId]
  );
  return rows[0]?.data;
}

export async function getApplicationPreferences(
  deps: HandlerDeps,
  principal: Principal,
  _req: GetApplicationPreferencesRequest
): Promise<GetApplicationPreferencesResponse> {
  if (!requirePermission(principal, APPLICATIONS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_VIEW}' required`);
  }

  const stored = await fetchStoredPreferences(deps, principal.userId);
  return { preferencesJson: stored === undefined ? '' : JSON.stringify(stored) };
}

export async function updateApplicationPreferences(
  deps: HandlerDeps,
  principal: Principal,
  req: UpdateApplicationPreferencesRequest
): Promise<UpdateApplicationPreferencesResponse> {
  if (!requirePermission(principal, APPLICATIONS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_UPDATE}' required`);
  }

  const patch = parsePatch(req.preferencesPatchJson);
  const existing = (await fetchStoredPreferences(deps, principal.userId)) ?? {};
  const merged = mergeJson(existing, patch) as JsonObject;

  await deps.pool.query(
    `INSERT INTO application_preferences (user_id, data, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = now()`,
    [principal.userId, JSON.stringify(merged)]
  );

  return { preferencesJson: JSON.stringify(merged) };
}

function parsePatch(raw: string): JsonObject {
  if (raw === '') {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HandlerError('INVALID_ARGUMENT', 'preferences_patch_json must be valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new HandlerError('INVALID_ARGUMENT', 'preferences_patch_json must be a JSON object');
  }
  return parsed as JsonObject;
}
