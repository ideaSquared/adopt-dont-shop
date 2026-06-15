import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';
import { PetsV1, type CreatePetRequest } from '@adopt-dont-shop/proto';

import {
  createPet,
  deletePet,
  getPet,
  getPetStats,
  HandlerError,
  listFavoriters,
  listPets,
  updatePet,
  updatePetStatus,
  type HandlerDeps,
} from './handlers.js';

// --- Fixtures --------------------------------------------------------

const RESCUE_ID = 'rsc-1';

// Rescue staff scoped to RESCUE_ID with the full pets permission set.
const STAFF: Principal = {
  userId: 'usr-staff' as UserId,
  roles: ['rescue_staff'],
  permissions: [
    'pets.create' as Permission,
    'pets.read' as Permission,
    'pets.update' as Permission,
    'pets.delete' as Permission,
  ],
  rescueId: RESCUE_ID as RescueId,
};

// Staff at a DIFFERENT rescue — same permissions, wrong scope.
const OTHER_STAFF: Principal = {
  userId: 'usr-other' as UserId,
  roles: ['rescue_staff'],
  permissions: [
    'pets.create' as Permission,
    'pets.update' as Permission,
    'pets.delete' as Permission,
    'pets.read' as Permission,
  ],
  rescueId: 'rsc-2' as RescueId,
};

const ADOPTER: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: ['pets.read' as Permission],
};

const SUPER_ADMIN: Principal = {
  userId: 'usr-super' as UserId,
  roles: ['super_admin'],
  permissions: [],
};

function petRow(overrides: Record<string, unknown> = {}) {
  return {
    pet_id: 'pet-1',
    name: 'Rex',
    rescue_id: RESCUE_ID,
    type: 'dog',
    status: 'available',
    gender: 'male',
    size: 'large',
    age_group: 'adult',
    breed_id: null,
    secondary_breed_id: null,
    short_description: null,
    long_description: null,
    age_years: 3,
    age_months: null,
    color: 'brown',
    archived: false,
    featured: false,
    priority_listing: false,
    adoption_fee_minor: 5000,
    adoption_fee_currency: 'GBP',
    special_needs: false,
    house_trained: true,
    temperament: ['friendly'],
    tags: [],
    good_with_children: true,
    good_with_dogs: true,
    good_with_cats: null,
    good_with_small_animals: null,
    medical_notes: null,
    behavioral_notes: null,
    view_count: 0,
    favorite_count: 0,
    application_count: 0,
    available_since: new Date('2026-06-01T00:00:00Z'),
    adopted_date: null,
    created_at: new Date('2026-06-01T00:00:00Z'),
    updated_at: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  };
}

function makeMocks() {
  const client = { query: vi.fn(), release: vi.fn() };
  const pool = { connect: vi.fn().mockResolvedValue(client), query: vi.fn() };
  const natsPublish = vi.fn();
  // JetStream publish routes to the same spy so existing publish assertions
  // keep working; withTransaction now publishes via nats.jetstream().publish().
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
  };
  return { deps, poolMock: pool, clientMock: client, natsMock: nats };
}

const BASE_CREATE: CreatePetRequest = {
  name: 'Rex',
  rescueId: RESCUE_ID,
  type: PetsV1.PetType.PET_TYPE_DOG,
  gender: PetsV1.PetGender.PET_GENDER_MALE,
  size: PetsV1.PetSize.PET_SIZE_LARGE,
  ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
  specialNeeds: false,
  houseTrained: true,
  temperamentJson: '["friendly"]',
  tagsJson: '[]',
  extraJson: '{}',
};

// --- createPet -------------------------------------------------------

