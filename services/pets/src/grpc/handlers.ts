// gRPC handler implementations for PetService.{Create, Get, List,
// Update, UpdateStatus, Delete}. Plain async functions over
// (deps, principal, request); the adapter (Phase 3.3c) wraps them in
// `(call, callback)` and maps HandlerError → grpc.status. Same
// pure-handler-plus-thin-adapter shape as service.auth /
// service.notifications.
//
// Discipline:
//   - State-changing handlers run their DB write + NATS event inside
//     @adopt-dont-shop/events.withTransaction so events only fire after
//     commit (publish-after-commit).
//   - UpdateStatus is the event-sourced command: it validates the
//     transition against the pure status-machine, writes the new
//     pets.status + appends a pet_status_transitions row in ONE
//     transaction, and publishes pets.statusChanged after commit.
//   - Permission gating uses @adopt-dont-shop/authz.requirePermission
//     scoped to the pet's rescue (rescue staff can only mutate their
//     own rescue's pets; super_admin bypasses).
//   - List is the public-ish browse path — pets.read, no rescue scope
//     unless the caller filters by rescue_id.

import { randomUUID } from 'node:crypto';

import { hasPermission, requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction, type WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Permission, RescueId } from '@adopt-dont-shop/lib.types';
import {
  PetsV1,
  type CreatePetRequest,
  type CreatePetResponse,
  type DeletePetRequest,
  type DeletePetResponse,
  type GetPetRequest,
  type GetPetResponse,
  type GetPetStatsRequest,
  type GetPetStatsResponse,
  type ListPetFavoritersRequest,
  type ListPetFavoritersResponse,
  type ListPetsRequest,
  type ListPetsResponse,
  type Pet,
  type PetStatusTransition,
  type UpdatePetRequest,
  type UpdatePetResponse,
  type UpdatePetStatusRequest,
  type UpdatePetStatusResponse,
} from '@adopt-dont-shop/proto';

import {
  ageGroupFromDb,
  ageGroupToDb,
  genderFromDb,
  genderToDb,
  sizeFromDb,
  sizeToDb,
  statusFromDb,
  statusToDb,
  typeFromDb,
  typeToDb,
  type PetStatusDb,
  type PetTypeDb,
  type PetGenderDb,
  type PetSizeDb,
  type PetAgeGroupDb,
} from './enum-map.js';
import { isLegalTransition } from './status-machine.js';

export type HandlerDeps = WithTransactionDeps;

export type HandlerErrorCode =
  | 'INVALID_ARGUMENT'
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'INTERNAL';

export class HandlerError extends Error {
  constructor(
    public readonly code: HandlerErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'HandlerError';
  }
}

// --- Row shape (mirrors the columns the proto surfaces) --------------

