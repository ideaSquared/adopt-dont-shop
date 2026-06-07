import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import { AuthV1 } from '@adopt-dont-shop/proto';

import type { HandlerDeps } from './handlers.js';
import {
  getPrivacyPreferences,
  resetPrivacyPreferences,
  updatePrivacyPreferences,
} from './privacy-prefs-handlers.js';

// --- Principals -------------------------------------------------------

const SELF: Principal = {
  userId: 'usr-self' as UserId,
  roles: ['adopter'],
  permissions: ['auth.privacy-prefs.read' as Permission, 'auth.privacy-prefs.update' as Permission],
};

const ADMIN_ANY: Principal = {
  userId: 'svc-admin' as UserId,
  roles: ['admin'],
  permissions: [
    'auth.privacy-prefs.read' as Permission,
    'auth.privacy-prefs.read:any' as Permission,
    'auth.privacy-prefs.update' as Permission,
    'auth.privacy-prefs.update:any' as Permission,
  ],
};

const NO_PERMS: Principal = {
  userId: 'usr-nobody' as UserId,
  roles: [],
  permissions: [],
};

// --- Mocks ------------------------------------------------------------

function makeMocks() {
  const clientScript: Array<{ rows: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [] };
      }
      const next = clientScript.shift();
      if (!next) {
        throw new Error(`client.query unscripted: ${sql.slice(0, 80)}`);
      }
      return next;
    }),
    release: vi.fn(),
  };
  const poolScript: Array<{ rows: unknown[] }> = [];
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(async () => poolScript.shift() ?? { rows: [] }),
  };
  const nats = { publish: vi.fn() };
  // HandlerDeps requires passwordHasher + tokenIssuer — privacy handlers
  // never read them so we stub with no-op fakes.
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
    passwordHasher: { hash: vi.fn(), verify: vi.fn() } as unknown as HandlerDeps['passwordHasher'],
    tokenIssuer: {
      mintTokens: vi.fn(),
      mintAccess: vi.fn(),
      mintRefresh: vi.fn(),
    } as unknown as HandlerDeps['tokenIssuer'],
  };
  return {
    pool: pool as unknown as Pool,
    client: client as unknown as PoolClient,
    nats: nats as unknown as NatsConnection,
    poolMock: pool,
    clientMock: client,
    natsMock: nats,
    clientScript,
    poolScript,
    deps,
  };
}

const prefsRow = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'usr-self',
  profile_visibility: 'rescues_only' as const,
  show_last_seen: false,
  show_location: true,
  allow_search_indexing: false,
  allow_data_export: true,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

// --- getPrivacyPreferences -------------------------------------------

describe('getPrivacyPreferences', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects principals without auth.privacy-prefs.read', async () => {
    await expect(getPrivacyPreferences(mocks.deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns the existing row for the calling principal', async () => {
    mocks.poolScript.push({ rows: [prefsRow()] });

    const res = await getPrivacyPreferences(mocks.deps, SELF, {});

    expect(res.preferences?.userId).toBe('usr-self');
    expect(res.preferences?.profileVisibility).toBe(
      AuthV1.ProfileVisibility.PROFILE_VISIBILITY_RESCUES_ONLY
    );
    expect(res.preferences?.showLocation).toBe(true);
    expect(res.preferences?.allowDataExport).toBe(true);
  });

  it('auto-creates a defaults row on first read', async () => {
    mocks.poolScript.push({ rows: [] }); // SELECT
    mocks.poolScript.push({ rows: [prefsRow()] }); // INSERT RETURNING

    const res = await getPrivacyPreferences(mocks.deps, SELF, {});

    expect(res.preferences?.userId).toBe('usr-self');
  });

  it('rejects cross-user read without :any', async () => {
    await expect(
      getPrivacyPreferences(mocks.deps, SELF, { userId: 'usr-other' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('allows cross-user read with :any', async () => {
    mocks.poolScript.push({ rows: [prefsRow({ user_id: 'usr-other' })] });
    const res = await getPrivacyPreferences(mocks.deps, ADMIN_ANY, { userId: 'usr-other' });
    expect(res.preferences?.userId).toBe('usr-other');
  });
});

// --- updatePrivacyPreferences ----------------------------------------

describe('updatePrivacyPreferences', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects principals without update perm', async () => {
    await expect(updatePrivacyPreferences(mocks.deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('writes only the boolean fields that were set', async () => {
    mocks.poolScript.push({ rows: [prefsRow()] }); // findOrCreate SELECT
    mocks.poolScript.push({
      rows: [prefsRow({ show_location: false, allow_search_indexing: true })],
    }); // UPDATE RETURNING

    const res = await updatePrivacyPreferences(mocks.deps, SELF, {
      showLocation: false,
      allowSearchIndexing: true,
    });

    expect(res.preferences?.showLocation).toBe(false);
    expect(res.preferences?.allowSearchIndexing).toBe(true);

    const updateCall = mocks.poolMock.query.mock.calls.find(
      ([sql]) => typeof sql === 'string' && sql.includes('UPDATE user_privacy_prefs')
    );
    expect(updateCall).toBeDefined();
    const sql = updateCall![0] as string;
    expect(sql).toContain('show_location = $1');
    expect(sql).toContain('allow_search_indexing = $2');
    expect(sql).not.toContain('show_last_seen');
    expect(sql).not.toContain('allow_data_export');
  });

  it('maps profile_visibility enum and writes it', async () => {
    mocks.poolScript.push({ rows: [prefsRow()] });
    mocks.poolScript.push({ rows: [prefsRow({ profile_visibility: 'private' })] });

    const res = await updatePrivacyPreferences(mocks.deps, SELF, {
      profileVisibility: AuthV1.ProfileVisibility.PROFILE_VISIBILITY_PRIVATE,
    });

    expect(res.preferences?.profileVisibility).toBe(
      AuthV1.ProfileVisibility.PROFILE_VISIBILITY_PRIVATE
    );
  });

  it('no-op patch returns current row without UPDATE', async () => {
    mocks.poolScript.push({ rows: [prefsRow()] }); // findOrCreate
    mocks.poolScript.push({ rows: [prefsRow()] }); // SELECT current
    const res = await updatePrivacyPreferences(mocks.deps, SELF, {});
    expect(res.preferences?.userId).toBe('usr-self');
    const updateCalls = mocks.poolMock.query.mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('UPDATE user_privacy_prefs')
    );
    expect(updateCalls).toHaveLength(0);
  });

  it('rejects cross-user write without :any', async () => {
    await expect(
      updatePrivacyPreferences(mocks.deps, SELF, { userId: 'usr-other', showLocation: false })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

// --- resetPrivacyPreferences -----------------------------------------

describe('resetPrivacyPreferences', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects principals without update perm', async () => {
    await expect(resetPrivacyPreferences(mocks.deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('deletes + inserts defaults inside withTransaction, publishes once', async () => {
    mocks.clientScript.push({ rows: [] }); // DELETE
    mocks.clientScript.push({ rows: [prefsRow()] }); // INSERT RETURNING

    const res = await resetPrivacyPreferences(mocks.deps, SELF, {});

    expect(res.preferences?.userId).toBe('usr-self');
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.privacyPrefsReset');
  });

  it('rejects cross-user reset without :any', async () => {
    await expect(
      resetPrivacyPreferences(mocks.deps, SELF, { userId: 'usr-other' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});