describe('createPet', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects missing name / rescue_id / type', async () => {
    await expect(createPet(mocks.deps, STAFF, { ...BASE_CREATE, name: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
    await expect(
      createPet(mocks.deps, STAFF, { ...BASE_CREATE, rescueId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    await expect(
      createPet(mocks.deps, STAFF, { ...BASE_CREATE, type: PetsV1.PetType.PET_TYPE_UNSPECIFIED })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('PERMISSION_DENIED when staff is scoped to a different rescue', async () => {
    await expect(createPet(mocks.deps, OTHER_STAFF, BASE_CREATE)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('inserts inside a transaction and publishes pets.created AFTER commit', async () => {
    const order: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      order.push(sql.trim().split(/\s+/)[0]);
      return { rows: [petRow()] };
    });
    mocks.natsMock.publish.mockImplementation(() => order.push('NATS_PUBLISH'));

    const res = await createPet(mocks.deps, STAFF, BASE_CREATE);
    expect(res.pet.name).toBe('Rex');
    expect(res.pet.status).toBe(PetsV1.PetStatus.PET_STATUS_AVAILABLE);
    expect(order).toEqual(['BEGIN', 'INSERT', 'COMMIT', 'NATS_PUBLISH']);
  });

  it('super_admin can create for any rescue', async () => {
    mocks.clientMock.query.mockResolvedValue({ rows: [petRow()] });
    const res = await createPet(mocks.deps, SUPER_ADMIN, BASE_CREATE);
    expect(res.pet.petId).toBe('pet-1');
  });
});

// --- getPet ----------------------------------------------------------

describe('getPet', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns the pet for any pets.read holder (adopter browse)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow()] });
    const res = await getPet(mocks.deps, ADOPTER, { petId: 'pet-1' });
    expect(res.pet.name).toBe('Rex');
    // temperament + extra surfaced as JSON strings
    expect(JSON.parse(res.pet.temperamentJson)).toEqual(['friendly']);
    expect(JSON.parse(res.pet.extraJson)).toMatchObject({ goodWithChildren: true });
  });

  it('NOT_FOUND when missing/soft-deleted', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(getPet(mocks.deps, ADOPTER, { petId: 'ghost' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

// --- listPets --------------------------------------------------------

describe('listPets', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns a page + next_cursor when more rows exist', async () => {
    const rows = Array.from({ length: 3 }, (_, i) =>
      petRow({ pet_id: `pet-${i}`, created_at: new Date(2026, 5, 3 - i) })
    );
    mocks.poolMock.query.mockResolvedValueOnce({ rows });
    const res = await listPets(mocks.deps, ADOPTER, { limit: 2, cursor: undefined } as never);
    expect(res.pets).toHaveLength(2);
    expect(res.nextCursor).toBeDefined();
  });

  it('rejects limit over the max', async () => {
    await expect(listPets(mocks.deps, ADOPTER, { limit: 101 } as never)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('rejects a negative limit (would otherwise emit a negative SQL LIMIT)', async () => {
    await expect(listPets(mocks.deps, ADOPTER, { limit: -1 } as never)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('applies status + rescue filters to the query', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await listPets(mocks.deps, STAFF, {
      limit: 0,
      statusFilter: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
      rescueIdFilter: RESCUE_ID,
    } as never);
    const sql = mocks.poolMock.query.mock.calls[0][0] as string;
    const params = mocks.poolMock.query.mock.calls[0][1] as unknown[];
    expect(sql).toMatch(/status = \$1/);
    expect(sql).toMatch(/rescue_id = \$2/);
    expect(params).toContain('available');
    expect(params).toContain(RESCUE_ID);
  });
});

// --- updatePet -------------------------------------------------------

describe('updatePet', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('NOT_FOUND when the pet is gone', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      updatePet(mocks.deps, STAFF, { petId: 'ghost', name: 'x' } as never)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('PERMISSION_DENIED for staff at a different rescue', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow()] });
    await expect(
      updatePet(mocks.deps, OTHER_STAFF, { petId: 'pet-1', name: 'x' } as never)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('PERMISSION_DENIED for a no-rescue (orphan) pet unless super_admin', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow({ rescue_id: null })] });
    // Staff with pets.update but the pet has no rescue scope — must NOT
    // fall through to an unscoped permission pass.
    await expect(
      updatePet(mocks.deps, STAFF, { petId: 'pet-1', name: 'x' } as never)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('lets super_admin update a no-rescue (orphan) pet', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow({ rescue_id: null })] });
    mocks.clientMock.query.mockResolvedValue({ rows: [petRow({ rescue_id: null, name: 'x' })] });
    const res = await updatePet(mocks.deps, SUPER_ADMIN, { petId: 'pet-1', name: 'x' } as never);
    expect(res.pet.name).toBe('x');
  });

  it('no-ops (returns current row, no write) when no fields supplied', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow()] });
    const res = await updatePet(mocks.deps, STAFF, { petId: 'pet-1' } as never);
    expect(res.pet.name).toBe('Rex');
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('writes only the supplied fields + publishes pets.updated after commit', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow()] });
    const order: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      order.push(sql.trim().split(/\s+/)[0]);
      return { rows: [petRow({ name: 'Rexy' })] };
    });
    mocks.natsMock.publish.mockImplementation(() => order.push('NATS_PUBLISH'));

    const res = await updatePet(mocks.deps, STAFF, { petId: 'pet-1', name: 'Rexy' } as never);
    expect(res.pet.name).toBe('Rexy');
    expect(order).toEqual(['BEGIN', 'UPDATE', 'COMMIT', 'NATS_PUBLISH']);
    // calls[0] is the transaction's own BEGIN; the UPDATE is calls[1].
    const updateSql = mocks.clientMock.query.mock.calls[1][0] as string;
    expect(updateSql).toMatch(/name = \$1/);
    expect(updateSql).toMatch(/version = version \+ 1/);
  });

  it('publishes pets.updated with a deterministic id keyed on the new version', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow({ version: 4 })] });
    mocks.clientMock.query.mockResolvedValue({ rows: [petRow({ name: 'Rexy', version: 5 })] });

    await updatePet(mocks.deps, STAFF, { petId: 'pet-1', name: 'Rexy' } as never);

    const event = mocks.natsMock.publish.mock.calls[0][0] as string;
    // JetStream Nats-Msg-Id derives from the event id — it must be
    // deterministic (aggregateId:version) so a retried publish dedups.
    expect(event).toBe('pets.updated');
    // The DomainEvent.id is passed via the publish options (3rd arg).
    const opts = mocks.natsMock.publish.mock.calls[0][2] as { msgID?: string } | undefined;
    expect(opts?.msgID).toBe('pets.updated.pet-1.5');
  });
});

