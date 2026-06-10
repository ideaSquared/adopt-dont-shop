import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';
import { RescueV1 } from '@adopt-dont-shop/proto';

import type { HandlerDeps } from './handlers.js';
import {
  createFosterPlacement,
  endFosterPlacement,
  getFosterPlacement,
  getInvitationByToken,
  getMyStaffMembership,
  listFosterPlacements,
  listStaffMembers,
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

// --- CreateFosterPlacement ------------------------------------------

describe('createFosterPlacement', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
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
  });

  it('inserts the placement + publishes rescue.fosterPlacementCreated', async () => {
    mocks.clientScript([fosterRow()]);
    const res = await createFosterPlacement(mocks.deps, STAFF, baseReq);
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
