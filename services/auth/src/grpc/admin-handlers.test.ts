import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import { AuthV1 } from '@adopt-dont-shop/proto';

import {
  adminCreateUser,
  adminGetUser,
  adminLockAccount,
  adminResetPassword,
  adminUnlockAccount,
  adminUpdateUser,
  applyUserSanction,
  bulkUpdateUsers,
  createIpRule,
  deactivateUser,
  deleteIpRule,
  getUserPermissions,
  getUserStatistics,
  listIpRules,
  listUserIdsByCohort,
  reactivateUser,
  searchUsers,
} from './admin-handlers.js';
import type { HandlerDeps } from './handlers.js';

// --- Principals -------------------------------------------------------

const ADMIN: Principal = {
  userId: 'svc-admin' as UserId,
  roles: ['admin'],
  permissions: [
    'admin.users.search' as Permission,
    'admin.users.read' as Permission,
    'admin.users.update' as Permission,
    'admin.users.deactivate' as Permission,
    'admin.users.reactivate' as Permission,
    'admin.users.bulk_update' as Permission,
  ],
};

const NO_PERMS: Principal = {
  userId: 'usr-nobody' as UserId,
  roles: ['adopter'],
  permissions: [],
};

const ADMIN_CREATOR: Principal = {
  userId: 'svc-admin-creator' as UserId,
  roles: ['admin'],
  permissions: ['admin.users.create' as Permission],
};

const SUPER_ADMIN: Principal = {
  userId: 'svc-super-admin' as UserId,
  roles: ['super_admin'],
  permissions: [],
};

const SECURITY_ADMIN: Principal = {
  userId: 'svc-security-admin' as UserId,
  roles: ['admin'],
  permissions: ['admin.security.manage' as Permission],
};

const SECURITY_READER: Principal = {
  userId: 'svc-security-reader' as UserId,
  roles: ['admin'],
  permissions: ['admin.security.read' as Permission],
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
      // The event_outbox INSERT/DELETE are framework infrastructure owned by
      // withTransaction's transactional outbox, not queries the handler under
      // test issues. Make them transparent so the scripted responses still line
      // up with the handler's own business queries.
      if (sql.includes('event_outbox')) {
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
  // JetStream publish routes to the same spy so existing publish assertions
  // keep working; withTransaction now publishes via nats.jetstream().publish().
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
    passwordHasher: { hash: vi.fn(), verify: vi.fn() } as unknown as HandlerDeps['passwordHasher'],
    tokenIssuer: {} as unknown as HandlerDeps['tokenIssuer'],
  };
  return {
    deps,
    poolMock: pool,
    clientMock: client,
    natsMock: nats,
    clientScript,
  };
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

const ipRuleRow = (overrides: Record<string, unknown> = {}) => ({
  ip_rule_id: 'rule-1',
  type: 'block',
  cidr: '203.0.113.0/24',
  label: 'known bad actor',
  is_active: true,
  expires_at: null,
  created_by: 'svc-security-admin',
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

// --- searchUsers -----------------------------------------------------

describe('searchUsers', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects principals without admin.users.search', async () => {
    await expect(searchUsers(mocks.deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns paginated results with total + totalPages', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ total: '42' }] }); // count
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [userRow(), userRow({ user_id: 'usr-2' })],
    });

    const res = await searchUsers(mocks.deps, ADMIN, { page: 2, limit: 20 });
    expect(res.total).toBe(42);
    expect(res.page).toBe(2);
    expect(res.totalPages).toBe(3);
    expect(res.users).toHaveLength(2);
    expect(res.users[0].userId).toBe('usr-1');
  });

  it('applies status + type + search filters and escapes LIKE wildcards', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ total: '0' }] });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    await searchUsers(mocks.deps, ADMIN, {
      search: '50%_off',
      statusFilter: AuthV1.UserStatus.USER_STATUS_ACTIVE,
      userTypeFilter: AuthV1.UserRole.USER_ROLE_RESCUE_STAFF,
      emailVerified: true,
    });

    const countCall = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(countCall[0]).toContain('status = $1');
    expect(countCall[0]).toContain('user_type = $2');
    expect(countCall[0]).toContain('email_verified = $3');
    expect(countCall[0]).toContain('ILIKE');
    // The search term escapes % and _.
    const params = countCall[1] as string[];
    expect(params).toContain('%50\\%\\_off%');
  });

  it('clamps oversized limit to 100', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ total: '0' }] });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await searchUsers(mocks.deps, ADMIN, { limit: 999 });
    const rowsCall = mocks.poolMock.query.mock.calls[1] as [string, unknown[]];
    const params = rowsCall[1] as unknown[];
    // Last two params are limit + offset.
    expect(params[params.length - 2]).toBe(100);
  });
});

// --- adminGetUser ----------------------------------------------------