export type PetRow = {
  pet_id: string;
  name: string;
  rescue_id: string | null;
  type: PetTypeDb;
  status: PetStatusDb;
  gender: PetGenderDb;
  size: PetSizeDb;
  age_group: PetAgeGroupDb;
  breed_id: string | null;
  secondary_breed_id: string | null;
  short_description: string | null;
  long_description: string | null;
  age_years: number | null;
  age_months: number | null;
  color: string | null;
  archived: boolean;
  featured: boolean;
  priority_listing: boolean;
  adoption_fee_minor: number | null;
  adoption_fee_currency: string | null;
  special_needs: boolean;
  house_trained: boolean;
  temperament: string[] | null;
  tags: string[] | null;
  // extra_json is assembled from the long-tail columns the SELECT pulls
  // back as a jsonb object via row_to_json minus the explicit columns —
  // but to keep the query simple we just read the columns we surface and
  // synthesise extra_json from the remaining ones we SELECT explicitly.
  good_with_children: boolean | null;
  good_with_dogs: boolean | null;
  good_with_cats: boolean | null;
  good_with_small_animals: boolean | null;
  medical_notes: string | null;
  behavioral_notes: string | null;
  view_count: number;
  favorite_count: number;
  application_count: number;
  available_since: Date | null;
  adopted_date: Date | null;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export function rowToProto(row: PetRow, includeInternalNotes = true): Pet {
  const extra = {
    color: row.color,
    goodWithChildren: row.good_with_children,
    goodWithDogs: row.good_with_dogs,
    goodWithCats: row.good_with_cats,
    goodWithSmallAnimals: row.good_with_small_animals,
    // Internal staff-only fields — omitted for public / adopter readers so
    // a rescue's medical / behavioural notes never reach the browse path.
    ...(includeInternalNotes
      ? { medicalNotes: row.medical_notes, behavioralNotes: row.behavioral_notes }
      : {}),
  };
  return {
    petId: row.pet_id,
    name: row.name,
    rescueId: row.rescue_id ?? undefined,
    type: typeFromDb(row.type),
    status: statusFromDb(row.status),
    gender: genderFromDb(row.gender),
    size: sizeFromDb(row.size),
    ageGroup: ageGroupFromDb(row.age_group),
    breedId: row.breed_id ?? undefined,
    secondaryBreedId: row.secondary_breed_id ?? undefined,
    shortDescription: row.short_description ?? undefined,
    longDescription: row.long_description ?? undefined,
    ageYears: row.age_years ?? undefined,
    ageMonths: row.age_months ?? undefined,
    color: row.color ?? undefined,
    archived: row.archived,
    featured: row.featured,
    priorityListing: row.priority_listing,
    adoptionFeeMinor: row.adoption_fee_minor ?? undefined,
    adoptionFeeCurrency: row.adoption_fee_currency ?? undefined,
    specialNeeds: row.special_needs,
    houseTrained: row.house_trained,
    temperamentJson: JSON.stringify(row.temperament ?? []),
    tagsJson: JSON.stringify(row.tags ?? []),
    extraJson: JSON.stringify(extra),
    viewCount: row.view_count,
    favoriteCount: row.favorite_count,
    applicationCount: row.application_count,
    availableSince: row.available_since?.toISOString(),
    adoptedDate: row.adopted_date?.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const PETS_SELECT = `
  pet_id, name, rescue_id, type, status, gender, size, age_group,
  breed_id, secondary_breed_id, short_description, long_description,
  age_years, age_months, color, archived, featured, priority_listing,
  adoption_fee_minor, adoption_fee_currency, special_needs, house_trained,
  temperament, tags, good_with_children, good_with_dogs, good_with_cats,
  good_with_small_animals, medical_notes, behavioral_notes,
  view_count, favorite_count, application_count, available_since,
  adopted_date, created_at, updated_at, version
`;

const PETS_CREATE: Permission = 'pets.create' as Permission;
const PETS_READ: Permission = 'pets.read' as Permission;
const PETS_UPDATE: Permission = 'pets.update' as Permission;
const PETS_DELETE: Permission = 'pets.delete' as Permission;
// Platform-wide pet mutation (admin bulk surface) — bypasses the rescue
// scope on update / status / delete, mirroring `pets.read:any` on reads.
const PETS_MANAGE_ANY: Permission = 'pets.manage:any' as Permission;

// Statuses a pet can hold that a public / adopter browse must NOT surface.
// Terminal or off-market states — archived pets are hidden separately.
const PUBLIC_HIDDEN_STATUSES = ['adopted', 'deceased', 'not_available'];

// A reader is "privileged" for a pet when they may see its internal notes
// and non-public statuses: platform admins (pets.read:any) and rescue staff
// viewing their OWN rescue's pet. Everyone else gets the public projection.
function isPrivilegedReader(principal: Principal, rescueId: string | null): boolean {
  if (hasPermission(principal, PETS_READ_ANY)) {
    return true;
  }
  return rescueId !== null && principal.rescueId === rescueId;
}

// --- Create ----------------------------------------------------------

export async function createPet(
  deps: HandlerDeps,
  principal: Principal,
  req: CreatePetRequest
): Promise<CreatePetResponse> {
  if (!req.name) {
    throw new HandlerError('INVALID_ARGUMENT', 'name is required');
  }
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  if (req.type === PetsV1.PetType.PET_TYPE_UNSPECIFIED) {
    throw new HandlerError('INVALID_ARGUMENT', 'type is required');
  }

  // pets.create scoped to the target rescue. super_admin bypasses.
  if (!requirePermission(principal, PETS_CREATE, { rescueId: req.rescueId as RescueId })) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_CREATE}' required for this rescue`);
  }

  const petId = randomUUID();
  let inserted: PetRow | undefined;

  await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<PetRow>(
      `
      INSERT INTO pets.pets (
        pet_id, name, rescue_id, type, gender, size, age_group, status,
        breed_id, secondary_breed_id, short_description, long_description,
        age_years, age_months, adoption_fee_minor, adoption_fee_currency,
        special_needs, house_trained, temperament, tags,
        view_count, favorite_count, application_count, version,
        created_at, updated_at, created_by, available_since
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'available',
        $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18::text[], $19::text[],
        0, 0, 0, 0,
        now(), now(), $20, now()
      )
      RETURNING ${PETS_SELECT}
      `,
      [
        petId,
        req.name,
        req.rescueId,
        typeToDb(req.type),
        genderToDb(req.gender),
        sizeToDb(req.size),
        ageGroupToDb(req.ageGroup),
        req.breedId ?? null,
        req.secondaryBreedId ?? null,
        req.shortDescription ?? null,
        req.longDescription ?? null,
        req.ageYears ?? null,
        req.ageMonths ?? null,
        req.adoptionFeeMinor ?? null,
        req.adoptionFeeCurrency ?? 'GBP',
        req.specialNeeds,
        req.houseTrained,
        parseJsonArray(req.temperamentJson),
        parseJsonArray(req.tagsJson),
        principal.userId,
      ]
    );
    inserted = result.rows[0];

    publish({
      type: 'pets.created',
      id: `pets.created.${petId}`,
      payload: { petId, rescueId: req.rescueId, type: typeToDb(req.type) },
    });
  });

  if (!inserted) {
    throw new HandlerError('INTERNAL', 'insert returned no rows');
  }
  return { pet: rowToProto(inserted) };
}

