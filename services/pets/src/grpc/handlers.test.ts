import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';
import { PetsV1, type CreatePetRequest } from '@adopt-dont-shop/proto';

import {
  createPet,
  deletePet,
  getAdoptionsByType,
  getAdoptionTrend,
  getPet,
  getPetStats,
  getTopBreedsByAdoptions,
  getTopRescuesByAdoptions,
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

// The notifications service's signed system principal (see
// services/notifications/src/grpc/pets-client.ts) — the only caller
// meant to reach listFavoriters (ADS-922). Not a super_admin or plain
// admin grant: pets.favoriters.list:any is held by this principal alone.
const SERVICE_NOTIFICATIONS: Principal = {
  userId: 'svc-notifications' as UserId,
  roles: ['admin'],
  permissions: ['pets.favoriters.list:any' as Permission],
};

const SUPER_ADMIN: Principal = {
  userId: 'usr-super' as UserId,
  roles: ['super_admin'],
  permissions: [],
};

// Platform admin (admin console) — not rescue-bound, but holds the
// cross-rescue write grant the bulk Pets surface goes through.
const PLATFORM_ADMIN: Principal = {
  userId: 'usr-platform-admin' as UserId,
  roles: ['admin'],
  permissions: ['pets.manage:any' as Permission],
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

  it('strips internal notes for a non-staff reader', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [petRow({ medical_notes: 'allergic to chicken', behavioral_notes: 'shy' })],
    });
    const res = await getPet(mocks.deps, ADOPTER, { petId: 'pet-1' });
    const extra = JSON.parse(res.pet.extraJson) as Record<string, unknown>;
    expect(extra.medicalNotes).toBeUndefined();
    expect(extra.behavioralNotes).toBeUndefined();
  });

  it('keeps internal notes for rescue staff of the pet rescue', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [petRow({ medical_notes: 'allergic to chicken', behavioral_notes: 'shy' })],
    });
    const res = await getPet(mocks.deps, STAFF, { petId: 'pet-1' });
    const extra = JSON.parse(res.pet.extraJson) as Record<string, unknown>;
    expect(extra.medicalNotes).toBe('allergic to chicken');
    expect(extra.behavioralNotes).toBe('shy');
  });

  it('NOT_FOUND for a non-staff reader on a terminal-status pet', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow({ status: 'adopted' })] });
    await expect(getPet(mocks.deps, ADOPTER, { petId: 'pet-1' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('NOT_FOUND for a non-staff reader on an archived pet', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow({ archived: true })] });
    await expect(getPet(mocks.deps, ADOPTER, { petId: 'pet-1' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('lets rescue staff of the pet rescue view a terminal-status pet', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow({ status: 'adopted' })] });
    const res = await getPet(mocks.deps, STAFF, { petId: 'pet-1' });
    expect(res.pet.status).toBe(PetsV1.PetStatus.PET_STATUS_ADOPTED);
  });

  it('hides another rescue staff’s terminal pet (treats them as non-privileged)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow({ status: 'adopted' })] });
    // OTHER_STAFF is scoped to rsc-2; the pet belongs to rsc-1.
    await expect(getPet(mocks.deps, OTHER_STAFF, { petId: 'pet-1' })).rejects.toMatchObject({
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

  it('pins rescue staff to their own rescue, ignoring a foreign rescueIdFilter', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    // STAFF is scoped to rsc-1 but asks for rsc-2's pets.
    await listPets(mocks.deps, STAFF, { limit: 0, rescueIdFilter: 'rsc-2' } as never);
    const sql = mocks.poolMock.query.mock.calls[0][0] as string;
    const params = mocks.poolMock.query.mock.calls[0][1] as unknown[];
    expect(sql).toMatch(/rescue_id = \$1/);
    // Scoped to their own rescue — the foreign filter is not honoured.
    expect(params).toContain(RESCUE_ID);
    expect(params).not.toContain('rsc-2');
  });

  it('scopes rescue staff to their own rescue even with no filter', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await listPets(mocks.deps, STAFF, { limit: 0 } as never);
    const sql = mocks.poolMock.query.mock.calls[0][0] as string;
    const params = mocks.poolMock.query.mock.calls[0][1] as unknown[];
    expect(sql).toMatch(/rescue_id = \$1/);
    expect(params).toContain(RESCUE_ID);
  });

  it('lets a pets.read:any admin target any rescue', async () => {
    const adminAny: Principal = {
      userId: 'usr-admin' as UserId,
      roles: ['admin'],
      permissions: ['pets.read' as Permission, 'pets.read:any' as Permission],
      rescueId: RESCUE_ID as RescueId,
    };
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await listPets(mocks.deps, adminAny, { limit: 0, rescueIdFilter: 'rsc-2' } as never);
    const params = mocks.poolMock.query.mock.calls[0][1] as unknown[];
    expect(params).toContain('rsc-2');
  });

  it('lets an adopter browse the catalogue across rescues (no rescue filter)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await listPets(mocks.deps, ADOPTER, { limit: 0 } as never);
    const sql = mocks.poolMock.query.mock.calls[0][0] as string;
    // No rescue_id predicate is forced on a public browse.
    expect(sql).not.toMatch(/rescue_id =/);
  });

  it('hides terminal + archived pets from a public browse', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await listPets(mocks.deps, ADOPTER, { limit: 0 } as never);
    const sql = mocks.poolMock.query.mock.calls[0][0] as string;
    const params = mocks.poolMock.query.mock.calls[0][1] as unknown[];
    expect(sql).toMatch(/status NOT IN/);
    expect(sql).toMatch(/archived = false/);
    expect(params).toEqual(expect.arrayContaining(['adopted', 'deceased', 'not_available']));
  });

  it('does not hide statuses from rescue staff (own-rescue view)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await listPets(mocks.deps, STAFF, { limit: 0 } as never);
    const sql = mocks.poolMock.query.mock.calls[0][0] as string;
    expect(sql).not.toMatch(/status NOT IN/);
    expect(sql).not.toMatch(/archived = false/);
  });

  it('strips internal notes from public browse results', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [petRow({ medical_notes: 'sensitive', behavioral_notes: 'sensitive' })],
    });
    const res = await listPets(mocks.deps, ADOPTER, { limit: 2 } as never);
    const extra = JSON.parse(res.pets[0].extraJson) as Record<string, unknown>;
    expect(extra.medicalNotes).toBeUndefined();
    expect(extra.behavioralNotes).toBeUndefined();
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

  it('lets a platform admin (pets.manage:any) update a pet at any rescue + write archived', async () => {
    // Pet belongs to RESCUE_ID; the admin is bound to no rescue but holds
    // pets.manage:any, so the rescue-scope check is bypassed.
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow()] });
    let updateSql = '';
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      if (sql.trim().startsWith('UPDATE')) {
        updateSql = sql;
      }
      return { rows: [petRow({ archived: true })] };
    });

    const res = await updatePet(mocks.deps, PLATFORM_ADMIN, {
      petId: 'pet-1',
      archived: true,
    } as never);

    expect(res.pet.archived).toBe(true);
    expect(updateSql).toMatch(/archived = \$1/);
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

  it('lets a platform admin (pets.manage:any) delete a pet at any rescue', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow()] });
    mocks.clientMock.query.mockResolvedValue({ rows: [] });
    const res = await deletePet(mocks.deps, PLATFORM_ADMIN, { petId: 'pet-1' });
    expect(res.deleted).toBe(true);
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

