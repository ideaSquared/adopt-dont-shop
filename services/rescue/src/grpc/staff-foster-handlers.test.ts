import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';
import { RescueV1 } from '@adopt-dont-shop/proto';

import type { HandlerDeps } from './handlers.js';
import type { PetsClient } from './pets-client.js';
import {
  acceptInvitation,
  createStaffMember,
  endFosterPlacement,
  getFosterPlacement,
  getInvitationByToken,
  getMyStaffMembership,
  listFosterPlacements,
  listStaffMembers,
  makeCreateFosterPlacement,
  removeStaffMember,
  updateStaffMember,
} from './staff-foster-handlers.js';

const RESCUE_ID = 'rsc-1';

const STAFF: Principal = {
  userId: 'usr-staff' as UserId,
  roles: ['rescue_staff'],
  permissions: [
    'staff.read' as Permission,
    'foster.create' as Permission,
    'foster.read' as Permission,
    'foster.update' as Permission,
  ],
  rescueId: RESCUE_ID as RescueId,
};

const STAFF_MANAGER: Principal = {
  userId: 'usr-admin' as UserId,
  roles: ['rescue_admin'],
  permissions: [
    'staff.create' as Permission,
    'staff.update' as Permission,
    'staff.delete' as Permission,
  ],
  rescueId: RESCUE_ID as RescueId,
};

const UNPRIVILEGED: Principal = {
  userId: 'usr-nobody' as UserId,
  roles: ['adopter'],
  permissions: [],
};

const SUPER_ADMIN: Principal = {
  userId: 'usr-super' as UserId,
  roles: ['super_admin'],
  permissions: [],
};

function makeClientQuery() {
  const script: Array<{ rows: unknown[] }> = [];
  const fn = vi.fn().mockImplementation(async (sql: string) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return { rows: [] };
    }
    return script.shift() ?? { rows: [] };
  });
  return { fn, push: (rows: unknown[]) => script.push({ rows }) };
}

function makeMocks() {
  const c = makeClientQuery();
  const client = { query: c.fn, release: vi.fn() };
  const pool = { connect: vi.fn().mockResolvedValue(client), query: vi.fn() };
  pool.query.mockResolvedValue({ rows: [] });
  const natsPublish = vi.fn();
  // JetStream publish routes to the same spy so existing publish assertions
  // keep working; withTransaction now publishes via nats.jetstream().publish().
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
  };
  return { deps, poolMock: pool, clientMock: client, clientScript: c.push, natsMock: nats };
}

const staffRow = (overrides: Record<string, unknown> = {}) => ({
  staff_member_id: 'stf-1',
  user_id: 'usr-staff',
  rescue_id: RESCUE_ID,
  title: 'Volunteer',
  is_verified: true,
  verified_by: 'usr-admin',
  verified_at: new Date('2026-06-01T00:00:00Z'),
  added_by: 'usr-admin',
  added_at: new Date('2026-06-01T00:00:00Z'),
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

const fosterRow = (overrides: Record<string, unknown> = {}) => ({
  placement_id: 'fp-1',
  rescue_id: RESCUE_ID,
  pet_id: 'pet-1',
  foster_user_id: 'usr-foster',
  start_date: new Date('2026-06-01T00:00:00Z'),
  end_date: null,
  status: 'active' as const,
  notes: null,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

// --- GetMyStaffMembership -------------------------------------------

describe('getMyStaffMembership', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('returns the calling user’s staff record', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [staffRow()] });
    const res = await getMyStaffMembership(mocks.deps, STAFF, {});
    expect(res.staffMember?.staffMemberId).toBe('stf-1');
    expect(res.staffMember?.rescueId).toBe(RESCUE_ID);
    expect(res.staffMember?.isVerified).toBe(true);
  });

  it('returns NOT_FOUND when the user is not staff anywhere', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(getMyStaffMembership(mocks.deps, STAFF, {})).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

// --- ListStaffMembers -----------------------------------------------

describe('listStaffMembers', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects callers without staff.read', async () => {
    await expect(
      listStaffMembers(mocks.deps, UNPRIVILEGED, { rescueId: RESCUE_ID })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('resolves the caller’s own rescue when rescue_id omitted (colleagues)', async () => {
    // 1: resolve my rescue. 2: list staff.
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ rescue_id: RESCUE_ID }] });
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [staffRow(), staffRow({ staff_member_id: 'stf-2', user_id: 'usr-2' })],
    });

    const res = await listStaffMembers(mocks.deps, STAFF, { rescueId: undefined });
    expect(res.staffMembers).toHaveLength(2);
    // The list query was parameterized on the resolved rescue id.
    expect(mocks.poolMock.query.mock.calls[1][1]).toEqual([RESCUE_ID]);
  });

  it('rejects listing a different rescue when caller is not a member', async () => {
    // membership check returns empty
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      listStaffMembers(mocks.deps, STAFF, { rescueId: 'rsc-other' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('super_admin can list any rescue without membership', async () => {
    // super_admin needs staff.read though — give it via roles? No, perms.
    const superWithRead: Principal = {
      ...SUPER_ADMIN,
      permissions: ['staff.read' as Permission],
    };
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [staffRow()] });
    const res = await listStaffMembers(mocks.deps, superWithRead, { rescueId: 'rsc-any' });
    expect(res.staffMembers).toHaveLength(1);
  });
});