// --- Get -------------------------------------------------------------

export async function getPet(
  deps: HandlerDeps,
  principal: Principal,
  req: GetPetRequest
): Promise<GetPetResponse> {
  if (!req.petId) {
    throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
  }
  if (!hasPermission(principal, PETS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_READ}' required`);
  }

  const row = await fetchPet(deps, req.petId);
  if (!row) {
    throw new HandlerError('NOT_FOUND', `pet ${req.petId} not found`);
  }

  // Non-privileged readers (public / adopter, or staff of another rescue)
  // can't see a pet in a hidden status or one that's archived — treat it as
  // not found rather than leaking its existence, and strip internal notes.
  const privileged = isPrivilegedReader(principal, row.rescue_id);
  if (!privileged && (PUBLIC_HIDDEN_STATUSES.includes(row.status) || row.archived)) {
    throw new HandlerError('NOT_FOUND', `pet ${req.petId} not found`);
  }
  return { pet: rowToProto(row, privileged) };
}

// --- List ------------------------------------------------------------

type ListCursor = { createdAt: string; petId: string };

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

export async function listPets(
  deps: HandlerDeps,
  principal: Principal,
  req: ListPetsRequest
): Promise<ListPetsResponse> {
  if (!hasPermission(principal, PETS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_READ}' required`);
  }

  // Resolve rescue scope, mirroring getPetStats. Rescue-bound staff are
  // pinned to their own rescue and CANNOT read another rescue's pets by
  // passing rescueIdFilter. pets.read:any (admin) may target any rescue or
  // all. Public / adopter callers (no rescueId, no :any) browse the
  // catalogue and may optionally narrow to a single rescue.
  let rescueScope: string | undefined;
  if (!hasPermission(principal, PETS_READ_ANY) && principal.rescueId) {
    rescueScope = principal.rescueId;
  } else {
    rescueScope = req.rescueIdFilter ? req.rescueIdFilter : undefined;
  }

  // Privileged readers (admins / rescue staff, pinned above to their own
  // rescue) see every status; public / adopter browse hides terminal and
  // archived pets and never receives internal notes.
  const privileged = hasPermission(principal, PETS_READ_ANY) || principal.rescueId !== undefined;

  const limit = clampLimit(req.limit);
  const cursor = req.cursor ? parseCursor(req.cursor) : undefined;

  const where: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let n = 1;

  if (
    req.statusFilter !== undefined &&
    req.statusFilter !== PetsV1.PetStatus.PET_STATUS_UNSPECIFIED
  ) {
    where.push(`status = $${n}`);
    params.push(statusToDb(req.statusFilter));
    n++;
  }
  if (req.typeFilter !== undefined && req.typeFilter !== PetsV1.PetType.PET_TYPE_UNSPECIFIED) {
    where.push(`type = $${n}`);
    params.push(typeToDb(req.typeFilter));
    n++;
  }
  if (req.sizeFilter !== undefined && req.sizeFilter !== PetsV1.PetSize.PET_SIZE_UNSPECIFIED) {
    where.push(`size = $${n}`);
    params.push(sizeToDb(req.sizeFilter));
    n++;
  }
  if (rescueScope) {
    where.push(`rescue_id = $${n}`);
    params.push(rescueScope);
    n++;
  }
  if (!privileged) {
    const placeholders = PUBLIC_HIDDEN_STATUSES.map(() => `$${n++}`).join(', ');
    where.push(`status NOT IN (${placeholders})`);
    params.push(...PUBLIC_HIDDEN_STATUSES);
    where.push('archived = false');
  }
  if (cursor) {
    where.push(`(created_at, pet_id) < ($${n}, $${n + 1})`);
    params.push(new Date(cursor.createdAt));
    params.push(cursor.petId);
    n += 2;
  }

  const result = await deps.pool.query<PetRow>(
    `
    SELECT ${PETS_SELECT} FROM pets.pets
    WHERE ${where.join(' AND ')}
    ORDER BY created_at DESC, pet_id DESC
    LIMIT $${n}
    `,
    [...params, limit + 1]
  );

  const hasMore = result.rows.length > limit;
  const page = hasMore ? result.rows.slice(0, limit) : result.rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ createdAt: last.created_at.toISOString(), petId: last.pet_id })
      : undefined;

  return { pets: page.map(row => rowToProto(row, privileged)), nextCursor };
}