// --- getAdoptionTrend --------------------------------------------------

describe('getAdoptionTrend', () => {
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
    await expect(getAdoptionTrend(mocks.deps, noPermsAdopter, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects when caller has pets.read but no rescue scope and no :any', async () => {
    await expect(getAdoptionTrend(mocks.deps, ADOPTER, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects an invalid group_by value', async () => {
    await expect(
      getAdoptionTrend(mocks.deps, STAFF, { groupBy: 'fortnight' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('pins rescue staff to their own rescue and returns bucketed points', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        { date: new Date('2026-06-01T00:00:00Z'), count: '3' },
        { date: new Date('2026-06-02T00:00:00Z'), count: '5' },
      ],
    });

    const res = await getAdoptionTrend(mocks.deps, STAFF, {});

    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[1]).toContain(RESCUE_ID);
    expect(res.points).toEqual([
      { date: '2026-06-01', count: 3 },
      { date: '2026-06-02', count: 5 },
    ]);
  });

  it('defaults group_by to day', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await getAdoptionTrend(mocks.deps, STAFF, {});
    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[0]).toContain(`date_trunc('day', adopted_date)`);
  });

  it('applies a month bucket when requested', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await getAdoptionTrend(mocks.deps, STAFF, { groupBy: 'month' });
    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[0]).toContain(`date_trunc('month', adopted_date)`);
  });

  it('lets pets.read:any admin pass rescue_id_filter or omit for platform-wide', async () => {
    const adminAny: Principal = {
      userId: 'svc-admin' as UserId,
      roles: ['admin'],
      permissions: ['pets.read' as Permission, 'pets.read:any' as Permission],
    };
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await getAdoptionTrend(mocks.deps, adminAny, { rescueIdFilter: 'rsc-target' });
    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[1]).toContain('rsc-target');
  });

  it('applies start_date / end_date bounds when supplied', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await getAdoptionTrend(mocks.deps, STAFF, {
      startDate: '2026-01-01',
      endDate: '2026-06-01',
    });
    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[1]).toContain('2026-01-01');
    expect(call[1]).toContain('2026-06-01');
  });
});