// --- CreateStaffMember ------------------------------------------------

describe('createStaffMember', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  const baseReq = { rescueId: RESCUE_ID, userId: 'usr-new', title: 'Volunteer' };

  it('rejects missing rescue_id', async () => {
    await expect(
      createStaffMember(mocks.deps, STAFF_MANAGER, { ...baseReq, rescueId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects missing user_id', async () => {
    await expect(
      createStaffMember(mocks.deps, STAFF_MANAGER, { ...baseReq, userId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects callers without staff.create for the rescue', async () => {
    await expect(createStaffMember(mocks.deps, UNPRIVILEGED, baseReq)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects a user who is already a staff member of the rescue', async () => {
    mocks.clientScript([staffRow({ user_id: 'usr-new' })]);
    await expect(createStaffMember(mocks.deps, STAFF_MANAGER, baseReq)).rejects.toMatchObject({
      code: 'ALREADY_EXISTS',
    });
  });

  it('inserts a verified staff member + publishes rescue.staffMemberCreated', async () => {
    mocks.clientScript([]); // existing membership check → none
    mocks.clientScript([staffRow({ user_id: 'usr-new', title: 'Volunteer' })]); // insert

    const res = await createStaffMember(mocks.deps, STAFF_MANAGER, baseReq);

    expect(res.staffMember?.userId).toBe('usr-new');
    expect(res.staffMember?.isVerified).toBe(true);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('rescue.staffMemberCreated');
  });
});

// --- UpdateStaffMember ------------------------------------------------

describe('updateStaffMember', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  const baseReq = { rescueId: RESCUE_ID, userId: 'usr-staff', title: 'Lead Volunteer' };

  it('rejects missing rescue_id', async () => {
    await expect(
      updateStaffMember(mocks.deps, STAFF_MANAGER, { ...baseReq, rescueId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects missing user_id', async () => {
    await expect(
      updateStaffMember(mocks.deps, STAFF_MANAGER, { ...baseReq, userId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects callers without staff.update for the rescue', async () => {
    await expect(updateStaffMember(mocks.deps, UNPRIVILEGED, baseReq)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns NOT_FOUND when the membership does not exist', async () => {
    mocks.clientScript([]);
    await expect(updateStaffMember(mocks.deps, STAFF_MANAGER, baseReq)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('updates the title + publishes rescue.staffMemberUpdated', async () => {
    mocks.clientScript([staffRow()]); // existing
    mocks.clientScript([staffRow({ title: 'Lead Volunteer' })]); // update

    const res = await updateStaffMember(mocks.deps, STAFF_MANAGER, baseReq);

    expect(res.staffMember?.title).toBe('Lead Volunteer');
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('rescue.staffMemberUpdated');
  });
});

// --- RemoveStaffMember ------------------------------------------------

describe('removeStaffMember', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  const baseReq = { rescueId: RESCUE_ID, userId: 'usr-staff' };

  it('rejects missing rescue_id', async () => {
    await expect(
      removeStaffMember(mocks.deps, STAFF_MANAGER, { ...baseReq, rescueId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects missing user_id', async () => {
    await expect(
      removeStaffMember(mocks.deps, STAFF_MANAGER, { ...baseReq, userId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects callers without staff.delete for the rescue', async () => {
    await expect(removeStaffMember(mocks.deps, UNPRIVILEGED, baseReq)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns NOT_FOUND when the membership does not exist or was already removed', async () => {
    mocks.clientScript([]);
    await expect(removeStaffMember(mocks.deps, STAFF_MANAGER, baseReq)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('soft-deletes the membership + publishes rescue.staffMemberRemoved', async () => {
    mocks.clientScript([staffRow()]); // existing
    mocks.clientScript([]); // UPDATE ... SET deleted_at

    const res = await removeStaffMember(mocks.deps, STAFF_MANAGER, baseReq);

    expect(res.removed).toBe(true);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('rescue.staffMemberRemoved');
  });
});

// --- CreateFosterPlacement ------------------------------------------

describe('createFosterPlacement', () => {
  let mocks: ReturnType<typeof makeMocks>;
  let petsStub: { getPet: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  let createFosterPlacement: ReturnType<typeof makeCreateFosterPlacement>;

  beforeEach(() => {
    mocks = makeMocks();
    // Default: the pet belongs to the placement's rescue.
    petsStub = {
      getPet: vi.fn(async () => ({ pet: { petId: 'pet-1', rescueId: RESCUE_ID } })),
      close: vi.fn(),
    };
    createFosterPlacement = makeCreateFosterPlacement(petsStub as unknown as PetsClient);
  });

  const baseReq = {
    rescueId: RESCUE_ID,
    petId: 'pet-1',
    fosterUserId: 'usr-foster',
    startDate: '2026-06-01T00:00:00Z',
  };

  it('rejects missing pet_id', async () => {
    await expect(
      createFosterPlacement(mocks.deps, STAFF, { ...baseReq, petId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects callers without foster.create for the rescue', async () => {
    await expect(createFosterPlacement(mocks.deps, UNPRIVILEGED, baseReq)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(petsStub.getPet).not.toHaveBeenCalled();
  });

  it('rejects a pet that belongs to another rescue', async () => {
    petsStub.getPet.mockResolvedValueOnce({ pet: { petId: 'pet-1', rescueId: 'rsc-2' } });
    await expect(createFosterPlacement(mocks.deps, STAFF, baseReq)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
    // No insert / publish on a rejected pet.
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('rejects a pet the caller cannot read (pets NOT_FOUND)', async () => {
    petsStub.getPet.mockRejectedValueOnce({ code: 5 });
    await expect(createFosterPlacement(mocks.deps, STAFF, baseReq)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('surfaces an unexpected pets error as INTERNAL', async () => {
    petsStub.getPet.mockRejectedValueOnce({ code: 13 });
    await expect(createFosterPlacement(mocks.deps, STAFF, baseReq)).rejects.toMatchObject({
      code: 'INTERNAL',
    });
  });

  it('inserts the placement + publishes rescue.fosterPlacementCreated', async () => {
    mocks.clientScript([fosterRow()]);
    const res = await createFosterPlacement(mocks.deps, STAFF, baseReq);
    expect(petsStub.getPet).toHaveBeenCalledTimes(1);
    expect(res.placement?.placementId).toBe('fp-1');
    expect(res.placement?.status).toBe(
      RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_ACTIVE
    );
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('rescue.fosterPlacementCreated');
  });
});

// --- ListFosterPlacements -------------------------------------------

describe('listFosterPlacements', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('applies rescue + status filters in the query', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [fosterRow()] });
    const res = await listFosterPlacements(mocks.deps, STAFF, {
      rescueId: RESCUE_ID,
      fosterUserId: undefined,
      statusFilter: RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_ACTIVE,
    });
    expect(res.placements).toHaveLength(1);
    const params = mocks.poolMock.query.mock.calls[0][1] as unknown[];
    expect(params).toContain(RESCUE_ID);
    expect(params).toContain('active');
  });

  it('rejects an unscoped list when caller lacks foster.read', async () => {
    await expect(
      listFosterPlacements(mocks.deps, UNPRIVILEGED, {
        rescueId: undefined,
        fosterUserId: undefined,
        statusFilter: RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_UNSPECIFIED,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('pins a non-super_admin with no rescue_id to their own rescue (no cross-rescue list)', async () => {
    // foster.read is rescue-scoped; without a rescue_id, staff must NOT get an
    // unscoped cross-rescue read. Resolve their own rescue and force it in.
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ rescue_id: RESCUE_ID }] }); // membership
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [fosterRow()] }); // foster list

    await listFosterPlacements(mocks.deps, STAFF, {
      rescueId: undefined,
      fosterUserId: 'usr-target',
      statusFilter: RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_UNSPECIFIED,
    });

    // The foster query (2nd call) must be scoped to the caller's own rescue.
    const fosterSql = mocks.poolMock.query.mock.calls[1][0] as string;
    const fosterParams = mocks.poolMock.query.mock.calls[1][1] as unknown[];
    expect(fosterSql).toMatch(/rescue_id = \$/);
    expect(fosterParams).toContain(RESCUE_ID);
  });

  it('returns NOT_FOUND when a non-super_admin with no rescue_id has no rescue membership', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] }); // membership → none
    await expect(
      listFosterPlacements(mocks.deps, STAFF, {
        rescueId: undefined,
        fosterUserId: undefined,
        statusFilter: RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_UNSPECIFIED,
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('lets a super_admin list across rescues when no rescue_id is given', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [fosterRow()] }); // foster list (only query)

    await listFosterPlacements(mocks.deps, SUPER_ADMIN, {
      rescueId: undefined,
      fosterUserId: undefined,
      statusFilter: RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_UNSPECIFIED,
    });

    // Single query, no rescue_id predicate or param — a true cross-rescue list.
    expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
    const fosterSql = mocks.poolMock.query.mock.calls[0][0] as string;
    expect(fosterSql).not.toMatch(/rescue_id = \$/);
  });
});

// --- GetFosterPlacement ---------------------------------------------

describe('getFosterPlacement', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('returns NOT_FOUND for a missing placement', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      getFosterPlacement(mocks.deps, STAFF, { placementId: 'fp-missing' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns the placement after a foster.read scope check', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [fosterRow()] });
    const res = await getFosterPlacement(mocks.deps, STAFF, { placementId: 'fp-1' });
    expect(res.placement?.placementId).toBe('fp-1');
  });
});

// --- EndFosterPlacement ---------------------------------------------

describe('endFosterPlacement', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects UNSPECIFIED outcome', async () => {
    await expect(
      endFosterPlacement(mocks.deps, STAFF, {
        placementId: 'fp-1',
        outcome: RescueV1.FosterEndOutcome.FOSTER_END_OUTCOME_UNSPECIFIED,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('PERMISSION_DENIED when the placement belongs to another rescue', async () => {
    // Existing placement is owned by a rescue the STAFF principal is not
    // scoped to — the foster.update gate must reject the cross-rescue end.
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [fosterRow({ rescue_id: 'rsc-other' })],
    });
    await expect(
      endFosterPlacement(mocks.deps, STAFF, {
        placementId: 'fp-1',
        outcome: RescueV1.FosterEndOutcome.FOSTER_END_OUTCOME_RETURN_TO_RESCUE,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('is idempotent on already-ended placements (no publish)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [fosterRow({ status: 'completed', end_date: new Date() })],
    });
    const res = await endFosterPlacement(mocks.deps, STAFF, {
      placementId: 'fp-1',
      outcome: RescueV1.FosterEndOutcome.FOSTER_END_OUTCOME_RETURN_TO_RESCUE,
    });
    expect(res.placement?.status).toBe(
      RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_COMPLETED
    );
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('ends an active placement → completed + publishes', async () => {
    // 1: load existing (active). 2 (in tx): UPDATE returns completed row.
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [fosterRow()] });
    mocks.clientScript([fosterRow({ status: 'completed', end_date: new Date() })]);

    const res = await endFosterPlacement(mocks.deps, STAFF, {
      placementId: 'fp-1',
      outcome: RescueV1.FosterEndOutcome.FOSTER_END_OUTCOME_ADOPTED_BY_FOSTER,
    });
    expect(res.placement?.status).toBe(
      RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_COMPLETED
    );
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('rescue.fosterPlacementEnded');
  });
});

// --- GetInvitationByToken -------------------------------------------

describe('getInvitationByToken', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  const invRow = (overrides: Record<string, unknown> = {}) => ({
    invitation_id: 'inv-1',
    email: 'invitee@example.com',
    rescue_id: RESCUE_ID,
    user_id: null,
    title: 'Volunteer',
    invited_by: 'usr-admin',
    expiration: new Date(Date.now() + 86_400_000),
    used: false,
    created_at: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  });

  it('rejects an empty token', async () => {
    await expect(getInvitationByToken(mocks.deps, null, { token: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('returns the invitation for a valid token (unauthenticated)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [invRow()] });
    const res = await getInvitationByToken(mocks.deps, null, { token: 'tok-abc' });
    expect(res.invitation?.email).toBe('invitee@example.com');
    expect(res.invitation?.rescueId).toBe(RESCUE_ID);
  });

  it('returns NOT_FOUND for a used invitation', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [invRow({ used: true })] });
    await expect(
      getInvitationByToken(mocks.deps, null, { token: 'tok-used' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns NOT_FOUND for an expired invitation', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [invRow({ expiration: new Date(Date.now() - 1000) })],
    });
    await expect(
      getInvitationByToken(mocks.deps, null, { token: 'tok-old' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// --- AcceptInvitation -----------------------------------------------

describe('acceptInvitation', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  const invRow = (overrides: Record<string, unknown> = {}) => ({
    invitation_id: 'inv-1',
    email: 'invitee@example.com',
    rescue_id: RESCUE_ID,
    user_id: null,
    title: 'Volunteer',
    invited_by: 'usr-admin',
    expiration: new Date(Date.now() + 86_400_000),
    used: false,
    created_at: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  });

  it('rejects a missing token', async () => {
    await expect(
      acceptInvitation(mocks.deps, null, { token: '', userId: 'usr-new' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects a missing user_id', async () => {
    await expect(
      acceptInvitation(mocks.deps, null, { token: 'tok-abc', userId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('marks the invitation used and inserts a verified staff membership', async () => {
    // 1. SELECT FOR UPDATE invitation, 2. SELECT existing membership (none),
    // 3. INSERT staff_members, 4. UPDATE invitation.
    mocks.clientScript([invRow()]);
    mocks.clientScript([]);
    mocks.clientScript([staffRow({ user_id: 'usr-new', title: 'Volunteer', is_verified: true })]);
    mocks.clientScript([]);

    const res = await acceptInvitation(mocks.deps, null, {
      token: 'tok-abc',
      userId: 'usr-new',
    });

    expect(res.staffMember?.userId).toBe('usr-new');
    expect(res.staffMember?.rescueId).toBe(RESCUE_ID);
    expect(res.staffMember?.isVerified).toBe(true);

    const sqls = mocks.clientMock.query.mock.calls.map(c => String(c[0]).trim().split(/\s+/)[0]);
    expect(sqls).toContain('INSERT');
    expect(sqls).toContain('UPDATE');
    expect(mocks.natsMock.publish).toHaveBeenCalled();
  });

  it('is idempotent — returns the existing membership without re-inserting', async () => {
    // 1. SELECT FOR UPDATE invitation (already used), 2. SELECT existing
    // membership (found) → short-circuits before any INSERT/UPDATE.
    mocks.clientScript([invRow({ used: true, user_id: 'usr-new' })]);
    mocks.clientScript([staffRow({ user_id: 'usr-new' })]);

    const res = await acceptInvitation(mocks.deps, null, {
      token: 'tok-abc',
      userId: 'usr-new',
    });

    expect(res.staffMember?.userId).toBe('usr-new');
    const sqls = mocks.clientMock.query.mock.calls.map(c => String(c[0]).trim().split(/\s+/)[0]);
    expect(sqls).not.toContain('INSERT');
  });

  it('returns NOT_FOUND for an expired invitation', async () => {
    mocks.clientScript([invRow({ expiration: new Date(Date.now() - 1000) })]);
    await expect(
      acceptInvitation(mocks.deps, null, { token: 'tok-old', userId: 'usr-new' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns NOT_FOUND for an unknown token', async () => {
    mocks.clientScript([]);
    await expect(
      acceptInvitation(mocks.deps, null, { token: 'tok-nope', userId: 'usr-new' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns NOT_FOUND when the token was already used by a different user', async () => {
    // Invitation used; no membership for THIS user → already consumed by
    // someone else. Don't reveal that — treat as no longer valid.
    mocks.clientScript([invRow({ used: true, user_id: 'usr-other' })]);
    mocks.clientScript([]);
    await expect(
      acceptInvitation(mocks.deps, null, { token: 'tok-abc', userId: 'usr-new' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
