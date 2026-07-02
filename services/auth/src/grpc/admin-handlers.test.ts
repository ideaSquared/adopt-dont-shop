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
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
  });

  it('no-op update returns the current row without writing', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRow()] }); // adminGetUser fallback
    const res = await adminUpdateUser(mocks.deps, ADMIN, { userId: 'usr-1' });
    expect(res.user?.userId).toBe('usr-1');
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
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
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRow({ status: 'deactivated' })] });
    const res = await deactivateUser(mocks.deps, ADMIN, { userId: 'usr-1' });
    expect(res.user?.status).toBe(AuthV1.UserStatus.USER_STATUS_DEACTIVATED);
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('deactivates an active user + publishes auth.userDeactivated', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRow({ status: 'active' })] });
    mocks.clientScript.push({ rows: [userRow({ status: 'deactivated' })] });

    const res = await deactivateUser(mocks.deps, ADMIN, { userId: 'usr-1', reason: 'spam' });
    expect(res.user?.status).toBe(AuthV1.UserStatus.USER_STATUS_DEACTIVATED);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.userDeactivated');
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
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [userRow({ status: 'deactivated' })] });
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
    mocks.clientScript.push({ rows: [] }); // UPDATE auth.users returns no rows
    await expect(adminResetPassword(mocks.deps, ADMIN, { userId: 'ghost' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('hashes a generated password, revokes sessions, and publishes the event', async () => {
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
    mocks.clientScript.push({ rows: [] }); // UPDATE auth.users returns no rows
    await expect(
      adminLockAccount(mocks.deps, SECURITY_ADMIN, { userId: 'ghost' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('locks the account and publishes auth.accountLockedByAdmin', async () => {
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

  it('refuses super_admin assignment from a non-super_admin actor', async () => {
    await expect(
      bulkUpdateUsers(mocks.deps, ADMIN, {
        userIds: ['usr-2'],
        userType: AuthV1.UserRole.USER_ROLE_SUPER_ADMIN,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
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
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
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

  it('does not include the email address in the ALREADY_EXISTS error message', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ exists: 1 }] });
    let caught: unknown;
    try {
      await adminCreateUser(mocks.deps, ADMIN_CREATOR, baseReq);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeDefined();
    expect((caught as { message: string }).message).not.toContain(baseReq.email);
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