describe('adminGetUser', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects without admin.users.read', async () => {
    await expect(adminGetUser(mocks.deps, NO_PERMS, { userId: 'usr-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns NOT_FOUND for a missing user', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(adminGetUser(mocks.deps, ADMIN, { userId: 'ghost' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('returns the user row', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRow()] });
    const res = await adminGetUser(mocks.deps, ADMIN, { userId: 'usr-1' });
    expect(res.user?.userId).toBe('usr-1');
    expect(res.user?.email).toBe('jane@example.com');
  });
});

// --- adminUpdateUser -------------------------------------------------

const BEFORE_ACTIVE_ADOPTER = {
  status: 'active',
  user_type: 'adopter',
  email_verified: false,
  first_name: 'Alice',
  last_name: 'Smith',
};

describe('adminUpdateUser', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects without admin.users.update', async () => {
    await expect(adminUpdateUser(mocks.deps, NO_PERMS, { userId: 'usr-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('writes only set fields and publishes an event', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] }); // assertMayActOnTarget
    mocks.clientScript.push({ rows: [BEFORE_ACTIVE_ADOPTER] }); // before-state
    mocks.clientScript.push({ rows: [userRow({ status: 'suspended' })] });

    const res = await adminUpdateUser(mocks.deps, ADMIN, {
      userId: 'usr-1',
      status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
    });

    expect(res.user?.status).toBe(AuthV1.UserStatus.USER_STATUS_SUSPENDED);
    const updateCall = (mocks.clientMock.query.mock.calls as Array<[string, unknown[]]>).find(
      ([sql]) => sql.includes('UPDATE auth.users')
    );
    expect(updateCall![0]).toContain('status = $1');
    // Only status was set — no user_type / email_verified assignment.
    expect(updateCall![0]).not.toContain('user_type = $');
    expect(updateCall![0]).not.toContain('email_verified = $');
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(2);
  });

  it('no-op update returns the current row without writing', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRow()] }); // adminGetUser fallback
    const res = await adminUpdateUser(mocks.deps, ADMIN, { userId: 'usr-1' });
    expect(res.user?.userId).toBe('usr-1');
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('blocks a plain admin from elevating another user to admin', async () => {
    await expect(
      adminUpdateUser(mocks.deps, ADMIN, {
        userId: 'usr-other',
        userType: AuthV1.UserRole.USER_ROLE_ADMIN,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('blocks a plain admin from elevating another user to super_admin', async () => {
    await expect(
      adminUpdateUser(mocks.deps, ADMIN, {
        userId: 'usr-other',
        userType: AuthV1.UserRole.USER_ROLE_SUPER_ADMIN,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('blocks a plain admin from elevating another user to moderator', async () => {
    await expect(
      adminUpdateUser(mocks.deps, ADMIN, {
        userId: 'usr-other',
        userType: AuthV1.UserRole.USER_ROLE_MODERATOR,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('blocks self-role-change via adminUpdateUser', async () => {
    await expect(
      adminUpdateUser(mocks.deps, ADMIN, {
        userId: ADMIN.userId,
        userType: AuthV1.UserRole.USER_ROLE_SUPER_ADMIN,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('allows super_admin to assign an elevated role and records role change in audit event', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] }); // assertMayActOnTarget
    // SELECT previous role, then UPDATE returning new row
    mocks.clientScript.push({ rows: [BEFORE_ACTIVE_ADOPTER] });
    mocks.clientScript.push({ rows: [userRow({ user_type: 'admin' })] });

    const res = await adminUpdateUser(mocks.deps, SUPER_ADMIN, {
      userId: 'usr-1',
      userType: AuthV1.UserRole.USER_ROLE_ADMIN,
    });

    expect(res.user?.userType).toBe(AuthV1.UserRole.USER_ROLE_ADMIN);
    const publishCall = mocks.natsMock.publish.mock.calls[0] as [string, Uint8Array];
    const event = JSON.parse(new TextDecoder().decode(publishCall[1])) as {
      payload: { roleChange: { before: string; after: string } };
    };
    expect(event.payload.roleChange).toEqual({ before: 'adopter', after: 'admin' });
  });

  it('allows admin.users.update to change non-role fields without elevation guard', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] }); // assertMayActOnTarget
    mocks.clientScript.push({ rows: [BEFORE_ACTIVE_ADOPTER] }); // locked before-state
    mocks.clientScript.push({ rows: [userRow({ first_name: 'Bob' })] });

    const res = await adminUpdateUser(mocks.deps, ADMIN, {
      userId: 'usr-1',
      firstName: 'Bob',
    });

    expect(res.user?.firstName).toBe('Bob');
    const updateCall = (mocks.clientMock.query.mock.calls as Array<[string, unknown[]]>).find(
      ([sql]) => sql.includes('UPDATE auth.users')
    );
    expect(updateCall).toBeDefined();
    // Role elevation was never requested, so no user_type is written.
    expect(updateCall![0]).not.toContain('user_type = $');
  });

  // --- ADS-1293: any state-changing update to an elevated target -------

  it('blocks a plain admin from changing ANY field on a super_admin target', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'super_admin' }] });
    await expect(
      adminUpdateUser(mocks.deps, ADMIN, {
        userId: 'usr-target',
        status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('allows a super_admin to change fields on a super_admin target', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'super_admin' }] });
    mocks.clientScript.push({ rows: [{ status: 'active', user_type: 'super_admin' }] }); // before-state
    mocks.clientScript.push({ rows: [userRow({ user_type: 'super_admin', status: 'suspended' })] });

    const res = await adminUpdateUser(mocks.deps, SUPER_ADMIN, {
      userId: 'usr-target',
      status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
    });

    expect(res.user?.status).toBe(AuthV1.UserStatus.USER_STATUS_SUSPENDED);
  });
});

// --- deactivateUser / reactivateUser ---------------------------------

describe('deactivateUser', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects deactivating your own account', async () => {
    await expect(deactivateUser(mocks.deps, ADMIN, { userId: 'svc-admin' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('is idempotent when already deactivated', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] }); // assertMayActOnTarget
    mocks.clientScript.push({ rows: [userRow({ status: 'deactivated' })] }); // locked current row
    const res = await deactivateUser(mocks.deps, ADMIN, { userId: 'usr-1' });
    expect(res.user?.status).toBe(AuthV1.UserStatus.USER_STATUS_DEACTIVATED);
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('deactivates an active user + publishes auth.userDeactivated', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] }); // assertMayActOnTarget
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] }); // locked current row
    mocks.clientScript.push({ rows: [userRow({ status: 'deactivated' })] });

    const res = await deactivateUser(mocks.deps, ADMIN, { userId: 'usr-1', reason: 'spam' });
    expect(res.user?.status).toBe(AuthV1.UserStatus.USER_STATUS_DEACTIVATED);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.userDeactivated');
  });

  // --- ADS-1293: elevated-target guard ----------------------------------

  it('blocks a plain admin from deactivating a super_admin target', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'super_admin' }] });
    await expect(deactivateUser(mocks.deps, ADMIN, { userId: 'usr-target' })).rejects.toMatchObject(
      { code: 'PERMISSION_DENIED' }
    );
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('allows a super_admin to deactivate a super_admin target', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'super_admin' }] });
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] });
    mocks.clientScript.push({ rows: [userRow({ status: 'deactivated' })] });

    const res = await deactivateUser(mocks.deps, SUPER_ADMIN, { userId: 'usr-target' });
    expect(res.user?.status).toBe(AuthV1.UserStatus.USER_STATUS_DEACTIVATED);
  });
});

describe('a status change by an admin overrides any timed suspension', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  const updateSql = (m: ReturnType<typeof makeMocks>) =>
    (m.clientMock.query.mock.calls as Array<[string]>)
      .map(([sql]) => sql)
      .find(sql => sql.includes('UPDATE auth.users'))!;

  it('reactivating clears suspended_until', async () => {
    mocks.clientScript.push({ rows: [userRow({ status: 'suspended' })] });
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] });
    await reactivateUser(mocks.deps, ADMIN, { userId: 'usr-1' });
    expect(updateSql(mocks)).toContain('suspended_until = NULL');
  });

  it('a status update through adminUpdateUser clears suspended_until', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] });
    mocks.clientScript.push({ rows: [BEFORE_ACTIVE_ADOPTER] });
    mocks.clientScript.push({ rows: [userRow({ status: 'suspended' })] });
    await adminUpdateUser(mocks.deps, ADMIN, {
      userId: 'usr-1',
      status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
    });
    expect(updateSql(mocks)).toContain('suspended_until = NULL');
  });

  it('a bulk status change clears suspended_until', async () => {
    mocks.clientScript.push({ rows: [{ user_id: 'usr-1' }] });
    await bulkUpdateUsers(mocks.deps, ADMIN, {
      userIds: ['usr-1'],
      status: AuthV1.UserStatus.USER_STATUS_ACTIVE,
    });
    expect(updateSql(mocks)).toContain('suspended_until = NULL');
  });

  it('a name-only update leaves suspended_until alone', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] });
    mocks.clientScript.push({ rows: [BEFORE_ACTIVE_ADOPTER] });
    mocks.clientScript.push({ rows: [userRow({ first_name: 'Bob' })] });
    await adminUpdateUser(mocks.deps, ADMIN, { userId: 'usr-1', firstName: 'Bob' });
    expect(updateSql(mocks)).not.toContain('suspended_until');
  });
});

describe('reactivateUser', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('reactivates a deactivated user + publishes auth.userReactivated', async () => {
    mocks.clientScript.push({ rows: [userRow({ status: 'deactivated' })] });
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] });

    const res = await reactivateUser(mocks.deps, ADMIN, { userId: 'usr-1' });
    expect(res.user?.status).toBe(AuthV1.UserStatus.USER_STATUS_ACTIVE);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.userReactivated');
  });
});