// --- updatePetStatus -------------------------------------------------

describe('updatePetStatus', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('INVALID_ARGUMENT on missing pet_id or UNSPECIFIED to_status', async () => {
    await expect(
      updatePetStatus(mocks.deps, STAFF, {
        petId: '',
        toStatus: PetsV1.PetStatus.PET_STATUS_PENDING,
      } as never)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow()] });
    await expect(
      updatePetStatus(mocks.deps, STAFF, {
        petId: 'pet-1',
        toStatus: PetsV1.PetStatus.PET_STATUS_UNSPECIFIED,
      } as never)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects an illegal transition (available → adopted)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow({ status: 'available' })] });
    await expect(
      updatePetStatus(mocks.deps, STAFF, {
        petId: 'pet-1',
        toStatus: PetsV1.PetStatus.PET_STATUS_ADOPTED,
      } as never)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('appends the transition row + updates status + publishes pets.statusChanged after commit', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow({ status: 'available' })] });
    const order: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      order.push(sql.trim().split(/\s+/)[0]);
      // The in-transaction lock read still sees `available`; the UPDATE
      // returns the post-write `pending` row.
      if (/FOR UPDATE/.test(sql)) {
        return { rows: [petRow({ status: 'available' })] };
      }
      return { rows: [petRow({ status: 'pending' })] };
    });
    mocks.natsMock.publish.mockImplementation(() => order.push('NATS_PUBLISH'));

    const res = await updatePetStatus(mocks.deps, STAFF, {
      petId: 'pet-1',
      toStatus: PetsV1.PetStatus.PET_STATUS_PENDING,
      reason: 'application opened',
    } as never);

    expect(res.pet.status).toBe(PetsV1.PetStatus.PET_STATUS_PENDING);
    expect(res.transition.fromStatus).toBe(PetsV1.PetStatus.PET_STATUS_AVAILABLE);
    expect(res.transition.toStatus).toBe(PetsV1.PetStatus.PET_STATUS_PENDING);
    // BEGIN → SELECT … FOR UPDATE (lock + re-validate) → INSERT transition →
    // UPDATE pet → COMMIT → publish
    expect(order).toEqual(['BEGIN', 'SELECT', 'INSERT', 'UPDATE', 'COMMIT', 'NATS_PUBLISH']);
  });

  it('PERMISSION_DENIED for staff at a different rescue', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow()] });
    await expect(
      updatePetStatus(mocks.deps, OTHER_STAFF, {
        petId: 'pet-1',
        toStatus: PetsV1.PetStatus.PET_STATUS_PENDING,
      } as never)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('locks the pet row FOR UPDATE inside the transaction before transitioning', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow({ status: 'available' })] });
    const sqls: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      sqls.push(sql);
      // The in-transaction lock read returns the current (still available) row.
      if (/FOR UPDATE/.test(sql)) {
        return { rows: [petRow({ status: 'available' })] };
      }
      return { rows: [petRow({ status: 'pending' })] };
    });

    await updatePetStatus(mocks.deps, STAFF, {
      petId: 'pet-1',
      toStatus: PetsV1.PetStatus.PET_STATUS_PENDING,
    } as never);

    // A SELECT ... FOR UPDATE must run inside the txn (after BEGIN) so two
    // concurrent transitions serialise on the row lock rather than both
    // validating against a stale pre-transaction read.
    expect(sqls.some(s => /SELECT[\s\S]*FOR UPDATE/.test(s))).toBe(true);
  });

  it('re-validates the transition against the locked row (loses a concurrent race)', async () => {
    // Pre-transaction read sees `available` → pending looks legal.
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow({ status: 'available' })] });
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      // But by the time we lock the row, a concurrent commit moved it to
      // `adopted` — available is no longer reachable, so pending is illegal.
      if (/FOR UPDATE/.test(sql)) {
        return { rows: [petRow({ status: 'adopted' })] };
      }
      return { rows: [petRow()] };
    });

    await expect(
      updatePetStatus(mocks.deps, STAFF, {
        petId: 'pet-1',
        toStatus: PetsV1.PetStatus.PET_STATUS_PENDING,
      } as never)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});