// --- getAdoptionsByType --------------------------------------------------

describe('getAdoptionsByType', () => {
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
    await expect(getAdoptionsByType(mocks.deps, noPermsAdopter, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects when caller has pets.read but no rescue scope and no :any', async () => {
    await expect(getAdoptionsByType(mocks.deps, ADOPTER, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('pins rescue staff to their own rescue and maps db types to proto enum', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        { type: 'dog', count: '4' },
        { type: 'cat', count: '2' },
      ],
    });

    const res = await getAdoptionsByType(mocks.deps, STAFF, {});

    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[1]).toContain(RESCUE_ID);
    expect(res.counts).toEqual([
      { type: PetsV1.PetType.PET_TYPE_DOG, count: 4 },
      { type: PetsV1.PetType.PET_TYPE_CAT, count: 2 },
    ]);
  });

  it('lets pets.read:any admin omit rescue scope for platform-wide counts', async () => {
    const adminAny: Principal = {
      userId: 'svc-admin' as UserId,
      roles: ['admin'],
      permissions: ['pets.read' as Permission, 'pets.read:any' as Permission],
    };
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await getAdoptionsByType(mocks.deps, adminAny, {});
    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[1]).toEqual([]);
  });
});

// --- getTopRescuesByAdoptions --------------------------------------------

describe('getTopRescuesByAdoptions', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('requires pets.read:any — rescue staff with plain pets.read is rejected', async () => {
    await expect(getTopRescuesByAdoptions(mocks.deps, STAFF, { limit: 0 })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  const ADMIN_ANY: Principal = {
    userId: 'svc-admin' as UserId,
    roles: ['admin'],
    permissions: ['pets.read' as Permission, 'pets.read:any' as Permission],
  };

  it('defaults limit to 10', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await getTopRescuesByAdoptions(mocks.deps, ADMIN_ANY, { limit: 0 });
    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[1]).toContain(10);
  });

  it('rejects a limit above 50', async () => {
    await expect(
      getTopRescuesByAdoptions(mocks.deps, ADMIN_ANY, { limit: 51 })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('returns rescues ranked by adoption count', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        { rescue_id: 'rsc-1', adoptions: '12' },
        { rescue_id: 'rsc-2', adoptions: '9' },
      ],
    });
    const res = await getTopRescuesByAdoptions(mocks.deps, ADMIN_ANY, { limit: 5 });
    expect(res.rescues).toEqual([
      { rescueId: 'rsc-1', adoptions: 12 },
      { rescueId: 'rsc-2', adoptions: 9 },
    ]);
  });

  it('applies start_date / end_date bounds when supplied', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await getTopRescuesByAdoptions(mocks.deps, ADMIN_ANY, {
      limit: 10,
      startDate: '2026-01-01',
      endDate: '2026-06-01',
    });
    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[1]).toContain('2026-01-01');
    expect(call[1]).toContain('2026-06-01');
  });
});