// --- Update ----------------------------------------------------------

export async function updatePet(
  deps: HandlerDeps,
  principal: Principal,
  req: UpdatePetRequest
): Promise<UpdatePetResponse> {
  if (!req.petId) {
    throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
  }

  const existing = await fetchPet(deps, req.petId);
  if (!existing) {
    throw new HandlerError('NOT_FOUND', `pet ${req.petId} not found`);
  }
  assertRescueScopedUpdate(principal, existing);

  // Build the SET clause from the supplied optional fields only.
  const sets: string[] = [];
  const params: unknown[] = [];
  let n = 1;
  const set = (col: string, val: unknown): void => {
    sets.push(`${col} = $${n}`);
    params.push(val);
    n++;
  };

  if (req.name !== undefined) {
    set('name', req.name);
  }
  if (req.shortDescription !== undefined) {
    set('short_description', req.shortDescription);
  }
  if (req.longDescription !== undefined) {
    set('long_description', req.longDescription);
  }
  if (req.gender !== undefined) {
    set('gender', genderToDb(req.gender));
  }
  if (req.size !== undefined) {
    set('size', sizeToDb(req.size));
  }
  if (req.ageGroup !== undefined) {
    set('age_group', ageGroupToDb(req.ageGroup));
  }
  if (req.breedId !== undefined) {
    set('breed_id', req.breedId);
  }
  if (req.secondaryBreedId !== undefined) {
    set('secondary_breed_id', req.secondaryBreedId);
  }
  if (req.adoptionFeeMinor !== undefined) {
    set('adoption_fee_minor', req.adoptionFeeMinor);
  }
  if (req.adoptionFeeCurrency !== undefined) {
    set('adoption_fee_currency', req.adoptionFeeCurrency);
  }
  if (req.specialNeeds !== undefined) {
    set('special_needs', req.specialNeeds);
  }
  if (req.houseTrained !== undefined) {
    set('house_trained', req.houseTrained);
  }
  if (req.featured !== undefined) {
    set('featured', req.featured);
  }
  if (req.archived !== undefined) {
    set('archived', req.archived);
  }
  if (req.priorityListing !== undefined) {
    set('priority_listing', req.priorityListing);
  }
  if (req.temperamentJson !== undefined) {
    set('temperament', parseJsonArray(req.temperamentJson));
  }
  if (req.tagsJson !== undefined) {
    set('tags', parseJsonArray(req.tagsJson));
  }

  if (sets.length === 0) {
    // Nothing to change — return the current row without a write.
    return { pet: rowToProto(existing) };
  }

  set('updated_by', principal.userId);
  sets.push('updated_at = now()');
  sets.push('version = version + 1');

  let updated: PetRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<PetRow>(
      `UPDATE pets.pets SET ${sets.join(', ')} WHERE pet_id = $${n} RETURNING ${PETS_SELECT}`,
      [...params, req.petId]
    );
    updated = result.rows[0];
    if (!updated) {
      throw new HandlerError('INTERNAL', 'update returned no rows');
    }
    // Deterministic idempotency key: aggregateId + the post-write version.
    // A retried publish for the same write dedups in JetStream (vs. a
    // Date.now() suffix, which minted a fresh id on every retry).
    publish({
      type: 'pets.updated',
      id: `pets.updated.${req.petId}.${updated.version}`,
      payload: { petId: req.petId, rescueId: existing.rescue_id },
    });
  });

  if (!updated) {
    throw new HandlerError('INTERNAL', 'update returned no rows');
  }
  return { pet: rowToProto(updated) };
}

