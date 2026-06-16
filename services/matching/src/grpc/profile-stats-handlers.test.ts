import { describe, expect, it, vi } from 'vitest';

import type { GetUserSwipeStatsRequest, UpsertMatchProfileRequest } from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import {
  getMatchProfile,
  getSessionStats,
  getUserSwipeStats,
  upsertMatchProfile,
} from './profile-stats-handlers.js';

function makePrincipal(
  overrides: Partial<{ userId: string; permissions: string[]; roles: string[] }> = {}
) {
  return {
    userId: overrides.userId ?? 'usr-1',
    roles: overrides.roles ?? ['adopter'],
    permissions: overrides.permissions ?? ['pets.read'],
    rescueId: undefined,
  } as unknown as Parameters<typeof getMatchProfile>[1];
}

function makeDeps(steps: Array<unknown>): {
  deps: HandlerDeps;
  query: ReturnType<typeof vi.fn>;
} {
  const queryMock = vi.fn();
  for (const step of steps) {
    queryMock.mockResolvedValueOnce(step);
  }
  const pool = { query: queryMock } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query: queryMock };
}

const profileRow = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'usr-1',
  preferred_types: ['dog'],
  preferred_sizes: null,
  preferred_age_groups: null,
  preferred_energy: null,
  preferred_temperament: null,
  lifestyle: { activity: 'high' },
  max_distance_km: 25,
  open_to_special_needs: false,
  notify_new_matches: true,
  min_notification_score: 50,
  last_notified_at: null,
  inferred_prefs: {},
  prefs_updated_at: new Date('2026-06-01T00:00:00Z'),
  allergies: null,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

// --- GetMatchProfile -------------------------------------------------