// --- adminResetPassword ----------------------------------------------

describe('adminResetPassword', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
    (mocks.deps.passwordHasher.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-temp');
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects principals without admin.users.update', async () => {
    await expect(
      adminResetPassword(mocks.deps, NO_PERMS, { userId: 'usr-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects a missing user_id', async () => {
    await expect(adminResetPassword(mocks.deps, ADMIN, { userId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('refuses resetting your own account', async () => {
    await expect(
      adminResetPassword(mocks.deps, ADMIN, { userId: 'svc-admin' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('maps a missing user to NOT_FOUND', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // assertMayActOnTarget: target lookup
    await expect(adminResetPassword(mocks.deps, ADMIN, { userId: 'ghost' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('hashes a generated password, revokes sessions, and publishes the event', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] }); // assertMayActOnTarget
    mocks.clientScript.push({ rows: [{ user_id: 'usr-1' }] }); // UPDATE auth.users
    mocks.clientScript.push({ rows: [] }); // UPDATE auth.refresh_tokens

    const res = await adminResetPassword(mocks.deps, ADMIN, { userId: 'usr-1' });

    // A non-empty plaintext temp password is returned to the admin...
    expect(res.temporaryPassword).toBeTruthy();
    // ...and it is the plaintext that was hashed (never persisted in clear).
    const hashMock = mocks.deps.passwordHasher.hash as ReturnType<typeof vi.fn>;
    expect(hashMock).toHaveBeenCalledTimes(1);
    expect(hashMock).toHaveBeenCalledWith(res.temporaryPassword);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.passwordResetByAdmin');
  });

  // --- ADS-1291: elevated-target guard ----------------------------------

  it('blocks a plain admin from resetting a super_admin password', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'super_admin' }] });
    await expect(
      adminResetPassword(mocks.deps, ADMIN, { userId: 'usr-target' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
    expect(mocks.deps.passwordHasher.hash).not.toHaveBeenCalled();
  });

  it('allows a super_admin to reset a super_admin password', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'super_admin' }] });
    mocks.clientScript.push({ rows: [{ user_id: 'usr-target' }] }); // UPDATE auth.users
    mocks.clientScript.push({ rows: [] }); // UPDATE auth.refresh_tokens

    const res = await adminResetPassword(mocks.deps, SUPER_ADMIN, { userId: 'usr-target' });
    expect(res.temporaryPassword).toBeTruthy();
  });

  // --- ADS-1363: stamp the revocation watermark -------------------------

  it('ADS-1363: stamps tokens_valid_from so a live access token is rejected immediately, not just refresh', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] }); // assertMayActOnTarget
    mocks.clientScript.push({ rows: [{ user_id: 'usr-1' }] }); // UPDATE auth.users
    mocks.clientScript.push({ rows: [] }); // UPDATE auth.refresh_tokens

    await adminResetPassword(mocks.deps, ADMIN, { userId: 'usr-1' });

    const updateCall = mocks.clientMock.query.mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('UPDATE auth.users')
    );
    expect(String(updateCall?.[0])).toContain('tokens_valid_from = now()');
  });
});

// --- adminLockAccount / adminUnlockAccount ----------------------------