// --- UpdateStatus (event-sourced command) ----------------------------

export async function updatePetStatus(
  deps: HandlerDeps,
  principal: Principal,
  req: UpdatePetStatusRequest
): Promise<UpdatePetStatusResponse> {
  if (!req.petId) {
    throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
  }
  if (req.toStatus === PetsV1.PetStatus.PET_STATUS_UNSPECIFIED) {
    throw new HandlerError('INVALID_ARGUMENT', 'to_status is required');
  }

  const existing = await fetchPet(deps, req.petId);
  if (!existing) {
    throw new HandlerError('NOT_FOUND', `pet ${req.petId} not found`);
  }
  assertRescueScopedUpdate(principal, existing);

  const toStatus = statusToDb(req.toStatus);

  // Fast-fail on an obviously-illegal transition before opening a
  // transaction. This read is unlocked, so the authoritative re-validation
  // happens against the locked row inside withTransaction below.
  if (!isLegalTransition(existing.status, toStatus)) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `illegal status transition ${existing.status} → ${toStatus}`
    );
  }

  const transitionId = randomUUID();
  let updated: PetRow | undefined;
  let fromStatus: PetStatusDb = existing.status;

  await withTransaction(deps, async ({ client, publish }) => {
    // 0. Lock the row and re-read the authoritative status INSIDE the
    //    transaction. The pre-transaction fetchPet read is unlocked, so two
    //    concurrent transitions could both validate against the same stale
    //    `from` status and both write. Locking + re-validating here serialises
    //    them: the loser sees the winner's committed status and is rejected.
    const locked = await client.query<{ status: PetStatusDb }>(
      `SELECT status FROM pets.pets WHERE pet_id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [req.petId]
    );
    const lockedRow = locked.rows[0];
    if (!lockedRow) {
      throw new HandlerError('NOT_FOUND', `pet ${req.petId} not found`);
    }
    fromStatus = lockedRow.status;
    if (!isLegalTransition(fromStatus, toStatus)) {
      throw new HandlerError(
        'INVALID_ARGUMENT',
        `illegal status transition ${fromStatus} → ${toStatus}`
      );
    }

    // 1. Append the transition row (the event log).
    await client.query(
      `
      INSERT INTO pets.pet_status_transitions (
        transition_id, pet_id, from_status, to_status,
        transitioned_at, transitioned_by, reason
      )
      VALUES ($1, $2, $3, $4, now(), $5, $6)
      `,
      [transitionId, req.petId, fromStatus, toStatus, principal.userId, req.reason ?? null]
    );

    // 2. Denormalise the new status onto the pet row. adopted_date /
    //    available_since are stamped as the lifecycle dictates.
    const result = await client.query<PetRow>(
      `
      UPDATE pets.pets
      SET status = $1,
          adopted_date = CASE WHEN $1 = 'adopted' THEN now() ELSE adopted_date END,
          available_since = CASE WHEN $1 = 'available' THEN now() ELSE available_since END,
          updated_at = now(), updated_by = $2, version = version + 1
      WHERE pet_id = $3
      RETURNING ${PETS_SELECT}
      `,
      [toStatus, principal.userId, req.petId]
    );
    updated = result.rows[0];

    publish({
      type: 'pets.statusChanged',
      id: `pets.statusChanged.${transitionId}`,
      payload: {
        petId: req.petId,
        rescueId: existing.rescue_id,
        fromStatus,
        toStatus,
        reason: req.reason ?? null,
      },
    });
  });

  if (!updated) {
    throw new HandlerError('INTERNAL', 'status update returned no rows');
  }

  const transition: PetStatusTransition = {
    transitionId,
    petId: req.petId,
    fromStatus: statusFromDb(fromStatus),
    toStatus: req.toStatus,
    transitionedAt: new Date().toISOString(),
    transitionedBy: principal.userId,
    reason: req.reason,
  };
  return { pet: rowToProto(updated), transition };
}

// --- Delete (soft) ---------------------------------------------------

export async function deletePet(
  deps: HandlerDeps,
  principal: Principal,
  req: DeletePetRequest
): Promise<DeletePetResponse> {
  if (!req.petId) {
    throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
  }

  const existing = await fetchPet(deps, req.petId);
  if (!existing) {
    throw new HandlerError('NOT_FOUND', `pet ${req.petId} not found`);
  }
  if (!isPermittedRescueMutation(principal, PETS_DELETE, existing)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_DELETE}' required for this rescue`);
  }

  await withTransaction(deps, async ({ client, publish }) => {
    await client.query(
      `UPDATE pets.pets SET deleted_at = now(), updated_at = now(), updated_by = $1 WHERE pet_id = $2`,
      [principal.userId, req.petId]
    );
    publish({
      type: 'pets.deleted',
      id: `pets.deleted.${req.petId}`,
      payload: { petId: req.petId, rescueId: existing.rescue_id },
    });
  });

  return { deleted: true };
}

