import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { UserId } from '@adopt-dont-shop/lib.types';

import { type HandlerDeps } from './handlers.js';
import { checkSelfErasure } from './self-erasure-handlers.js';

const ADOPTER: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: [],
};

const SUPER_ADMIN: Principal = {
  userId: 'usr-super' as UserId,
  roles: ['super_admin'],
  permissions: [],
};

function makeMocks() {
  const pool = { query: vi.fn(), connect: vi.fn() };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: {} as unknown as NatsConnection,
    passwordHasher: { compare: vi.fn(), hash: vi.fn() },
    tokenIssuer: { mint: vi.fn(), verifyAccess: vi.fn(), verifyRefresh: vi.fn() },
    encryptionKey: 'a'.repeat(64),
  };
  return { deps, poolMock: pool };
}

// The single row the pre-check reads: is the caller an active super admin,
// and does any OTHER active, non-deleted super admin exist.
const superAdminRow = (
  callerIsActiveSuperAdmin: boolean,
  otherActiveSuperAdminExists: boolean
) => ({
  rows: [
    {
      caller_is_active_super_admin: callerIsActiveSuperAdmin,
      other_active_super_admin_exists: otherActiveSuperAdminExists,
    },
  ],
});

describe('checkSelfErasure (auth)', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  it('allows an ordinary user to erase their account', async () => {
    mocks.poolMock.query.mockResolvedValueOnce(superAdminRow(false, false));

    const res = await checkSelfErasure(mocks.deps, ADOPTER, {});

    expect(res).toEqual({ allowed: true, blockedReason: '' });
  });

  it('allows a super admin when another active super admin exists', async () => {
    mocks.poolMock.query.mockResolvedValueOnce(superAdminRow(true, true));

    const res = await checkSelfErasure(mocks.deps, SUPER_ADMIN, {});

    expect(res).toEqual({ allowed: true, blockedReason: '' });
  });

  it('blocks the last active super admin', async () => {
    mocks.poolMock.query.mockResolvedValueOnce(superAdminRow(true, false));

    const res = await checkSelfErasure(mocks.deps, SUPER_ADMIN, {});

    expect(res).toEqual({ allowed: false, blockedReason: 'last_super_admin' });
  });

  it('scopes the check to the caller and counts only active, non-deleted super admins', async () => {
    mocks.poolMock.query.mockResolvedValueOnce(superAdminRow(true, false));

    await checkSelfErasure(mocks.deps, SUPER_ADMIN, {});

    const [sql, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual([SUPER_ADMIN.userId]);
    // Both the caller and the "another super admin" probe must ignore
    // deactivated/suspended and soft-deleted super admins — those cannot
    // administer the platform, so they don't keep the caller from being last.
    const normalised = sql.replace(/\s+/g, ' ');
    expect(normalised.match(/user_type = 'super_admin'/g)).toHaveLength(2);
    expect(normalised.match(/status = 'active'/g)).toHaveLength(2);
    expect(normalised.match(/deleted_at IS NULL/g)).toHaveLength(2);
    expect(normalised).toContain('user_id <> $1');
  });

  it('rejects a call with no principal as UNAUTHENTICATED', async () => {
    await expect(checkSelfErasure(mocks.deps, null, {})).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });
});
