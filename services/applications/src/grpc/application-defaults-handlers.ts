// gRPC handlers — adopter application defaults (read + merge-write).
//
// Reusable personal-info / living-situation / pet-experience / references
// data the SPA uses to pre-populate new applications. Always scoped to
// the calling principal's own user_id — there is no cross-adopter read
// or write, so unlike document-handlers.ts there's no owner row to load
// first. Both run OUTSIDE a transaction (straight off deps.pool) — a
// single SELECT, or a SELECT + upsert for the merge-write.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { APPLICATIONS_UPDATE, APPLICATIONS_VIEW } from '@adopt-dont-shop/lib.types';
import type {
  GetApplicationDefaultsRequest,
  GetApplicationDefaultsResponse,
  UpdateApplicationDefaultsRequest,
  UpdateApplicationDefaultsResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { mergeJson, type JsonObject } from './json-merge.js';

type DefaultsRow = {
  data: JsonObject;
};

async function fetchStoredDefaults(
  deps: HandlerDeps,
  userId: string
): Promise<JsonObject | undefined> {
  const { rows } = await deps.pool.query<DefaultsRow>(
    `SELECT data FROM application_defaults WHERE user_id = $1`,
    [userId]
  );
  return rows[0]?.data;
}

export async function getApplicationDefaults(
  deps: HandlerDeps,
  principal: Principal,
  _req: GetApplicationDefaultsRequest
): Promise<GetApplicationDefaultsResponse> {
  if (!requirePermission(principal, APPLICATIONS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_VIEW}' required`);
  }

  const stored = await fetchStoredDefaults(deps, principal.userId);
  return { defaultsJson: stored === undefined ? '' : JSON.stringify(stored) };
}

export async function updateApplicationDefaults(
  deps: HandlerDeps,
  principal: Principal,
  req: UpdateApplicationDefaultsRequest
): Promise<UpdateApplicationDefaultsResponse> {
  if (!requirePermission(principal, APPLICATIONS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_UPDATE}' required`);
  }

  const patch = parsePatch(req.defaultsPatchJson);
  const existing = (await fetchStoredDefaults(deps, principal.userId)) ?? {};
  const merged = mergeJson(existing, patch) as JsonObject;

  await deps.pool.query(
    `INSERT INTO application_defaults (user_id, data, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = now()`,
    [principal.userId, JSON.stringify(merged)]
  );

  return { defaultsJson: JSON.stringify(merged) };
}

function parsePatch(raw: string): JsonObject {
  if (raw === '') {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HandlerError('INVALID_ARGUMENT', 'defaults_patch_json must be valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new HandlerError('INVALID_ARGUMENT', 'defaults_patch_json must be a JSON object');
  }
  return parsed as JsonObject;
}