describe('adminLockAccount', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects a missing user_id', async () => {
    await expect(
      adminLockAccount(mocks.deps, SECURITY_ADMIN, { userId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects without admin.security.manage', async () => {
    await expect(adminLockAccount(mocks.deps, ADMIN, { userId: 'usr-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('refuses locking your own account', async () => {
    await expect(
      adminLockAccount(mocks.deps, SECURITY_ADMIN, { userId: 'svc-security-admin' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('maps a missing user to NOT_FOUND', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // assertMayActOnTarget: target lookup
    await expect(
      adminLockAccount(mocks.deps, SECURITY_ADMIN, { userId: 'ghost' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('locks the account and publishes auth.accountLockedByAdmin', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] }); // assertMayActOnTarget
    mocks.clientScript.push({ rows: [userRow({ user_id: 'usr-1' })] });

    const res = await adminLockAccount(mocks.deps, SECURITY_ADMIN, {
      userId: 'usr-1',
      reason: 'suspicious activity',
    });

    expect(res.user?.userId).toBe('usr-1');
    const updateCall = (mocks.clientMock.query.mock.calls as Array<[string, unknown[]]>).find(
      ([sql]) => sql.includes('UPDATE auth.users')
    );
    expect(updateCall![0]).toMatch(/locked_until = now\(\) \+ interval/);
    expect(updateCall![1]).toEqual(['usr-1']);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.accountLockedByAdmin');
    const envelope = JSON.parse(
      new TextDecoder().decode(mocks.natsMock.publish.mock.calls[0][1] as Uint8Array)
    );
    expect(envelope.payload).toMatchObject({
      userId: 'usr-1',
      lockedBy: 'svc-security-admin',
      reason: 'suspicious activity',
    });
  });

  // --- ADS-1293: elevated-target guard ----------------------------------

  it('blocks a plain admin (with admin.security.manage) from locking a super_admin target', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'super_admin' }] });
    await expect(
      adminLockAccount(mocks.deps, SECURITY_ADMIN, { userId: 'usr-target' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('allows a super_admin to lock a super_admin target', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'super_admin' }] });
    mocks.clientScript.push({
      rows: [userRow({ user_id: 'usr-target', user_type: 'super_admin' })],
    });

    const res = await adminLockAccount(mocks.deps, SUPER_ADMIN, { userId: 'usr-target' });
    expect(res.user?.userId).toBe('usr-target');
  });
});

describe('adminUnlockAccount', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects a missing user_id', async () => {
    await expect(
      adminUnlockAccount(mocks.deps, SECURITY_ADMIN, { userId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects without admin.security.manage', async () => {
    await expect(adminUnlockAccount(mocks.deps, ADMIN, { userId: 'usr-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('maps a missing user to NOT_FOUND', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      adminUnlockAccount(mocks.deps, SECURITY_ADMIN, { userId: 'ghost' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('is a no-op (no write, no publish) when the account is not locked', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ locked_until: null }] });
    const res = await adminUnlockAccount(mocks.deps, SECURITY_ADMIN, { userId: 'usr-1' });
    expect(res.wasLocked).toBe(false);
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('clears a future lockout, resets login_attempts, and publishes auth.accountUnlockedByAdmin', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ locked_until: new Date('2099-01-01T00:00:00Z') }],
    });
    mocks.clientScript.push({ rows: [] });

    const res = await adminUnlockAccount(mocks.deps, SECURITY_ADMIN, { userId: 'usr-1' });

    expect(res.wasLocked).toBe(true);
    const updateCall = (mocks.clientMock.query.mock.calls as Array<[string, unknown[]]>).find(
      ([sql]) => sql.includes('UPDATE auth.users')
    );
    expect(updateCall![0]).toMatch(/locked_until = NULL/);
    expect(updateCall![0]).toMatch(/login_attempts = 0/);
    expect(updateCall![1]).toEqual(['usr-1']);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.accountUnlockedByAdmin');
  });
});

// --- listIpRules / createIpRule / deleteIpRule ------------------------

describe('listIpRules', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects without admin.security.read', async () => {
    await expect(listIpRules(mocks.deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns rules reshaped into the proto IpRule shape', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [ipRuleRow()] });
    const res = await listIpRules(mocks.deps, SECURITY_READER, {});
    expect(res.rules).toEqual([
      {
        ipRuleId: 'rule-1',
        type: AuthV1.IpRuleType.IP_RULE_TYPE_BLOCK,
        cidr: '203.0.113.0/24',
        label: 'known bad actor',
        isActive: true,
        expiresAt: undefined,
        createdBy: 'svc-security-admin',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    ]);
  });

  // ADS-1323: the query ran with no LIMIT.
  it('caps the query with a LIMIT (ADS-1323)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await listIpRules(mocks.deps, SECURITY_READER, {});
    const [sql] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/LIMIT\s+\d+/i);
  });
});

describe('createIpRule', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects without admin.security.manage', async () => {
    await expect(
      createIpRule(mocks.deps, SECURITY_READER, {
        type: AuthV1.IpRuleType.IP_RULE_TYPE_BLOCK,
        cidr: '203.0.113.0/24',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects a malformed cidr', async () => {
    await expect(
      createIpRule(mocks.deps, SECURITY_ADMIN, {
        type: AuthV1.IpRuleType.IP_RULE_TYPE_BLOCK,
        cidr: 'not-a-cidr',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects an unspecified type', async () => {
    await expect(
      createIpRule(mocks.deps, SECURITY_ADMIN, {
        type: AuthV1.IpRuleType.IP_RULE_TYPE_UNSPECIFIED,
        cidr: '203.0.113.0/24',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('creates the rule and publishes auth.ipRuleCreated', async () => {
    mocks.clientScript.push({ rows: [ipRuleRow()] });

    const res = await createIpRule(mocks.deps, SECURITY_ADMIN, {
      type: AuthV1.IpRuleType.IP_RULE_TYPE_BLOCK,
      cidr: '203.0.113.0/24',
      label: 'known bad actor',
    });

    expect(res.rule?.ipRuleId).toBe('rule-1');
    const insertCall = (mocks.clientMock.query.mock.calls as Array<[string, unknown[]]>).find(
      ([sql]) => sql.includes('INSERT INTO auth.ip_rules')
    );
    expect(insertCall![1]).toEqual([
      'block',
      '203.0.113.0/24',
      'known bad actor',
      null,
      'svc-security-admin',
    ]);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.ipRuleCreated');
    const envelope = JSON.parse(
      new TextDecoder().decode(mocks.natsMock.publish.mock.calls[0][1] as Uint8Array)
    );
    expect(envelope.payload).toMatchObject({
      ipRuleId: 'rule-1',
      type: 'block',
      cidr: '203.0.113.0/24',
      createdBy: 'svc-security-admin',
    });
  });
});

describe('deleteIpRule', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects a missing ip_rule_id', async () => {
    await expect(deleteIpRule(mocks.deps, SECURITY_ADMIN, { ipRuleId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('rejects without admin.security.manage', async () => {
    await expect(
      deleteIpRule(mocks.deps, SECURITY_READER, { ipRuleId: 'rule-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('maps a missing rule to NOT_FOUND', async () => {
    mocks.clientScript.push({ rows: [], rowCount: 0 });
    await expect(
      deleteIpRule(mocks.deps, SECURITY_ADMIN, { ipRuleId: 'ghost' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('deletes the rule and publishes auth.ipRuleDeleted', async () => {
    mocks.clientScript.push({ rows: [], rowCount: 1 });

    await deleteIpRule(mocks.deps, SECURITY_ADMIN, { ipRuleId: 'rule-1' });

    const deleteCall = (mocks.clientMock.query.mock.calls as Array<[string, unknown[]]>).find(
      ([sql]) => sql.includes('DELETE FROM auth.ip_rules')
    );
    expect(deleteCall![1]).toEqual(['rule-1']);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.ipRuleDeleted');
  });
});

// --- getUserStatistics -----------------------------------------------

describe('getUserStatistics', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects without admin.users.read', async () => {
    await expect(getUserStatistics(mocks.deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('aggregates totals + breakdowns', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ total: '100', verified: '80', new_this_month: '12' }],
    });
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        { status: 'active', count: '70' },
        { status: 'deactivated', count: '30' },
      ],
    });
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        { user_type: 'adopter', count: '90' },
        { user_type: 'rescue_staff', count: '10' },
      ],
    });

    const res = await getUserStatistics(mocks.deps, ADMIN, {});
    expect(res.total).toBe(100);
    expect(res.verified).toBe(80);
    expect(res.newThisMonth).toBe(12);
    expect(res.byStatus).toHaveLength(2);
    expect(res.byType).toHaveLength(2);
    const adopter = res.byType.find(t => t.userType === AuthV1.UserRole.USER_ROLE_ADOPTER);
    expect(adopter?.count).toBe(90);
  });
});

// --- getUserPermissions ----------------------------------------------

describe('getUserPermissions', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects without admin.users.read', async () => {
    await expect(
      getUserPermissions(mocks.deps, NO_PERMS, { userId: 'usr-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('returns the flattened permission set via loadPrincipal', async () => {
    // loadPrincipal: user_type lookup, extra roles, permissions.
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'admin' }] });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ name: 'pets.read' }, { name: 'pets.update' }],
    });

    const res = await getUserPermissions(mocks.deps, ADMIN, { userId: 'usr-1' });
    expect(res.permissions).toEqual(['pets.read', 'pets.update']);
  });

  it("lets any user read their own permissions (the SPAs' permission gates need them)", async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ name: 'pets.read' }] });

    const res = await getUserPermissions(mocks.deps, NO_PERMS, { userId: NO_PERMS.userId });
    expect(res.permissions).toEqual(['pets.read']);
  });

  it("still refuses another user's permissions without admin.users.read", async () => {
    await expect(
      getUserPermissions(mocks.deps, NO_PERMS, { userId: 'usr-someone-else' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

// --- getUserPermissions: direct permission grants (ADS-1141) ---------
//
// loadPrincipal (handlers.ts) is the single place effective permissions are
// computed; getUserPermissions surfaces that set, so grant behaviour is
// asserted through its output. Phase 1 folds *active* direct grants
// (auth.permission_grants) into the effective set, additively: effective =
// role-derived ∪ active grants. A grant is active when it is not revoked and
// not expired.
//
// The stubbed pool does not execute SQL, so exclusion of revoked/expired grants
// is enforced by the query predicate — each scenario asserts both the surfaced
// permission set AND the specific predicate responsible for it.
describe('getUserPermissions — permission grants (ADS-1141)', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  // Scripts loadPrincipal's three round trips: primary user_type, extra roles,
  // then the effective-permissions query (role-derived ∪ active grants, deduped
  // by Postgres). `permissionRows` is what that final query returns.
  const scriptLoadPrincipal = (permissionRows: Array<{ name: string }>) => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: permissionRows });
  };

  const permsSqlOf = (m: ReturnType<typeof makeMocks>): string => {
    const call = m.poolMock.query.mock.calls[2];
    if (!call) throw new Error('permissions query was not issued');
    return call[0] as string;
  };

  it('with no active grants, returns exactly the role-derived set (zero behaviour change)', async () => {
    scriptLoadPrincipal([{ name: 'pets.read' }, { name: 'pets.update' }]);
    const res = await getUserPermissions(mocks.deps, ADMIN, { userId: 'usr-1' });
    expect(res.permissions).toEqual(['pets.read', 'pets.update']);
  });

  it('computes effective permissions in a single round trip', async () => {
    scriptLoadPrincipal([{ name: 'pets.read' }]);
    await getUserPermissions(mocks.deps, ADMIN, { userId: 'usr-1' });
    // user_type, extra roles, permissions — no extra grant query.
    expect(mocks.poolMock.query).toHaveBeenCalledTimes(3);
    // The user id is the only bound parameter (reused across both branches).
    expect(mocks.poolMock.query.mock.calls[2][1]).toEqual(['usr-1']);
  });

  it('surfaces a permission that comes only from an active grant', async () => {
    // Postgres returns the role perms plus the granted one from the union.
    scriptLoadPrincipal([{ name: 'pets.read' }, { name: 'pets.delete' }]);
    const res = await getUserPermissions(mocks.deps, ADMIN, { userId: 'usr-1' });
    expect(res.permissions).toContain('pets.delete');
    // ...via the grants table joined to the string permission registry.
    expect(permsSqlOf(mocks)).toContain('auth.permission_grants');
  });

  it('excludes an expired grant (expires_at in the past)', async () => {
    // The expires_at predicate drops it in SQL, so the effective query returns
    // role perms only and the expired permission never surfaces.
    scriptLoadPrincipal([{ name: 'pets.read' }]);
    const res = await getUserPermissions(mocks.deps, ADMIN, { userId: 'usr-1' });
    expect(res.permissions).toEqual(['pets.read']);
    const sql = permsSqlOf(mocks);
    expect(sql).toContain('expires_at IS NULL');
    expect(sql).toContain('now()');
  });

  it('excludes a revoked grant (revoked_at set)', async () => {
    // The revoked_at IS NULL predicate drops it in SQL.
    scriptLoadPrincipal([{ name: 'pets.read' }]);
    const res = await getUserPermissions(mocks.deps, ADMIN, { userId: 'usr-1' });
    expect(res.permissions).toEqual(['pets.read']);
    expect(permsSqlOf(mocks)).toContain('revoked_at IS NULL');
  });

  it('counts a grant duplicating a role permission only once', async () => {
    // UNION dedups the role-derived and grant branches; the shared permission
    // comes back a single time.
    scriptLoadPrincipal([{ name: 'pets.read' }]);
    const res = await getUserPermissions(mocks.deps, ADMIN, { userId: 'usr-1' });
    expect(res.permissions.filter(p => p === 'pets.read')).toHaveLength(1);
  });
});

// --- bulkUpdateUsers -------------------------------------------------

describe('bulkUpdateUsers', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects without admin.users.bulk_update', async () => {
    await expect(
      bulkUpdateUsers(mocks.deps, NO_PERMS, {
        userIds: ['usr-1'],
        status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects an empty user_ids list', async () => {
    await expect(
      bulkUpdateUsers(mocks.deps, ADMIN, {
        userIds: [],
        status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when neither status nor user_type is set', async () => {
    await expect(bulkUpdateUsers(mocks.deps, ADMIN, { userIds: ['usr-1'] })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('refuses to change your own role via the bulk path', async () => {
    await expect(
      bulkUpdateUsers(mocks.deps, ADMIN, {
        userIds: ['svc-admin', 'usr-2'],
        userType: AuthV1.UserRole.USER_ROLE_MODERATOR,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('refuses a STATUS-only bulk update that includes your own account (ADS-1171)', async () => {
    // The self-target guard must also cover status-only changes — otherwise a
    // bulk deactivate/suspend that includes the caller locks them out. No DB
    // write should happen: the guard rejects before the per-id loop.
    await expect(
      bulkUpdateUsers(mocks.deps, ADMIN, {
        userIds: ['svc-admin', 'usr-2'],
        status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.poolMock.connect).not.toHaveBeenCalled();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('refuses super_admin assignment from a non-super_admin actor', async () => {
    await expect(
      bulkUpdateUsers(mocks.deps, ADMIN, {
        userIds: ['usr-2'],
        userType: AuthV1.UserRole.USER_ROLE_SUPER_ADMIN,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('blocks a plain admin from bulk-elevating other users to admin', async () => {
    await expect(
      bulkUpdateUsers(mocks.deps, ADMIN, {
        userIds: ['usr-2'],
        userType: AuthV1.UserRole.USER_ROLE_ADMIN,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.poolMock.connect).not.toHaveBeenCalled();
  });

  it('blocks a plain admin from bulk-elevating other users to moderator', async () => {
    await expect(
      bulkUpdateUsers(mocks.deps, ADMIN, {
        userIds: ['usr-2'],
        userType: AuthV1.UserRole.USER_ROLE_MODERATOR,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.poolMock.connect).not.toHaveBeenCalled();
  });

  it('allows a super_admin to bulk-assign admin/moderator/super_admin', async () => {
    mocks.clientScript.push({ rows: [{ user_id: 'usr-2' }] });

    const res = await bulkUpdateUsers(mocks.deps, SUPER_ADMIN, {
      userIds: ['usr-2'],
      userType: AuthV1.UserRole.USER_ROLE_MODERATOR,
    });

    expect(res.results.find(r => r.userId === 'usr-2')?.success).toBe(true);
  });

  it('allows a plain admin to bulk-assign a non-elevated role', async () => {
    mocks.clientScript.push({ rows: [{ user_id: 'usr-2' }] });

    const res = await bulkUpdateUsers(mocks.deps, ADMIN, {
      userIds: ['usr-2'],
      userType: AuthV1.UserRole.USER_ROLE_ADOPTER,
    });

    expect(res.results.find(r => r.userId === 'usr-2')?.success).toBe(true);
  });

  it('returns per-id results — one success, one not-found', async () => {
    // First id: UPDATE returns a row. Second id: UPDATE returns none.
    mocks.clientScript.push({ rows: [{ user_id: 'usr-1' }] });
    mocks.clientScript.push({ rows: [] });

    const res = await bulkUpdateUsers(mocks.deps, ADMIN, {
      userIds: ['usr-1', 'usr-missing'],
      status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
    });

    expect(res.successCount).toBe(1);
    expect(res.failedCount).toBe(1);
    expect(res.results.find(r => r.userId === 'usr-1')?.success).toBe(true);
    expect(res.results.find(r => r.userId === 'usr-missing')?.success).toBe(false);
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(2);
  });
});

// --- listUserIdsByCohort --------------------------------------------

const BROADCASTER: Principal = {
  userId: 'svc-bcast' as UserId,
  roles: ['admin'],
  permissions: ['admin.users.broadcast' as Permission],
};

describe('listUserIdsByCohort', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.clearAllMocks());

  it('rejects callers without admin.users.broadcast', async () => {
    await expect(
      listUserIdsByCohort(mocks.deps, NO_PERMS, {
        userTypes: [],
        statuses: [],
        page: 1,
        limit: 100,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('defaults to status=active when no statuses are supplied', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ total: '2' }] })
      .mockResolvedValueOnce({ rows: [{ user_id: 'u-1' }, { user_id: 'u-2' }] });

    const res = await listUserIdsByCohort(mocks.deps, BROADCASTER, {
      userTypes: [],
      statuses: [],
      page: 1,
      limit: 50,
    });

    expect(res.total).toBe(2);
    expect(res.userIds).toEqual(['u-1', 'u-2']);
    const [countSql] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(countSql).toContain("status = 'active'");
  });

  it('filters by user_types IN list', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    await listUserIdsByCohort(mocks.deps, BROADCASTER, {
      userTypes: [AuthV1.UserRole.USER_ROLE_ADOPTER, AuthV1.UserRole.USER_ROLE_RESCUE_STAFF],
      statuses: [],
      page: 1,
      limit: 50,
    });

    const [countSql, countParams] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(countSql).toContain('user_type IN');
    expect(countParams).toContain('adopter');
    expect(countParams).toContain('rescue_staff');
  });

  it('filters by statuses IN list (overrides the active default)', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    await listUserIdsByCohort(mocks.deps, BROADCASTER, {
      userTypes: [],
      statuses: [AuthV1.UserStatus.USER_STATUS_SUSPENDED],
      page: 1,
      limit: 50,
    });

    const [countSql, countParams] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(countSql).toContain('status IN');
    expect(countSql).not.toContain("status = 'active'");
    expect(countParams).toContain('suspended');
  });

  it('applies email_verified filter when set', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    await listUserIdsByCohort(mocks.deps, BROADCASTER, {
      userTypes: [],
      statuses: [],
      emailVerified: true,
      page: 1,
      limit: 50,
    });

    const [countSql] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(countSql).toContain('email_verified');
  });

  it('paginates: total + page + totalPages reflect the count', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ total: '237' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await listUserIdsByCohort(mocks.deps, BROADCASTER, {
      userTypes: [],
      statuses: [],
      page: 3,
      limit: 50,
    });

    expect(res.total).toBe(237);
    expect(res.page).toBe(3);
    expect(res.totalPages).toBe(5);
  });
});

// --- adminCreateUser -------------------------------------------------

describe('adminCreateUser', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  const baseReq = {
    email: 'new@example.com',
    firstName: 'New',
    lastName: 'User',
    userType: AuthV1.UserRole.USER_ROLE_ADOPTER,
    sendInvitation: true,
  };

  it('rejects principals without admin.users.create', async () => {
    await expect(adminCreateUser(mocks.deps, NO_PERMS, baseReq)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects an invalid email', async () => {
    await expect(
      adminCreateUser(mocks.deps, ADMIN_CREATOR, { ...baseReq, email: 'nope' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects a missing first/last name', async () => {
    await expect(
      adminCreateUser(mocks.deps, ADMIN_CREATOR, { ...baseReq, firstName: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects an unspecified user_type', async () => {
    await expect(
      adminCreateUser(mocks.deps, ADMIN_CREATOR, {
        ...baseReq,
        userType: AuthV1.UserRole.USER_ROLE_UNSPECIFIED,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('forbids a non-super_admin from minting an elevated role', async () => {
    await expect(
      adminCreateUser(mocks.deps, ADMIN_CREATOR, {
        ...baseReq,
        userType: AuthV1.UserRole.USER_ROLE_ADMIN,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    // No writes when the privilege guard blocks the create.
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('rejects a duplicate email with ALREADY_EXISTS', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ exists: 1 }] });
    await expect(adminCreateUser(mocks.deps, ADMIN_CREATOR, baseReq)).rejects.toMatchObject({
      code: 'ALREADY_EXISTS',
    });
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('never echoes the requested email back in the duplicate-email error (ADS-885)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ exists: 1 }] });
    let error: unknown;
    try {
      await adminCreateUser(mocks.deps, ADMIN_CREATOR, baseReq);
    } catch (err) {
      error = err;
    }
    expect(error).toMatchObject({ code: 'ALREADY_EXISTS' });
    expect((error as Error).message).not.toContain(baseReq.email);
  });

  it('creates a pending user + invitation and emits auth.userInvited with the token', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // no existing email
    mocks.clientScript.push({
      rows: [
        userRow({ user_id: 'usr-new', email: 'new@example.com', status: 'pending_verification' }),
      ],
    }); // INSERT auth.users
    mocks.clientScript.push({ rows: [] }); // INSERT auth.user_invitations

    const res = await adminCreateUser(mocks.deps, ADMIN_CREATOR, baseReq);

    expect(res.user?.userId).toBe('usr-new');
    const sqls = (mocks.clientMock.query.mock.calls as Array<[string]>).map(([s]) => s);
    expect(sqls.some(s => s.includes('INSERT INTO auth.users'))).toBe(true);
    expect(sqls.some(s => s.includes('INSERT INTO auth.user_invitations'))).toBe(true);

    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.userInvited');
    const envelope = JSON.parse(
      new TextDecoder().decode(mocks.natsMock.publish.mock.calls[0][1] as Uint8Array)
    );
    expect(envelope.payload).toMatchObject({ userId: 'usr-new', role: 'adopter' });
    expect(typeof envelope.payload.token).toBe('string');
    expect(envelope.payload.token.length).toBeGreaterThan(0);
  });

  it('omits the token when send_invitation is false', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    mocks.clientScript.push({ rows: [userRow({ user_id: 'usr-new' })] });
    mocks.clientScript.push({ rows: [] });

    await adminCreateUser(mocks.deps, ADMIN_CREATOR, { ...baseReq, sendInvitation: false });

    const envelope = JSON.parse(
      new TextDecoder().decode(mocks.natsMock.publish.mock.calls[0][1] as Uint8Array)
    );
    expect(envelope.payload.token).toBeUndefined();
  });

  it('allows a super_admin to mint an elevated role', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    mocks.clientScript.push({ rows: [userRow({ user_id: 'usr-mod', user_type: 'moderator' })] });
    mocks.clientScript.push({ rows: [] });

    const res = await adminCreateUser(mocks.deps, SUPER_ADMIN, {
      ...baseReq,
      userType: AuthV1.UserRole.USER_ROLE_MODERATOR,
    });
    expect(res.user?.userId).toBe('usr-mod');
  });
});

// --- audit trail: <domain>.actionTaken (B08) --------------------------

type AuditEnvelope = {
  action: string;
  outcome: string;
  service: string;
  subject: string;
  aggregateType: string;
  aggregateId: string;
  actorUserId?: string;
  payload: Record<string, unknown>;
};

// Decode every event withTransaction published, as [subject, AuditEventPayload].
function publishedEvents(mocks: ReturnType<typeof makeMocks>): Array<[string, AuditEnvelope]> {
  return (mocks.natsMock.publish.mock.calls as Array<[string, Uint8Array]>).map(
    ([subject, data]) => [
      subject,
      JSON.parse(new TextDecoder().decode(data)).payload as AuditEnvelope,
    ]
  );
}

function actionTaken(mocks: ReturnType<typeof makeMocks>): AuditEnvelope[] {
  return publishedEvents(mocks)
    .filter(([subject]) => subject === 'auth.actionTaken')
    .map(([, payload]) => payload);
}

describe('admin user actions publish auth.actionTaken for the audit log', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('records a suspension with actor, target and before/after status', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] });
    mocks.clientScript.push({ rows: [BEFORE_ACTIVE_ADOPTER] });
    mocks.clientScript.push({ rows: [userRow({ status: 'suspended' })] });

    await adminUpdateUser(mocks.deps, ADMIN, {
      userId: 'usr-1',
      status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
    });

    const [event] = actionTaken(mocks);
    expect(event).toMatchObject({
      service: 'service.auth',
      subject: 'auth.actionTaken',
      aggregateType: 'user',
      aggregateId: 'usr-1',
      actorUserId: 'svc-admin',
      action: 'suspend',
      outcome: 'success',
    });
    expect(event.payload).toMatchObject({
      before: { status: 'active' },
      after: { status: 'suspended' },
    });
  });

  it('records a role change as assign_role with before/after role', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] });
    mocks.clientScript.push({ rows: [BEFORE_ACTIVE_ADOPTER] });
    mocks.clientScript.push({ rows: [userRow({ user_type: 'admin' })] });

    await adminUpdateUser(mocks.deps, SUPER_ADMIN, {
      userId: 'usr-1',
      userType: AuthV1.UserRole.USER_ROLE_ADMIN,
    });

    const [event] = actionTaken(mocks);
    expect(event.action).toBe('assign_role');
    expect(event.actorUserId).toBe('svc-super-admin');
    expect(event.payload).toMatchObject({
      before: { userType: 'adopter' },
      after: { userType: 'admin' },
    });
  });

  it('records a reactivation with actor, target and before/after status', async () => {
    mocks.clientScript.push({ rows: [userRow({ status: 'suspended' })] });
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] });

    await reactivateUser(mocks.deps, ADMIN, { userId: 'usr-1' });

    const [event] = actionTaken(mocks);
    expect(event).toMatchObject({
      aggregateType: 'user',
      aggregateId: 'usr-1',
      actorUserId: 'svc-admin',
      action: 'reactivate',
      outcome: 'success',
    });
    expect(event.payload).toMatchObject({
      before: { status: 'suspended' },
      after: { status: 'active' },
    });
  });

  it('records a deactivation with the reason', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] });
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] });
    mocks.clientScript.push({ rows: [userRow({ status: 'deactivated' })] });

    await deactivateUser(mocks.deps, ADMIN, { userId: 'usr-1', reason: 'spam' });

    const [event] = actionTaken(mocks);
    expect(event.action).toBe('deactivate');
    expect(event.payload).toMatchObject({ reason: 'spam', after: { status: 'deactivated' } });
  });

  it('records each id of a bulk status change', async () => {
    mocks.clientScript.push({ rows: [{ user_id: 'usr-1' }] });
    mocks.clientScript.push({ rows: [{ user_id: 'usr-2' }] });

    await bulkUpdateUsers(mocks.deps, ADMIN, {
      userIds: ['usr-1', 'usr-2'],
      status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
      reason: 'bulk clean-up',
    });

    const events = actionTaken(mocks);
    expect(events.map(e => e.aggregateId)).toEqual(['usr-1', 'usr-2']);
    expect(events[0]).toMatchObject({ action: 'suspend', actorUserId: 'svc-admin' });
    expect(events[0].payload).toMatchObject({
      bulk: true,
      reason: 'bulk clean-up',
      after: { status: 'suspended' },
    });
  });

  it('locks the before-state row so the recorded before matches what was replaced', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] });
    mocks.clientScript.push({ rows: [BEFORE_ACTIVE_ADOPTER] });
    mocks.clientScript.push({ rows: [userRow({ status: 'suspended' })] });

    await adminUpdateUser(mocks.deps, ADMIN, {
      userId: 'usr-1',
      status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
    });

    const selectSql = (mocks.clientMock.query.mock.calls as Array<[string]>)
      .map(([sql]) => sql)
      .find(sql => sql.includes('SELECT') && sql.includes('FROM auth.users'));
    expect(selectSql).toContain('FOR UPDATE');
  });

  it('records an email-verified change and which name fields changed, without the names', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] });
    mocks.clientScript.push({ rows: [BEFORE_ACTIVE_ADOPTER] });
    mocks.clientScript.push({ rows: [userRow({ first_name: 'Bob', email_verified: true })] });

    await adminUpdateUser(mocks.deps, ADMIN, {
      userId: 'usr-1',
      emailVerified: true,
      firstName: 'Bob',
    });

    const [event] = actionTaken(mocks);
    expect(event.action).toBe('update');
    expect(event.payload).toMatchObject({
      before: { emailVerified: false },
      after: { emailVerified: true },
      changedFields: ['emailVerified', 'firstName'],
    });
    expect(JSON.stringify(event.payload)).not.toContain('Bob');
    expect(JSON.stringify(event.payload)).not.toContain('Alice');
  });

  it('records the previous status and role of each id of a bulk change', async () => {
    mocks.clientScript.push({
      rows: [{ user_id: 'usr-1', prev_status: 'active', prev_user_type: 'adopter' }],
    });

    await bulkUpdateUsers(mocks.deps, SUPER_ADMIN, {
      userIds: ['usr-1'],
      userType: AuthV1.UserRole.USER_ROLE_ADMIN,
    });

    const [event] = actionTaken(mocks);
    expect(event.payload).toMatchObject({
      bulk: true,
      before: { userType: 'adopter' },
      after: { userType: 'admin' },
    });
  });

  it('publishes no audit event when a status change finds no row to update', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] });
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] }); // locked current row
    mocks.clientScript.push({ rows: [] }); // erased between read and write

    await expect(deactivateUser(mocks.deps, ADMIN, { userId: 'usr-1' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('publishes nothing when the write fails', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ user_type: 'adopter' }] });
    mocks.clientScript.push({ rows: [] }); // before-state: user missing

    await expect(
      adminUpdateUser(mocks.deps, ADMIN, {
        userId: 'usr-1',
        status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });
});