// --- getTopBreedsByAdoptions ---------------------------------------------

describe('getTopBreedsByAdoptions', () => {
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
    await expect(
      getTopBreedsByAdoptions(mocks.deps, noPermsAdopter, { limit: 0 })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects when caller has pets.read but no rescue scope and no :any', async () => {
    await expect(getTopBreedsByAdoptions(mocks.deps, ADOPTER, { limit: 0 })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects a limit above 50', async () => {
    await expect(getTopBreedsByAdoptions(mocks.deps, STAFF, { limit: 51 })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('defaults limit to 10 and pins rescue staff to their own rescue', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await getTopBreedsByAdoptions(mocks.deps, STAFF, { limit: 0 });
    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[1]).toContain(RESCUE_ID);
    expect(call[1]).toContain(10);
  });

  it('lets pets.read:any admin omit rescue scope for platform-wide counts', async () => {
    const adminAny: Principal = {
      userId: 'svc-admin' as UserId,
      roles: ['admin'],
      permissions: ['pets.read' as Permission, 'pets.read:any' as Permission],
    };
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await getTopBreedsByAdoptions(mocks.deps, adminAny, { limit: 0 });
    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[1]).not.toContain(RESCUE_ID);
  });

  it('returns breeds ranked by adoption count with average adoption days', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        { breed: 'Labrador', count: '7', avg_days: '12.5' },
        { breed: 'Beagle', count: '3', avg_days: null },
      ],
    });
    const res = await getTopBreedsByAdoptions(mocks.deps, STAFF, { limit: 5 });
    expect(res.breeds).toEqual([
      { breed: 'Labrador', count: 7, averageAdoptionDays: 13 },
      { breed: 'Beagle', count: 3, averageAdoptionDays: 0 },
    ]);
  });

  it('applies start_date / end_date bounds when supplied', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await getTopBreedsByAdoptions(mocks.deps, STAFF, {
      limit: 10,
      startDate: '2026-01-01',
      endDate: '2026-06-01',
    });
    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[1]).toContain('2026-01-01');
    expect(call[1]).toContain('2026-06-01');
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
    const res = await listFavoriters(mocks.deps, SERVICE_NOTIFICATIONS, { petId: 'pet-1' });
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
    const res = await listFavoriters(mocks.deps, SERVICE_NOTIFICATIONS, { petId: 'pet-1' });
    expect(res.userIds).toEqual([]);
  });

  it('INVALID_ARGUMENT when pet_id is missing', async () => {
    await expect(
      listFavoriters(mocks.deps, SERVICE_NOTIFICATIONS, { petId: '' })
    ).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('PERMISSION_DENIED for a principal without pets.favoriters.list:any', async () => {
    const noPerms: Principal = {
      userId: 'usr-noperms' as UserId,
      roles: ['adopter'],
      permissions: [],
    };
    await expect(listFavoriters(mocks.deps, noPerms, { petId: 'pet-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  // ADS-922 regression: an ordinary adopter holds plain pets.read (every
  // adopter does — see the ADOPTER fixture) but must NOT be able to
  // enumerate who else favourited a pet.
  it('PERMISSION_DENIED for an adopter with only pets.read', async () => {
    await expect(listFavoriters(mocks.deps, ADOPTER, { petId: 'pet-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });
});

describe('HandlerError', () => {
  it('carries the code', () => {
    expect(new HandlerError('NOT_FOUND', 'x').code).toBe('NOT_FOUND');
  });
});
