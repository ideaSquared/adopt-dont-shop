// gRPC handlers for the matching service's match-profile + swipe-stats
// surface. Ports the monolith's /api/v1/match/{profile} and
// /api/v1/discovery/swipe/{stats/:userId, session/:sessionId} onto the
// matching.* schema (adopter_match_profiles + swipe_actions).
//
// All self-scoped on the calling principal unless a cross-user read
// permission is held. Profile upsert is a single ON CONFLICT statement;
// stats are aggregate COUNT queries over swipe_actions.

import { hasPermission, requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { PETS_VIEW, type Permission } from '@adopt-dont-shop/lib.types';
import type {
  GetMatchProfileRequest,
  GetMatchProfileResponse,
  GetSessionStatsRequest,
  GetSessionStatsResponse,
  GetUserSwipeStatsRequest,
  GetUserSwipeStatsResponse,
  MatchProfile,
  SwipeStats,
  UpsertMatchProfileRequest,
  UpsertMatchProfileResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';

const SWIPES_READ_ANY: Permission = 'matching.swipes.read:any' as Permission;

// --- Row shapes ------------------------------------------------------

type MatchProfileRow = {
  user_id: string;
  preferred_types: unknown[] | null;
  preferred_sizes: unknown[] | null;
  preferred_age_groups: unknown[] | null;
  preferred_energy: unknown[] | null;
  preferred_temperament: unknown[] | null;
  lifestyle: Record<string, unknown>;
  max_distance_km: number | null;
  open_to_special_needs: boolean;
  notify_new_matches: boolean;
  min_notification_score: number;
  last_notified_at: Date | null;
  inferred_prefs: Record<string, unknown>;
  prefs_updated_at: Date | null;
  allergies: string | null;
  created_at: Date;
  updated_at: Date;
};

// `null` jsonb → empty string (proto convention for "unset"); a present
// array/object → its JSON string.
const jsonOrEmpty = (v: unknown): string =>
  v === null || v === undefined ? '' : JSON.stringify(v);

const profileRowToProto = (row: MatchProfileRow): MatchProfile => ({
  userId: row.user_id,
  preferredTypesJson: jsonOrEmpty(row.preferred_types),
  preferredSizesJson: jsonOrEmpty(row.preferred_sizes),
  preferredAgeGroupsJson: jsonOrEmpty(row.preferred_age_groups),
  preferredEnergyJson: jsonOrEmpty(row.preferred_energy),
  preferredTemperamentJson: jsonOrEmpty(row.preferred_temperament),
  lifestyleJson: JSON.stringify(row.lifestyle ?? {}),
  maxDistanceKm: row.max_distance_km ?? undefined,
  openToSpecialNeeds: row.open_to_special_needs,
  notifyNewMatches: row.notify_new_matches,
  minNotificationScore: row.min_notification_score,
  lastNotifiedAt: row.last_notified_at?.toISOString(),
  inferredPrefsJson: JSON.stringify(row.inferred_prefs ?? {}),
  prefsUpdatedAt: row.prefs_updated_at?.toISOString(),
  allergies: row.allergies ?? undefined,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

// Empty-defaults profile when no row exists yet — mirrors the monolith's
// `profile ?? { user_id, lifestyle: {}, inferred_prefs: {} }` fallback.
const emptyProfile = (userId: string): MatchProfile => ({
  userId,
  preferredTypesJson: '',
  preferredSizesJson: '',
  preferredAgeGroupsJson: '',
  preferredEnergyJson: '',
  preferredTemperamentJson: '',
  lifestyleJson: '{}',
  maxDistanceKm: undefined,
  openToSpecialNeeds: false,
  notifyNewMatches: true,
  minNotificationScore: 0,
  lastNotifiedAt: undefined,
  inferredPrefsJson: '{}',
  prefsUpdatedAt: undefined,
  allergies: undefined,
  createdAt: '',
  updatedAt: '',
});

const PROFILE_SELECT = `
  user_id, preferred_types, preferred_sizes, preferred_age_groups,
  preferred_energy, preferred_temperament, lifestyle, max_distance_km,
  open_to_special_needs, notify_new_matches, min_notification_score,
  last_notified_at, inferred_prefs, prefs_updated_at, allergies,
  created_at, updated_at
`;

// --- GetMatchProfile -------------------------------------------------

export async function getMatchProfile(
  deps: HandlerDeps,
  principal: Principal,
  _req: GetMatchProfileRequest
): Promise<GetMatchProfileResponse> {
  void _req;
  // Self-scoped read, but still gate on the base swipe permission so the
  // match-profile surface matches the sibling swipe/stats handlers
  // (defence-in-depth — no ungated handler in this service).
  if (!requirePermission(principal, PETS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_VIEW}' required`);
  }
  const res = await deps.pool.query<MatchProfileRow>(
    `SELECT ${PROFILE_SELECT} FROM matching.adopter_match_profiles WHERE user_id = $1 LIMIT 1`,
    [principal.userId]
  );
  const row = res.rows[0];
  return { profile: row ? profileRowToProto(row) : emptyProfile(principal.userId as string) };
}

// --- UpsertMatchProfile ----------------------------------------------

// Parse a `*_json` field into a JSONB value for the upsert. Empty
// string is rejected here only when the set_* flag is true but the
// value can't be parsed; an unset field never reaches this.
const parseJsonField = (raw: string, field: string): unknown => {
  if (raw === '') return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new HandlerError('INVALID_ARGUMENT', `${field} is not valid JSON`);
  }
};

export async function upsertMatchProfile(
  deps: HandlerDeps,
  principal: Principal,
  req: UpsertMatchProfileRequest
): Promise<UpsertMatchProfileResponse> {
  if (!requirePermission(principal, PETS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_VIEW}' required`);
  }
  // Build the column → value map from only the fields the caller marked
  // as set. COALESCE in the SQL keeps unset columns at their current
  // value (or default on insert).
  const cols: string[] = ['user_id'];
  const vals: unknown[] = [principal.userId];
  const insertVals: string[] = ['$1'];
  const updates: string[] = [];

  const add = (col: string, value: unknown, cast = ''): void => {
    vals.push(value);
    const ph = `$${vals.length}${cast}`;
    cols.push(col);
    insertVals.push(ph);
    updates.push(`${col} = ${ph}`);
  };

  if (req.setPreferredTypes)
    add(
      'preferred_types',
      parseJsonField(req.preferredTypesJson, 'preferred_types_json'),
      '::jsonb'
    );
  if (req.setPreferredSizes)
    add(
      'preferred_sizes',
      parseJsonField(req.preferredSizesJson, 'preferred_sizes_json'),
      '::jsonb'
    );
  if (req.setPreferredAgeGroups)
    add(
      'preferred_age_groups',
      parseJsonField(req.preferredAgeGroupsJson, 'preferred_age_groups_json'),
      '::jsonb'
    );
  if (req.setPreferredEnergy)
    add(
      'preferred_energy',
      parseJsonField(req.preferredEnergyJson, 'preferred_energy_json'),
      '::jsonb'
    );
  if (req.setPreferredTemperament)
    add(
      'preferred_temperament',
      parseJsonField(req.preferredTemperamentJson, 'preferred_temperament_json'),
      '::jsonb'
    );
  if (req.setLifestyle)
    add('lifestyle', parseJsonField(req.lifestyleJson, 'lifestyle_json') ?? {}, '::jsonb');
  if (req.maxDistanceKm !== undefined) add('max_distance_km', req.maxDistanceKm);
  if (req.openToSpecialNeeds !== undefined) add('open_to_special_needs', req.openToSpecialNeeds);
  if (req.notifyNewMatches !== undefined) add('notify_new_matches', req.notifyNewMatches);
  if (req.minNotificationScore !== undefined)
    add('min_notification_score', req.minNotificationScore);
  if (req.setAllergies) add('allergies', req.allergies ?? null);

  // prefs_updated_at always bumps on a write.
  updates.push('prefs_updated_at = now()');
  updates.push('updated_at = now()');

  const sql = `
    INSERT INTO matching.adopter_match_profiles (${cols.join(', ')}, prefs_updated_at, created_at, updated_at)
    VALUES (${insertVals.join(', ')}, now(), now(), now())
    ON CONFLICT (user_id) DO UPDATE SET ${updates.join(', ')}
    RETURNING ${PROFILE_SELECT}
  `;
  const res = await deps.pool.query<MatchProfileRow>(sql, vals);
  return { profile: profileRowToProto(res.rows[0]) };
}

// --- Swipe stats helpers ---------------------------------------------

type StatsRow = {
  total_swipes: string;
  likes: string;
  passes: string;
  super_likes: string;
  info_views: string;
};

const statsRowToProto = (row: StatsRow | undefined): SwipeStats => ({
  totalSwipes: Number.parseInt(row?.total_swipes ?? '0', 10),
  likes: Number.parseInt(row?.likes ?? '0', 10),
  passes: Number.parseInt(row?.passes ?? '0', 10),
  superLikes: Number.parseInt(row?.super_likes ?? '0', 10),
  infoViews: Number.parseInt(row?.info_views ?? '0', 10),
});

const STATS_AGG = `
  COUNT(*) AS total_swipes,
  COUNT(*) FILTER (WHERE action = 'like') AS likes,
  COUNT(*) FILTER (WHERE action = 'pass') AS passes,
  COUNT(*) FILTER (WHERE action = 'super_like') AS super_likes,
  COUNT(*) FILTER (WHERE action = 'info') AS info_views
`;

// Swipes are append-only — the same pet can have many rows from repeat
// swipes (product decision keeps the full history). User-level stats
// must DEDUPE by (user, pet) at read time so a user who swiped the same
// pet three times isn't counted three times, and the latest action per
// pet wins (a like→pass→like sequence counts as one like). DISTINCT ON
// (pet_id) ordered by recency collapses to the most-recent row per pet;
// the outer aggregate then counts those deduped rows.
// `scope` is a fixed column name (never user input), so it is safe to
// interpolate. Both the user-level and session-level stats dedupe the
// same way; only the filter column differs.
const latestPerPetStatsSql = (scope: 'user_id' | 'session_id', placeholder: string): string => `
  SELECT ${STATS_AGG}
  FROM (
    SELECT DISTINCT ON (pet_id) pet_id, action
    FROM matching.swipe_actions
    WHERE ${scope} = ${placeholder}
    ORDER BY pet_id, timestamp DESC, swipe_action_id DESC
  ) AS latest
`;

// --- GetUserSwipeStats -----------------------------------------------

export async function getUserSwipeStats(
  deps: HandlerDeps,
  principal: Principal,
  req: GetUserSwipeStatsRequest
): Promise<GetUserSwipeStatsResponse> {
  const target = req.userId || (principal.userId as string);
  // IDOR guard — only the owner or a holder of swipes:read:any may read
  // another user's stats (they expose preference data).
  if (target !== principal.userId && !hasPermission(principal, SWIPES_READ_ANY)) {
    throw new HandlerError('PERMISSION_DENIED', `'${SWIPES_READ_ANY}' required`);
  }
  const res = await deps.pool.query<StatsRow>(latestPerPetStatsSql('user_id', '$1'), [target]);
  return { stats: statsRowToProto(res.rows[0]) };
}

// --- GetSessionStats -------------------------------------------------

export async function getSessionStats(
  deps: HandlerDeps,
  principal: Principal,
  req: GetSessionStatsRequest
): Promise<GetSessionStatsResponse> {
  if (!req.sessionId) {
    throw new HandlerError('INVALID_ARGUMENT', 'session_id is required');
  }
  // Resolve the session owner for the IDOR check. Anonymous sessions
  // (user_id NULL) are readable by anyone with a valid session id.
  const owner = await deps.pool.query<{ user_id: string | null }>(
    `SELECT user_id FROM matching.swipe_sessions WHERE session_id = $1 LIMIT 1`,
    [req.sessionId]
  );
  if (!owner.rows[0]) {
    throw new HandlerError('NOT_FOUND', `session ${req.sessionId} not found`);
  }
  const ownerId = owner.rows[0].user_id;
  if (
    ownerId !== null &&
    ownerId !== principal.userId &&
    !hasPermission(principal, SWIPES_READ_ANY)
  ) {
    throw new HandlerError('PERMISSION_DENIED', 'not the session owner');
  }

  // Dedupe re-swipes within the session too (append-only swipe log): the
  // latest action per pet wins, matching the user-level stats.
  const res = await deps.pool.query<StatsRow>(latestPerPetStatsSql('session_id', '$1'), [
    req.sessionId,
  ]);
  return { stats: statsRowToProto(res.rows[0]) };
}