// --- deletePet -------------------------------------------------------

describe('deletePet', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('soft-deletes + publishes pets.deleted after commit', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow()] });
    const order: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      order.push(sql.trim().split(/\s+/)[0]);
      return { rows: [] };
    });
    mocks.natsMock.publish.mockImplementation(() => order.push('NATS_PUBLISH'));

    const res = await deletePet(mocks.deps, STAFF, { petId: 'pet-1' });
    expect(res.deleted).toBe(true);
    expect(order).toEqual(['BEGIN', 'UPDATE', 'COMMIT', 'NATS_PUBLISH']);
    // calls[0] is the transaction's own BEGIN; the UPDATE is calls[1].
    const sql = mocks.clientMock.query.mock.calls[1][0] as string;
    expect(sql).toMatch(/deleted_at = now\(\)/);
  });

  it('PERMISSION_DENIED for staff at a different rescue', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow()] });
    await expect(deletePet(mocks.deps, OTHER_STAFF, { petId: 'pet-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('PERMISSION_DENIED for a no-rescue (orphan) pet unless super_admin', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow({ rescue_id: null })] });
    await expect(deletePet(mocks.deps, STAFF, { petId: 'pet-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('lets super_admin soft-delete a no-rescue (orphan) pet', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow({ rescue_id: null })] });
    mocks.clientMock.query.mockResolvedValue({ rows: [] });
    const res = await deletePet(mocks.deps, SUPER_ADMIN, { petId: 'pet-1' });
    expect(res.deleted).toBe(true);
  });
});

// --- getPetStats ----------------------------------------------------

describe('getPetStats', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects principals without pets.read', async () => {
    const noPermsAdopter: Principal = {
      userId: 'usr-noperms' as UserId,
      roles: ['adopter'],
      permissions: [],
    };
    await expect(getPetStats(mocks.deps, noPermsAdopter, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns 0 counts when no rows in scope', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // status counts
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // monthly
      .mockResolvedValueOnce({ rows: [{ avg_days: null }] }); // avg days

    const res = await getPetStats(mocks.deps, STAFF, {});
    expect(res).toEqual({
      total: 0,
      available: 0,
      pending: 0,
      adopted: 0,
      foster: 0,
      medicalHold: 0,
      behavioralHold: 0,
      notAvailable: 0,
      deceased: 0,
      monthlyAdoptions: 0,
      averageDaysToAdoption: 0,
    });
  });

  it('aggregates per-status counts + monthly + avg', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({
        rows: [
          { status: 'available', count: '10' },
          { status: 'pending', count: '3' },
          { status: 'adopted', count: '7' },
          { status: 'medical_hold', count: '2' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: '4' }] })
      .mockResolvedValueOnce({ rows: [{ avg_days: '12.7' }] });

    const res = await getPetStats(mocks.deps, STAFF, {});
    expect(res.total).toBe(22);
    expect(res.available).toBe(10);
    expect(res.pending).toBe(3);
    expect(res.adopted).toBe(7);
    expect(res.medicalHold).toBe(2);
    expect(res.behavioralHold).toBe(0);
    expect(res.monthlyAdoptions).toBe(4);
    expect(res.averageDaysToAdoption).toBe(13); // rounded from 12.7
  });

  it('pins rescue staff to their own rescue, ignoring rescue_id_filter', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ avg_days: null }] });

    await getPetStats(mocks.deps, STAFF, { rescueIdFilter: 'rsc-other' });

    const statusCall = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(statusCall[1]).toEqual([RESCUE_ID]); // not 'rsc-other'
  });

  it('lets pets.read:any admin pass a rescue_id_filter', async () => {
    const adminAny: Principal = {
      userId: 'svc-admin' as UserId,
      roles: ['admin'],
      permissions: ['pets.read' as Permission, 'pets.read:any' as Permission],
    };
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ avg_days: null }] });

    await getPetStats(mocks.deps, adminAny, { rescueIdFilter: 'rsc-target' });
    const statusCall = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(statusCall[1]).toEqual(['rsc-target']);
  });

  it('platform-wide stats when admin omits rescue_id_filter', async () => {
    const adminAny: Principal = {
      userId: 'svc-admin' as UserId,
      roles: ['admin'],
      permissions: ['pets.read' as Permission, 'pets.read:any' as Permission],
    };
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ avg_days: null }] });

    await getPetStats(mocks.deps, adminAny, {});
    const statusCall = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(statusCall[1]).toEqual([]); // no rescue scope
  });

  it('rejects when caller has pets.read but no rescue scope and no :any', async () => {
    await expect(getPetStats(mocks.deps, ADOPTER, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});

// --- listFavoriters --------------------------------------------------

describe('listFavoriters', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns the user_ids of every active favouriter for the pet', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ user_id: 'usr-1' }, { user_id: 'usr-2' }],
    });
    const res = await listFavoriters(mocks.deps, ADOPTER, { petId: 'pet-1' });
    expect(res.userIds).toEqual(['usr-1', 'usr-2']);

    const [sql, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    // Schema-qualified + filters out soft-deleted favourite rows.
    expect(sql).toMatch(/pets\.user_favorites/);
    expect(sql).toMatch(/pet_id = \$1/);
    expect(sql).toMatch(/deleted_at IS NULL/);
    expect(params).toEqual(['pet-1']);
  });

  it('returns an empty list when the pet has no favouriters', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    const res = await listFavoriters(mocks.deps, ADOPTER, { petId: 'pet-1' });
    expect(res.userIds).toEqual([]);
  });

  it('INVALID_ARGUMENT when pet_id is missing', async () => {
    await expect(listFavoriters(mocks.deps, ADOPTER, { petId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('PERMISSION_DENIED for a principal without pets.read', async () => {
    const noPerms: Principal = {
      userId: 'usr-noperms' as UserId,
      roles: ['adopter'],
      permissions: [],
    };
    await expect(listFavoriters(mocks.deps, noPerms, { petId: 'pet-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});

describe('HandlerError', () => {
  it('carries the code', () => {
    expect(new HandlerError('NOT_FOUND', 'x').code).toBe('NOT_FOUND');
  });
});
