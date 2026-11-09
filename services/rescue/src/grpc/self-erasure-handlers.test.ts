import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { RescueId, UserId } from '@adopt-dont-shop/lib.types';

import type { HandlerDeps } from './handlers.js';
import { checkSelfErasure } from './self-erasure-handlers.js';

const STAFF: Principal = {
  userId: 'usr-staff' as UserId,
  roles: ['rescue_staff'],
  permissions: [],
  rescueId: 'rsc-1' as RescueId,
};

function makeMocks() {
  const pool = { query: vi.fn(), connect: vi.fn() };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: {} as unknown as NatsConnection,
  };
  return { deps, poolMock: pool };
}

describe('checkSelfErasure (rescue)', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  it('allows a user with no staff memberships', async () => {
    // No rescue the caller belongs to lacks another staff member.
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    const res = await checkSelfErasure(mocks.deps, STAFF, {});

    expect(res).toEqual({ allowed: true, blockedReason: '' });
  });

  it('allows a staff member whose rescue has another non-deleted staff member', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    const res = await checkSelfErasure(mocks.deps, STAFF, {});

    expect(res).toEqual({ allowed: true, blockedReason: '' });
  });

  it('blocks the only non-deleted staff member of one of their rescues', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ rescue_id: 'rsc-1' }] });

    const res = await checkSelfErasure(mocks.deps, STAFF, {});

    expect(res).toEqual({ allowed: false, blockedReason: 'last_rescue_staff' });
  });

  it("scopes the check to the caller's live memberships of live rescues, counting only other live staff", async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    await checkSelfErasure(mocks.deps, STAFF, {});

    const [sql, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual([STAFF.userId]);
    const normalised = sql.replace(/\s+/g, ' ');
    // The caller's membership, the rescue, and the "other staff" probe must
    // all ignore soft-deleted rows.
    expect(normalised).toContain('sm.deleted_at IS NULL');
    expect(normalised).toContain('r.deleted_at IS NULL');
    expect(normalised).toContain('other.deleted_at IS NULL');
    // A second row for the same user is not "another" staff member.
    expect(normalised).toContain('other.user_id <> $1');
  });

  it('rejects a call with no principal as UNAUTHENTICATED', async () => {
    await expect(checkSelfErasure(mocks.deps, null, {})).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });
});