// --- Helpers ---------------------------------------------------------

async function fetchPet(deps: HandlerDeps, petId: string): Promise<PetRow | undefined> {
  const result = await deps.pool.query<PetRow>(
    `SELECT ${PETS_SELECT} FROM pets.pets WHERE pet_id = $1 AND deleted_at IS NULL`,
    [petId]
  );
  return result.rows[0];
}

// A pet with no rescue_id (legacy/orphan) can only be mutated by
// super_admin — requirePermission with an undefined scope rescueId
// degrades to a plain permission check, which would wrongly let any
// pets.update holder through, so we gate the no-rescue case explicitly.
function assertRescueScopedUpdate(principal: Principal, row: PetRow): void {
  if (!isPermittedRescueMutation(principal, PETS_UPDATE, row)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_UPDATE}' required for this rescue`);
  }
}

// Gate a mutation on a pet's rescue scope. Orphan pets (no rescue_id)
// have no scope to check against, so requirePermission would let any
// holder of the permission through — we restrict those to super_admin.
function isPermittedRescueMutation(
  principal: Principal,
  permission: Permission,
  row: PetRow
): boolean {
  // Platform admins (pets.manage:any) mutate pets across every rescue —
  // the write-side counterpart of pets.read:any. super_admin still bypasses
  // everything below.
  if (hasPermission(principal, PETS_MANAGE_ANY)) {
    return true;
  }
  if (!row.rescue_id) {
    return principal.roles.includes('super_admin');
  }
  return requirePermission(principal, permission, { rescueId: row.rescue_id as RescueId });
}

function clampLimit(requested: number): number {
  if (requested === 0) {
    return DEFAULT_LIST_LIMIT;
  }
  if (requested < 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'limit must be >= 0');
  }
  if (requested > MAX_LIST_LIMIT) {
    throw new HandlerError('INVALID_ARGUMENT', `limit must be <= ${MAX_LIST_LIMIT}`);
  }
  return requested;
}

function parseCursor(raw: string): ListCursor {
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as ListCursor;
    if (!parsed.createdAt || !parsed.petId) {
      throw new Error('missing fields');
    }
    return parsed;
  } catch {
    throw new HandlerError('INVALID_ARGUMENT', 'cursor is malformed');
  }
}

function encodeCursor(cursor: ListCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64');
}

