import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';

import type { HandlerDeps } from './handlers.js';
import { exportUserData, requestAccountDeletion } from './privacy-handlers.js';

// --- Principals -------------------------------------------------------

const EXPORT_ADMIN: Principal = {
  userId: 'svc-export-admin' as UserId,
  roles: ['admin'],
  permissions: ['admin.data.export' as Permission],
};

const DELETE_ADMIN: Principal = {
  userId: 'svc-delete-admin' as UserId,
  roles: ['admin'],
  permissions: ['users.delete' as Permission],
};

const NO_PERMS: Principal = {
  userId: 'usr-nobody' as UserId,
  roles: ['adopter'],
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
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(),
  };
  const natsPublish = vi.fn();
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
    passwordHasher: { hash: vi.fn(), verify: vi.fn() } as unknown as HandlerDeps['passwordHasher'],
    tokenIssuer: {} as unknown as HandlerDeps['tokenIssuer'],
  };
  return { deps, poolMock: pool, clientMock: client, natsMock: nats, clientScript };
}

const userRow = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'usr-1',
  email: 'jane@example.com',
  password: 'hashed',
  first_name: 'Jane',
  last_name: 'Doe',
  email_verified: true,
  phone_verified: false,
  two_factor_enabled: false,
  status: 'active',
  user_type: 'adopter',
  profile_image_url: null,
  bio: null,
  timezone: 'UTC',
  language: 'en',
  country: null,
  city: null,
  last_login_at: null,
  locked_until: null,
  login_attempts: 0,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

const prefsRow = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'usr-1',
  profile_visibility: 'public' as const,
  show_last_seen: true,
  show_location: false,
  allow_search_indexing: true,
  allow_data_export: true,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

// --- exportUserData ---------------------------------------------------

describe('exportUserData', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  it('rejects a missing user_id', async () => {
    await expect(exportUserData(mocks.deps, EXPORT_ADMIN, { userId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('rejects callers without admin.data.export', async () => {
    await expect(exportUserData(mocks.deps, NO_PERMS, { userId: 'usr-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns NOT_FOUND when the user does not exist', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // user select
    await expect(
      exportUserData(mocks.deps, EXPORT_ADMIN, { userId: 'ghost' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('exports the profile + privacy preferences + a snapshot timestamp', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRow()] }); // user
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [prefsRow()] }); // prefs

    const res = await exportUserData(mocks.deps, EXPORT_ADMIN, { userId: 'usr-1' });

    expect(res.user?.userId).toBe('usr-1');
    expect(res.user?.email).toBe('jane@example.com');
    expect(res.privacyPreferences?.allowDataExport).toBe(true);
    expect(res.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // The prefs read is non-creating (a plain SELECT, no INSERT).
    expect(String(mocks.poolMock.query.mock.calls[1][0])).toContain(
      'SELECT * FROM user_privacy_prefs'
    );
  });

  it('omits privacy preferences when the user has no prefs row', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRow()] }); // user
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // prefs absent

    const res = await exportUserData(mocks.deps, EXPORT_ADMIN, { userId: 'usr-1' });

    expect(res.user?.userId).toBe('usr-1');
    expect(res.privacyPreferences).toBeUndefined();
  });
});

// --- requestAccountDeletion -------------------------------------------

describe('requestAccountDeletion', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  it('rejects a missing user_id', async () => {
    await expect(
      requestAccountDeletion(mocks.deps, DELETE_ADMIN, { userId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects callers without users.delete', async () => {
    await expect(
      requestAccountDeletion(mocks.deps, NO_PERMS, { userId: 'usr-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('refuses self-deletion', async () => {
    await expect(
      requestAccountDeletion(mocks.deps, DELETE_ADMIN, { userId: DELETE_ADMIN.userId })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('returns NOT_FOUND when the user does not exist', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // current select
    await expect(
      requestAccountDeletion(mocks.deps, DELETE_ADMIN, { userId: 'ghost' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('is idempotent when deletion is already scheduled (no re-deactivate / publish)', async () => {
    const scheduled = new Date('2026-12-01T00:00:00Z');
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ deletion_scheduled_at: scheduled }] });

    const res = await requestAccountDeletion(mocks.deps, DELETE_ADMIN, { userId: 'usr-1' });

    expect(res.deletionScheduledFor).toBe(scheduled.toISOString());
    expect(mocks.clientMock.query).not.toHaveBeenCalled(); // no BEGIN/UPDATE
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('deactivates, stamps the grace deadline, and publishes the deletion event', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ deletion_scheduled_at: null }] });
    mocks.clientScript.push({ rows: [] }); // UPDATE

    const before = Date.now();
    const res = await requestAccountDeletion(mocks.deps, DELETE_ADMIN, {
      userId: 'usr-1',
      reason: 'subject access request',
    });

    // ~30 days out.
    const scheduledMs = Date.parse(res.deletionScheduledFor);
    const days = (scheduledMs - before) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);

    const update = mocks.clientMock.query.mock.calls.find(
      ([sql]: [string]) => typeof sql === 'string' && sql.includes('UPDATE auth.users')
    );
    expect(String(update[0])).toContain("status = 'deactivated'");
    expect(String(update[0])).toContain('deletion_scheduled_at');
    expect(String(update[0])).toContain('tokens_valid_from = now()');
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.accountDeletionRequested');
  });
});