// --- applyUserSanction -------------------------------------------------

describe('applyUserSanction', () => {
  const SANCTIONER: Principal = {
    userId: 'svc-moderation' as UserId,
    roles: ['admin'],
    permissions: ['moderation.users.sanction' as Permission],
  };
  const FUTURE = '2099-01-01T00:00:00.000Z';
  const SUSPEND = {
    userId: 'usr-1',
    kind: AuthV1.UserSanctionKind.USER_SANCTION_KIND_SUSPEND,
    reason: 'repeated spam',
    actorUserId: 'mod-1',
  };
  const BAN = { ...SUSPEND, kind: AuthV1.UserSanctionKind.USER_SANCTION_KIND_BAN };

  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('is denied without moderation.users.sanction, even to an admin with the broad user permissions', async () => {
    await expect(applyUserSanction(mocks.deps, ADMIN, SUSPEND)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing user_id', { userId: '' }],
    ['an unspecified kind', { kind: AuthV1.UserSanctionKind.USER_SANCTION_KIND_UNSPECIFIED }],
    ['a missing actor', { actorUserId: '' }],
    ['a missing reason', { reason: '' }],
    ['an unparseable expires_at', { expiresAt: 'tomorrow' }],
    ['a date-only expires_at', { expiresAt: '2099-01-01' }],
    ['an expires_at with no timezone', { expiresAt: '2099-01-01T00:00:00' }],
    ['an expires_at in the past', { expiresAt: '2000-01-01T00:00:00.000Z' }],
    ['a moderator sanctioning themselves', { actorUserId: 'usr-1' }],
  ])('rejects %s', async (_label, override) => {
    await expect(
      applyUserSanction(mocks.deps, SANCTIONER, { ...SUSPEND, ...override })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('does not return the full user, which would expose fields moderators may not read', async () => {
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] });
    mocks.clientScript.push({
      rows: [userRow({ status: 'suspended', phone_verified: true, two_factor_enabled: true })],
    });

    const res = await applyUserSanction(mocks.deps, SANCTIONER, SUSPEND);

    expect(Object.keys(res).sort()).toEqual(['status', 'userId']);
  });

  it('only lets the moderation service principal name a different actor', async () => {
    const human: Principal = {
      userId: 'mod-9' as UserId,
      roles: ['moderator'],
      permissions: ['moderation.users.sanction' as Permission],
    };

    await expect(
      applyUserSanction(mocks.deps, human, { ...SUSPEND, actorUserId: 'someone-else' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('lets a human caller attribute the sanction to themselves', async () => {
    const human: Principal = {
      userId: 'mod-9' as UserId,
      roles: ['moderator'],
      permissions: ['moderation.users.sanction' as Permission],
    };
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] });
    mocks.clientScript.push({ rows: [userRow({ status: 'suspended' })] });

    await applyUserSanction(mocks.deps, human, { ...SUSPEND, actorUserId: 'mod-9' });

    expect(actionTaken(mocks)[0].actorUserId).toBe('mod-9');
  });

  it.each(['admin', 'moderator', 'super_admin'])(
    'refuses a user who holds %s as an additional role, not just as their primary role',
    async role => {
      mocks.clientScript.push({ rows: [userRow({ user_type: 'adopter', extra_roles: [role] })] });
      await expect(applyUserSanction(mocks.deps, SANCTIONER, SUSPEND)).rejects.toMatchObject({
        code: 'PERMISSION_DENIED',
      });
      expect(mocks.natsMock.publish).not.toHaveBeenCalled();
    }
  );

  it('rejects an expiry on a ban, which is permanent', async () => {
    await expect(
      applyUserSanction(mocks.deps, SANCTIONER, { ...BAN, expiresAt: FUTURE })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('answers NOT_FOUND for a missing user and publishes nothing', async () => {
    mocks.clientScript.push({ rows: [] });
    await expect(applyUserSanction(mocks.deps, SANCTIONER, SUSPEND)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it.each(['admin', 'moderator', 'super_admin'])(
    'refuses to sanction a %s through this route',
    async role => {
      mocks.clientScript.push({ rows: [userRow({ user_type: role })] });
      await expect(applyUserSanction(mocks.deps, SANCTIONER, SUSPEND)).rejects.toMatchObject({
        code: 'PERMISSION_DENIED',
      });
      expect(mocks.natsMock.publish).not.toHaveBeenCalled();
    }
  );

  it('suspends the user and records exactly one auth.actionTaken with the human moderator as actor', async () => {
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] }); // locked current row
    mocks.clientScript.push({ rows: [userRow({ status: 'suspended' })] }); // UPDATE

    const res = await applyUserSanction(mocks.deps, SANCTIONER, {
      ...SUSPEND,
      expiresAt: FUTURE,
    });

    expect(res).toEqual({
      userId: 'usr-1',
      status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
    });
    expect(publishedEvents(mocks).map(([subject]) => subject)).toEqual(['auth.actionTaken']);
    const [event] = actionTaken(mocks);
    expect(event).toMatchObject({
      aggregateType: 'user',
      aggregateId: 'usr-1',
      actorUserId: 'mod-1',
      action: 'suspend',
      outcome: 'success',
    });
    expect(event.payload).toMatchObject({
      before: { status: 'active' },
      after: { status: 'suspended' },
      reason: 'repeated spam',
      expiresAt: FUTURE,
    });
  });

  const updateCall = (m: ReturnType<typeof makeMocks>) =>
    (m.clientMock.query.mock.calls as Array<[string, unknown[]]>).find(([sql]) =>
      sql.includes('UPDATE auth.users')
    )!;

  it('stores the suspension end time so it can be lifted later', async () => {
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] });
    mocks.clientScript.push({ rows: [userRow({ status: 'suspended' })] });

    await applyUserSanction(mocks.deps, SANCTIONER, { ...SUSPEND, expiresAt: FUTURE });

    const [sql, params] = updateCall(mocks);
    expect(sql).toContain('suspended_until = $3');
    expect(params[2]).toEqual(new Date(FUTURE));
  });

  it('stores no end time for an indefinite suspension', async () => {
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] });
    mocks.clientScript.push({ rows: [userRow({ status: 'suspended' })] });

    await applyUserSanction(mocks.deps, SANCTIONER, SUSPEND);

    expect(updateCall(mocks)[1][2]).toBeNull();
  });

  it('clears any end time on a ban', async () => {
    mocks.clientScript.push({ rows: [userRow({ status: 'suspended' })] });
    mocks.clientScript.push({ rows: [userRow({ status: 'deactivated' })] });
    mocks.clientScript.push({ rows: [] });

    await applyUserSanction(mocks.deps, SANCTIONER, BAN);

    expect(updateCall(mocks)[0]).toContain('suspended_until = NULL');
  });

  it('locks the row inside the transaction', async () => {
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] });
    mocks.clientScript.push({ rows: [userRow({ status: 'suspended' })] });

    await applyUserSanction(mocks.deps, SANCTIONER, SUSPEND);

    const select = (mocks.clientMock.query.mock.calls as Array<[string]>)
      .map(([sql]) => sql)
      .find(sql => sql.includes('FROM auth.users'));
    expect(select).toContain('FOR UPDATE');
  });

  it('bans by deactivating and revoking every session in the same transaction, with one event', async () => {
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] }); // locked current row
    mocks.clientScript.push({ rows: [userRow({ status: 'deactivated' })] }); // UPDATE users
    mocks.clientScript.push({ rows: [] }); // revoke refresh tokens

    const res = await applyUserSanction(mocks.deps, SANCTIONER, BAN);

    expect(res).toEqual({
      userId: 'usr-1',
      status: AuthV1.UserStatus.USER_STATUS_DEACTIVATED,
    });
    const sql = (mocks.clientMock.query.mock.calls as Array<[string]>).map(([q]) => q).join(' ');
    expect(sql).toContain('tokens_valid_from');
    expect(sql).toContain('UPDATE auth.refresh_tokens');
    expect(publishedEvents(mocks).map(([subject]) => subject)).toEqual(['auth.actionTaken']);
    expect(actionTaken(mocks)[0]).toMatchObject({ action: 'ban', actorUserId: 'mod-1' });
  });

  it('rolls everything back, with no event, when revoking the sessions fails', async () => {
    mocks.clientScript.push({ rows: [userRow({ status: 'active' })] });
    mocks.clientScript.push({ rows: [userRow({ status: 'deactivated' })] });
    // No scripted result for the revoke: the query throws.

    await expect(applyUserSanction(mocks.deps, SANCTIONER, BAN)).rejects.toThrow();

    const ops = (mocks.clientMock.query.mock.calls as Array<[string]>).map(([q]) =>
      q.trim().split(/\s+/)[0].toUpperCase()
    );
    expect(ops).toContain('ROLLBACK');
    expect(ops).not.toContain('COMMIT');
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });
});