// Parse a JSON-stringified string[] into a real array for the text[]
// bind param. Empty / malformed input degrades to an empty array — the
// caller's INVALID_ARGUMENT surface is reserved for required fields.
function parseJsonArray(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

// --- GetStats --------------------------------------------------------

const PETS_READ_ANY: Permission = 'pets.read:any' as Permission;

type StatusCountRow = { status: PetStatusDb; count: string };

export async function getPetStats(
  deps: HandlerDeps,
  principal: Principal,
  req: GetPetStatsRequest
): Promise<GetPetStatsResponse> {
  if (!hasPermission(principal, PETS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_READ}' required`);
  }

  // Resolve rescue scope. Rescue staff are pinned to their own
  // rescue regardless of req.rescueIdFilter. Admins / super_admin
  // (via pets.read:any) may pass a target rescue_id, or empty for
  // platform-wide stats.
  let rescueScope: string | null;
  if (hasPermission(principal, PETS_READ_ANY)) {
    rescueScope = req.rescueIdFilter ? req.rescueIdFilter : null;
  } else if (principal.rescueId) {
    rescueScope = principal.rescueId;
  } else {
    throw new HandlerError(
      'PERMISSION_DENIED',
      'rescue scope required — caller is not bound to a rescue and lacks pets.read:any'
    );
  }

  // Build a single WHERE clause shared by all three queries below so
  // pagination / status counts / monthly counts all agree on scope.
  const where: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  if (rescueScope) {
    where.push(`rescue_id = $${params.length + 1}`);
    params.push(rescueScope);
  }
  const whereClause = where.join(' AND ');

  // Per-status counts in one round trip via GROUP BY.
  const statusRes = await deps.pool.query<StatusCountRow>(
    `SELECT status, COUNT(*)::text AS count
     FROM pets.pets
     WHERE ${whereClause}
     GROUP BY status`,
    params
  );

  const counts = {
    available: 0,
    pending: 0,
    adopted: 0,
    foster: 0,
    medical_hold: 0,
    behavioral_hold: 0,
    not_available: 0,
    deceased: 0,
  };
  for (const row of statusRes.rows) {
    if (row.status in counts) {
      counts[row.status] = Number.parseInt(row.count, 10);
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // Last-30-day adoptions (uses adopted_date so a backfilled status
  // transition reflects the actual adoption date, not row mtime).
  const monthlyRes = await deps.pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM pets.pets
     WHERE ${whereClause}
       AND status = 'adopted'
       AND adopted_date IS NOT NULL
       AND adopted_date >= now() - interval '30 days'`,
    params
  );
  const monthlyAdoptions = Number.parseInt(monthlyRes.rows[0]?.count ?? '0', 10);

  // Average days-to-adoption across the 50 most recent adoptions in
  // scope. Postgres calculates the difference for us; we drop the
  // sub-day fraction because the dashboard widget renders whole days.
  const avgRes = await deps.pool.query<{ avg_days: string | null }>(
    `
    WITH recent AS (
      SELECT EXTRACT(epoch FROM (adopted_date - created_at)) / 86400 AS days
      FROM pets.pets
      WHERE ${whereClause}
        AND status = 'adopted'
        AND adopted_date IS NOT NULL
      ORDER BY adopted_date DESC
      LIMIT 50
    )
    SELECT AVG(days)::text AS avg_days FROM recent
    `,
    params
  );
  const avgRaw = avgRes.rows[0]?.avg_days;
  const averageDaysToAdoption = avgRaw ? Math.round(Number.parseFloat(avgRaw)) : 0;

  return {
    total,
    available: counts.available,
    pending: counts.pending,
    adopted: counts.adopted,
    foster: counts.foster,
    medicalHold: counts.medical_hold,
    behavioralHold: counts.behavioral_hold,
    notAvailable: counts.not_available,
    deceased: counts.deceased,
    monthlyAdoptions,
    averageDaysToAdoption,
  };
}

// --- ListFavoriters --------------------------------------------------

// Recipient-discovery read for service.notifications: the user_ids of
// every adopter with an ACTIVE favourite on the pet. Gated on plain
// pets.read (same as Get / List) — no rescue scope, because favouriters
// are cross-rescue and the caller is a trusted system principal fanning
// out a pets.statusChanged event. A missing/soft-deleted pet just yields
// an empty list (no NOT_FOUND): the caller only cares about recipients.
export async function listFavoriters(
  deps: HandlerDeps,
  principal: Principal,
  req: ListPetFavoritersRequest
): Promise<ListPetFavoritersResponse> {
  if (!req.petId) {
    throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
  }
  if (!hasPermission(principal, PETS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_READ}' required`);
  }

  const result = await deps.pool.query<{ user_id: string }>(
    `SELECT user_id FROM pets.user_favorites WHERE pet_id = $1 AND deleted_at IS NULL`,
    [req.petId]
  );
  return { userIds: result.rows.map(row => row.user_id) };
}