describe('getMatchProfile', () => {
  it('returns the existing row as proto', async () => {
    const { deps } = makeDeps([{ rows: [profileRow()] }]);
    const res = await getMatchProfile(deps, makePrincipal(), {});
    expect(res.profile?.userId).toBe('usr-1');
    expect(res.profile?.preferredTypesJson).toBe('["dog"]');
    expect(res.profile?.lifestyleJson).toBe('{"activity":"high"}');
    expect(res.profile?.maxDistanceKm).toBe(25);
  });

  it('returns empty defaults when no row exists', async () => {
    const { deps } = makeDeps([{ rows: [] }]);
    const res = await getMatchProfile(deps, makePrincipal(), {});
    expect(res.profile?.userId).toBe('usr-1');
    expect(res.profile?.preferredTypesJson).toBe('');
    expect(res.profile?.lifestyleJson).toBe('{}');
    expect(res.profile?.notifyNewMatches).toBe(true);
  });

  it('denies a caller without pets.view', async () => {
    const { deps } = makeDeps([]);
    await expect(
      getMatchProfile(deps, makePrincipal({ permissions: [] }), {})
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

// --- UpsertMatchProfile ----------------------------------------------

describe('upsertMatchProfile', () => {
  const base = {
    preferredTypesJson: '',
    setPreferredTypes: false,
    preferredSizesJson: '',
    setPreferredSizes: false,
    preferredAgeGroupsJson: '',
    setPreferredAgeGroups: false,
    preferredEnergyJson: '',
    setPreferredEnergy: false,
    preferredTemperamentJson: '',
    setPreferredTemperament: false,
    lifestyleJson: '',
    setLifestyle: false,
    allergiesJson: '',
    setAllergies: false,
  } as unknown as UpsertMatchProfileRequest;

  it('writes only the set fields and bumps prefs_updated_at', async () => {
    const { deps, query } = makeDeps([
      { rows: [profileRow({ preferred_types: ['cat'], min_notification_score: 80 })] },
    ]);
    const res = await upsertMatchProfile(deps, makePrincipal(), {
      ...base,
      preferredTypesJson: '["cat"]',
      setPreferredTypes: true,
      minNotificationScore: 80,
    });
    expect(res.profile?.preferredTypesJson).toBe('["cat"]');
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('ON CONFLICT (user_id) DO UPDATE');
    expect(sql).toContain('prefs_updated_at = now()');
    // The params include the user id + the two set fields.
    const params = query.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe('usr-1');
  });

  it('rejects invalid JSON in a set field', async () => {
    const { deps } = makeDeps([]);
    await expect(
      upsertMatchProfile(deps, makePrincipal(), {
        ...base,
        preferredSizesJson: 'not json',
        setPreferredSizes: true,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('denies a caller without pets.view', async () => {
    const { deps } = makeDeps([]);
    await expect(
      upsertMatchProfile(deps, makePrincipal({ permissions: [] }), {
        ...base,
        preferredTypesJson: '["cat"]',
        setPreferredTypes: true,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

// --- GetUserSwipeStats -----------------------------------------------

const statsRow = {
  total_swipes: '10',
  likes: '6',
  passes: '3',
  super_likes: '1',
  info_views: '0',
};

describe('getUserSwipeStats', () => {
  it('returns aggregated counts for the calling user', async () => {
    const { deps, query } = makeDeps([{ rows: [statsRow] }]);
    const res = await getUserSwipeStats(deps, makePrincipal(), {} as GetUserSwipeStatsRequest);
    expect(res.stats).toEqual({
      totalSwipes: 10,
      likes: 6,
      passes: 3,
      superLikes: 1,
      infoViews: 0,
    });
    expect(query.mock.calls[0][1]).toEqual(['usr-1']);
  });

  it('dedupes repeat swipes by pet, taking the latest action per pet', async () => {
    // Append-only history (product decision keeps every row): a user who
    // swiped the SAME pet three times must not be counted three times.
    // The aggregate must collapse to one row per pet using the MOST
    // RECENT action so a like→pass→like sequence counts as one like.
    const { deps, query } = makeDeps([{ rows: [statsRow] }]);
    await getUserSwipeStats(deps, makePrincipal(), {} as GetUserSwipeStatsRequest);
    const sql = query.mock.calls[0][0] as string;
    // Dedup by (user, pet) latest-wins: a window/DISTINCT ON over pet_id
    // ordered by recency, aggregated on the outside.
    expect(sql).toMatch(/DISTINCT ON \(pet_id\)/);
    expect(sql).toMatch(/ORDER BY pet_id,\s*timestamp DESC/);
  });

  it('rejects cross-user read without swipes:read:any', async () => {
    const { deps } = makeDeps([]);
    await expect(
      getUserSwipeStats(deps, makePrincipal(), { userId: 'usr-other' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('allows cross-user read with swipes:read:any', async () => {
    const { deps } = makeDeps([{ rows: [statsRow] }]);
    const res = await getUserSwipeStats(
      deps,
      makePrincipal({ permissions: ['matching.swipes.read:any'] }),
      { userId: 'usr-other' }
    );
    expect(res.stats?.totalSwipes).toBe(10);
  });
});

// --- GetSessionStats -------------------------------------------------

describe('getSessionStats', () => {
  it('rejects a missing session_id', async () => {
    const { deps } = makeDeps([]);
    await expect(getSessionStats(deps, makePrincipal(), { sessionId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('returns NOT_FOUND for an unknown session', async () => {
    const { deps } = makeDeps([{ rows: [] }]);
    await expect(
      getSessionStats(deps, makePrincipal(), { sessionId: 'sess-x' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects reading another user’s session stats', async () => {
    const { deps } = makeDeps([{ rows: [{ user_id: 'usr-other' }] }]);
    await expect(
      getSessionStats(deps, makePrincipal(), { sessionId: 'sess-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('returns stats for the owner', async () => {
    const { deps } = makeDeps([{ rows: [{ user_id: 'usr-1' }] }, { rows: [statsRow] }]);
    const res = await getSessionStats(deps, makePrincipal(), { sessionId: 'sess-1' });
    expect(res.stats?.likes).toBe(6);
  });

  it('dedupes re-swipes within the session (latest action per pet wins)', async () => {
    const { deps, query } = makeDeps([{ rows: [{ user_id: 'usr-1' }] }, { rows: [statsRow] }]);
    await getSessionStats(deps, makePrincipal(), { sessionId: 'sess-1' });
    // The stats query (2nd call) must collapse re-swipes via DISTINCT ON (pet_id).
    const sql = query.mock.calls[1][0] as string;
    expect(sql).toMatch(/DISTINCT ON \(pet_id\)/);
    expect(sql).toMatch(/session_id =/);
  });

  it('allows anonymous (null-owner) sessions to be read', async () => {
    const { deps } = makeDeps([{ rows: [{ user_id: null }] }, { rows: [statsRow] }]);
    const res = await getSessionStats(deps, makePrincipal(), { sessionId: 'sess-anon' });
    expect(res.stats?.totalSwipes).toBe(10);
  });
});
