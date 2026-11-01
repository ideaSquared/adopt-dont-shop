import type { Metadata } from '@grpc/grpc-js';
import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import { APPLICATIONS_VIEW, STAFF_VIEW, type UserId } from '@adopt-dont-shop/lib.types';
import { RescueV1 } from '@adopt-dont-shop/proto';

import { makeListColleagueProfiles } from './colleague-handlers.js';
import type { HandlerDeps } from './handlers.js';
import type { RescueClient } from './rescue-client.js';

const STAFF: Principal = {
  userId: 'usr-me' as UserId,
  roles: ['rescue_staff'],
  permissions: [STAFF_VIEW],
  rescueId: 'rsc-1',
};

// Holds a rescue but not staff.read.
const NO_STAFF_READ: Principal = { ...STAFF, permissions: [APPLICATIONS_VIEW] };

const GRPC_NOT_FOUND = 5;
const GRPC_PERMISSION_DENIED = 7;
const GRPC_UNAVAILABLE = 14;
const GRPC_INTERNAL = 13;

const USER_ROWS = [
  { user_id: 'usr-a', first_name: 'Ann', last_name: 'Lee', email: 'ann@x.test' },
  { user_id: 'usr-b', first_name: null, last_name: null, email: 'b@x.test' },
];

function makeMocks() {
  const listStaffMembers = vi.fn().mockResolvedValue({
    staffMembers: ['usr-me', 'usr-a', 'usr-b'].map(userId =>
      RescueV1.StaffMember.fromPartial({ userId })
    ),
  });
  const rescueClient: RescueClient = { listStaffMembers, close: vi.fn() };
  const query = vi.fn().mockResolvedValue({ rows: USER_ROWS });
  const deps: HandlerDeps = {
    pool: { query } as unknown as Pool,
    nats: {} as unknown as NatsConnection,
    passwordHasher: {} as unknown as HandlerDeps['passwordHasher'],
    tokenIssuer: {} as unknown as HandlerDeps['tokenIssuer'],
  };
  return { deps, listStaffMembers, query, rescueClient };
}

describe('listColleagueProfiles', () => {
  let mocks: ReturnType<typeof makeMocks>;
  let listColleagueProfiles: ReturnType<typeof makeListColleagueProfiles>;

  beforeEach(() => {
    mocks = makeMocks();
    listColleagueProfiles = makeListColleagueProfiles(mocks.rescueClient);
  });

  it('returns name and email for requested ids that are staff of the caller rescue', async () => {
    const res = await listColleagueProfiles(mocks.deps, STAFF, { userIds: ['usr-a', 'usr-b'] });

    expect(res.profiles).toEqual([
      { userId: 'usr-a', firstName: 'Ann', lastName: 'Lee', email: 'ann@x.test' },
      { userId: 'usr-b', firstName: '', lastName: '', email: 'b@x.test' },
    ]);
  });

  it("resolves the caller's own rescue under their principal, never from the request", async () => {
    await listColleagueProfiles(mocks.deps, STAFF, { userIds: ['usr-a'] });

    const [req, metadata] = mocks.listStaffMembers.mock.calls[0] as [
      { rescueId?: string },
      Metadata,
    ];
    expect(req.rescueId).toBeUndefined();
    expect(metadata.get('x-user-id')).toEqual(['usr-me']);
  });

  it('silently omits ids that are not staff of the caller rescue', async () => {
    await listColleagueProfiles(mocks.deps, STAFF, { userIds: ['usr-a', 'usr-outsider'] });

    expect(mocks.query.mock.calls[0]?.[1]).toEqual([['usr-a']]);
  });

  it('does not query users at all when no requested id is a colleague', async () => {
    const res = await listColleagueProfiles(mocks.deps, STAFF, { userIds: ['usr-outsider'] });

    expect(res.profiles).toEqual([]);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('returns nothing for an empty request without calling the rescue service', async () => {
    const res = await listColleagueProfiles(mocks.deps, STAFF, { userIds: [] });

    expect(res.profiles).toEqual([]);
    expect(mocks.listStaffMembers).not.toHaveBeenCalled();
  });

  it('rejects more than 100 ids', async () => {
    const userIds = Array.from({ length: 101 }, (_, i) => `usr-${i}`);

    await expect(listColleagueProfiles(mocks.deps, STAFF, { userIds })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
    expect(mocks.listStaffMembers).not.toHaveBeenCalled();
  });

  it('accepts exactly 100 ids', async () => {
    const userIds = Array.from({ length: 100 }, (_, i) => `usr-${i}`);

    await expect(listColleagueProfiles(mocks.deps, STAFF, { userIds })).resolves.toBeDefined();
  });

  it('requires staff.read', async () => {
    await expect(
      listColleagueProfiles(mocks.deps, NO_STAFF_READ, { userIds: ['usr-a'] })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.listStaffMembers).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('refuses when the rescue service denies the caller', async () => {
    mocks.listStaffMembers.mockRejectedValueOnce({ code: GRPC_PERMISSION_DENIED });

    await expect(
      listColleagueProfiles(mocks.deps, STAFF, { userIds: ['usr-a'] })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('returns nothing for a caller who belongs to no rescue', async () => {
    mocks.listStaffMembers.mockRejectedValueOnce({ code: GRPC_NOT_FOUND });

    const res = await listColleagueProfiles(mocks.deps, STAFF, { userIds: ['usr-a'] });

    expect(res.profiles).toEqual([]);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('returns UNAVAILABLE when the rescue service is unreachable', async () => {
    mocks.listStaffMembers.mockRejectedValueOnce({ code: GRPC_UNAVAILABLE });

    await expect(
      listColleagueProfiles(mocks.deps, STAFF, { userIds: ['usr-a'] })
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });

  it('returns INTERNAL for an unexpected rescue-service failure', async () => {
    mocks.listStaffMembers.mockRejectedValueOnce({ code: GRPC_INTERNAL });

    await expect(
      listColleagueProfiles(mocks.deps, STAFF, { userIds: ['usr-a'] })
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });
});
