// gRPC handler implementations for AuthService.{GetPrivacyPreferences,
// UpdatePrivacyPreferences, ResetPrivacyPreferences}.
//
// Mirrors the notifications-prefs handler pattern (PR #967):
//   - hasPermission gate on the self/any permission split
//   - Auto-create the row on first read so the response is always
//     populated
//   - Partial update via the set-* discipline — proto3 optional/scalar
//     presence drives which columns get written
//   - Reset is a destroy + recreate so the table-level defaults are
//     the single source of truth for "factory settings"

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import type { Permission } from '@adopt-dont-shop/lib.types';
import {
  AuthV1,
  type GetPrivacyPreferencesRequest,
  type GetPrivacyPreferencesResponse,
  type PrivacyPreferences as PrivacyPreferencesProto,
  type ResetPrivacyPreferencesRequest,
  type ResetPrivacyPreferencesResponse,
  type UpdatePrivacyPreferencesRequest,
  type UpdatePrivacyPreferencesResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './handlers.js';

// Privacy-prefs handlers don't need passwordHasher / tokenIssuer, but
// the shared adapter is typed against HandlerDeps so we accept the
// full shape and ignore the unused fields.
export type PrivacyPrefsDeps = HandlerDeps;

// --- Permissions -----------------------------------------------------

const PRIVACY_PREFS_READ: Permission = 'auth.privacy-prefs.read' as Permission;
const PRIVACY_PREFS_READ_ANY: Permission = 'auth.privacy-prefs.read:any' as Permission;
const PRIVACY_PREFS_UPDATE: Permission = 'auth.privacy-prefs.update' as Permission;
const PRIVACY_PREFS_UPDATE_ANY: Permission = 'auth.privacy-prefs.update:any' as Permission;

// --- Row + enum mapping ---------------------------------------------

type ProfileVisibilityDb = 'public' | 'rescues_only' | 'private';

export type PrivacyPrefsRow = {
  user_id: string;
  profile_visibility: ProfileVisibilityDb;
  show_last_seen: boolean;
  show_location: boolean;
  allow_search_indexing: boolean;
  allow_data_export: boolean;
  created_at: Date;
  updated_at: Date;
};

const dbVisibilityToProto = (v: ProfileVisibilityDb): AuthV1.ProfileVisibility => {
  switch (v) {
    case 'public':
      return AuthV1.ProfileVisibility.PROFILE_VISIBILITY_PUBLIC;
    case 'rescues_only':
      return AuthV1.ProfileVisibility.PROFILE_VISIBILITY_RESCUES_ONLY;
    case 'private':
      return AuthV1.ProfileVisibility.PROFILE_VISIBILITY_PRIVATE;
  }
};

const protoVisibilityToDb = (v: AuthV1.ProfileVisibility): ProfileVisibilityDb | null => {
  switch (v) {
    case AuthV1.ProfileVisibility.PROFILE_VISIBILITY_PUBLIC:
      return 'public';
    case AuthV1.ProfileVisibility.PROFILE_VISIBILITY_RESCUES_ONLY:
      return 'rescues_only';
    case AuthV1.ProfileVisibility.PROFILE_VISIBILITY_PRIVATE:
      return 'private';
    default:
      return null;
  }
};

export const privacyPrefsRowToProto = (row: PrivacyPrefsRow): PrivacyPreferencesProto => ({
  userId: row.user_id,
  profileVisibility: dbVisibilityToProto(row.profile_visibility),
  showLastSeen: row.show_last_seen,
  showLocation: row.show_location,
  allowSearchIndexing: row.allow_search_indexing,
  allowDataExport: row.allow_data_export,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

// --- Helpers ---------------------------------------------------------

const resolveTargetUserId = (
  principal: Principal,
  requested: string | undefined,
  anyPerm: Permission
): string => {
  const target = requested || (principal.userId as string);
  if (target === principal.userId) {
    return target;
  }
  if (!hasPermission(principal, anyPerm)) {
    throw new HandlerError(
      'PERMISSION_DENIED',
      `'${anyPerm}' required to access another user's privacy preferences`
    );
  }
  return target;
};

const findOrCreatePrefs = async (
  deps: PrivacyPrefsDeps,
  userId: string
): Promise<PrivacyPrefsRow> => {
  const existing = await deps.pool.query<PrivacyPrefsRow>(
    `SELECT * FROM user_privacy_prefs WHERE user_id = $1`,
    [userId]
  );
  if (existing.rows[0]) {
    return existing.rows[0];
  }
  const inserted = await deps.pool.query<PrivacyPrefsRow>(
    `
    INSERT INTO user_privacy_prefs (user_id)
    VALUES ($1)
    ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING *
    `,
    [userId]
  );
  return inserted.rows[0];
};

// --- GetPrivacyPreferences -------------------------------------------

export async function getPrivacyPreferences(
  deps: PrivacyPrefsDeps,
  principal: Principal,
  req: GetPrivacyPreferencesRequest
): Promise<GetPrivacyPreferencesResponse> {
  if (!hasPermission(principal, PRIVACY_PREFS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PRIVACY_PREFS_READ}' required`);
  }
  const userId = resolveTargetUserId(principal, req.userId, PRIVACY_PREFS_READ_ANY);
  const row = await findOrCreatePrefs(deps, userId);
  return { preferences: privacyPrefsRowToProto(row) };
}

// --- UpdatePrivacyPreferences ----------------------------------------

export async function updatePrivacyPreferences(
  deps: PrivacyPrefsDeps,
  principal: Principal,
  req: UpdatePrivacyPreferencesRequest
): Promise<UpdatePrivacyPreferencesResponse> {
  if (!hasPermission(principal, PRIVACY_PREFS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PRIVACY_PREFS_UPDATE}' required`);
  }
  const userId = resolveTargetUserId(principal, req.userId, PRIVACY_PREFS_UPDATE_ANY);

  // Ensure the row exists so the UPDATE has something to write.
  await findOrCreatePrefs(deps, userId);

  const sets: string[] = [];
  const params: unknown[] = [];
  let n = 1;

  const setBool = (column: string, v: boolean | undefined): void => {
    if (v !== undefined) {
      sets.push(`${column} = $${n}`);
      params.push(v);
      n++;
    }
  };

  const visibility = protoVisibilityToDb(req.profileVisibility);
  if (visibility) {
    sets.push(`profile_visibility = $${n}`);
    params.push(visibility);
    n++;
  }
  setBool('show_last_seen', req.showLastSeen);
  setBool('show_location', req.showLocation);
  setBool('allow_search_indexing', req.allowSearchIndexing);
  setBool('allow_data_export', req.allowDataExport);

  if (sets.length === 0) {
    const current = await deps.pool.query<PrivacyPrefsRow>(
      `SELECT * FROM user_privacy_prefs WHERE user_id = $1`,
      [userId]
    );
    return { preferences: privacyPrefsRowToProto(current.rows[0]) };
  }

  sets.push('updated_at = now()');
  sets.push('version = version + 1');
  params.push(userId);

  const result = await deps.pool.query<PrivacyPrefsRow>(
    `
    UPDATE user_privacy_prefs
    SET ${sets.join(', ')}
    WHERE user_id = $${n}
    RETURNING *
    `,
    params
  );
  return { preferences: privacyPrefsRowToProto(result.rows[0]) };
}

// --- ResetPrivacyPreferences -----------------------------------------

export async function resetPrivacyPreferences(
  deps: PrivacyPrefsDeps,
  principal: Principal,
  req: ResetPrivacyPreferencesRequest
): Promise<ResetPrivacyPreferencesResponse> {
  if (!hasPermission(principal, PRIVACY_PREFS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PRIVACY_PREFS_UPDATE}' required`);
  }
  const userId = resolveTargetUserId(principal, req.userId, PRIVACY_PREFS_UPDATE_ANY);

  let reset: PrivacyPrefsRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    await client.query(`DELETE FROM user_privacy_prefs WHERE user_id = $1`, [userId]);
    const inserted = await client.query<PrivacyPrefsRow>(
      `INSERT INTO user_privacy_prefs (user_id) VALUES ($1) RETURNING *`,
      [userId]
    );
    reset = inserted.rows[0];

    publish({
      type: 'auth.privacyPrefsReset',
      id: `auth.privacyPrefsReset.${userId}.${Date.now()}`,
      payload: { userId },
    });
  });

  if (!reset) {
    throw new HandlerError('INTERNAL', 'reset returned no rows');
  }
  return { preferences: privacyPrefsRowToProto(reset) };
}
