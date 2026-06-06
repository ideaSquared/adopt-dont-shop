// Stage B (ADR 0002) — pets response adapter.
//
// service.pets returns proto-JSON; the frontend lib.pets `PetSchema`
// expects snake_case fields, lowercase enum tokens, the long-tail fields
// unpacked from the proto's `extra_json` blob, and a `{ success, data,
// meta }` envelope. This module is that translation so flipping
// CUTOVER_PETS serves a shape the SPA's Zod parse accepts.
//
// Only `pet_id` + `name` are required on the frontend schema; everything
// else is optional, so we map what the proto carries and omit the rest.
//
// Known gaps (flagged for follow-up, all non-fatal — the fields are
// optional): the proto carries `breed_id`/`secondary_breed_id`, not the
// breed NAME the frontend's `breed` field wants (needs a breed lookup);
// and `meta.total`/`totalPages` are best-effort (the proto List is keyset,
// so there's no global count without a separate query).

import {
  PetsV1,
  type CreatePetRequest,
  type ListPetsResponse,
  type Pet,
  type UpdatePetRequest,
} from '@adopt-dont-shop/proto';

// A proto int enum → the frontend's lowercase token (strip the SCREAMING
// prefix). 0 (UNSPECIFIED) / -1 (UNRECOGNIZED) → undefined (omit — the
// field is optional).
function enumToken(
  toJSON: (v: number) => string,
  value: number,
  prefix: string
): string | undefined {
  if (value <= 0) {
    return undefined;
  }
  return toJSON(value).slice(prefix.length).toLowerCase();
}

function parseArray(json: string | undefined): unknown[] | undefined {
  if (json === undefined || json === '' || json === '[]') {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function parseObject(json: string | undefined): Record<string, unknown> {
  if (json === undefined || json === '' || json === '{}') {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

// Drop keys whose value is undefined so the emitted JSON matches the
// frontend's "absent vs present" expectations.
function prune(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export function petToView(p: Pet): Record<string, unknown> {
  // extra_json carries the long tail (good_with_*, vaccination_status,
  // location, medical_notes, breed name if the service stored it, …).
  // Spread it first so the core proto fields below take precedence.
  const extra = parseObject(p.extraJson);

  const core: Record<string, unknown> = {
    pet_id: p.petId,
    name: p.name,
    rescue_id: p.rescueId,
    type: enumToken(PetsV1.petTypeToJSON, p.type, 'PET_TYPE_'),
    status: enumToken(PetsV1.petStatusToJSON, p.status, 'PET_STATUS_'),
    gender: enumToken(PetsV1.petGenderToJSON, p.gender, 'PET_GENDER_'),
    size: enumToken(PetsV1.petSizeToJSON, p.size, 'PET_SIZE_'),
    age_group: enumToken(PetsV1.petAgeGroupToJSON, p.ageGroup, 'PET_AGE_GROUP_'),
    short_description: p.shortDescription,
    long_description: p.longDescription,
    age_years: p.ageYears,
    age_months: p.ageMonths,
    color: p.color,
    archived: p.archived,
    featured: p.featured,
    priority_listing: p.priorityListing,
    special_needs: p.specialNeeds,
    house_trained: p.houseTrained,
    temperament: parseArray(p.temperamentJson),
    tags: parseArray(p.tagsJson),
    view_count: p.viewCount,
    favorite_count: p.favoriteCount,
    application_count: p.applicationCount,
    available_since: p.availableSince,
    adopted_date: p.adoptedDate,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };

  // adoption_fee: the proto splits it into minor units + currency; the
  // frontend wants a decimal string. Format when present.
  if (p.adoptionFeeMinor !== undefined) {
    core.adoption_fee = (p.adoptionFeeMinor / 100).toFixed(2);
  }

  return prune({ ...extra, ...core });
}

export type PetsListMeta = {
  page: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

// Best-effort page meta from a keyset page. `total`/`totalPages` reflect
// the current page only (the proto List is keyset; no global count) —
// `hasNext` is driven by the cursor so the SPA can page forward.
export function listToEnvelope(res: ListPetsResponse): {
  success: true;
  data: Record<string, unknown>[];
  meta: PetsListMeta;
} {
  const data = res.pets.map(petToView);
  const hasNext = res.nextCursor !== undefined && res.nextCursor !== '';
  return {
    success: true,
    data,
    meta: { page: 1, total: data.length, totalPages: 1, hasNext, hasPrev: false },
  };
}

// --- Inverse adapter: frontend payload → proto request -----------------
//
// The SPA's create/update payload is the snake_case Pet shape (string enum
// tokens, arrays, the long-tail good_with_*/vaccination_status/… fields),
// produced by lib.pets' transformPetDataForAPI. These map it back to the
// proto request: enum tokens → ints, arrays → *_json, and every field the
// core proto message doesn't carry is packed into extra_json.

// snake_case (and camelCase fallback) keys consumed by the core proto
// fields — everything else in the body is packed into extra_json.
const CORE_KEYS = new Set([
  'name',
  'rescue_id',
  'rescueId',
  'type',
  'status',
  'gender',
  'size',
  'age_group',
  'ageGroup',
  'breed_id',
  'breedId',
  'secondary_breed_id',
  'secondaryBreedId',
  'short_description',
  'shortDescription',
  'long_description',
  'longDescription',
  'age_years',
  'ageYears',
  'age_months',
  'ageMonths',
  'adoption_fee',
  'adoptionFee',
  'adoption_fee_minor',
  'adoption_fee_currency',
  'special_needs',
  'specialNeeds',
  'house_trained',
  'houseTrained',
  'featured',
  'priority_listing',
  'priorityListing',
  'temperament',
  'tags',
]);

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v !== '' ? v : undefined;
}
function int(v: unknown): number | undefined {
  if (typeof v === 'number') {
    return Math.trunc(v);
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}
function boolean(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}
function jsonArray(v: unknown): string | undefined {
  return Array.isArray(v) ? JSON.stringify(v) : undefined;
}
// adoption_fee arrives as a decimal string/number; the proto wants minor units.
function feeToMinor(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) : NaN;
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

// Accept the lowercase token ('dog') OR the SCREAMING proto name; unknown /
// absent → UNSPECIFIED (the service then validates).
function tokenToEnum(
  fromJSON: (s: string) => number,
  prefix: string,
  raw: unknown,
  unspecified: number
): number {
  if (typeof raw !== 'string' || raw === '') {
    return unspecified;
  }
  const candidate = raw.startsWith(prefix) ? raw : `${prefix}${raw.toUpperCase()}`;
  try {
    const v = fromJSON(candidate);
    return v < 0 ? unspecified : v;
  } catch {
    return unspecified;
  }
}

function pickExtra(b: Record<string, unknown>): string {
  const extra = Object.fromEntries(Object.entries(b).filter(([k]) => !CORE_KEYS.has(k)));
  return JSON.stringify(extra);
}

export function viewToCreateRequest(body: unknown): CreatePetRequest {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    name: str(b.name) ?? '',
    rescueId: str(b.rescue_id ?? b.rescueId) ?? '',
    type: tokenToEnum(
      PetsV1.petTypeFromJSON,
      'PET_TYPE_',
      b.type,
      PetsV1.PetType.PET_TYPE_UNSPECIFIED
    ),
    gender: tokenToEnum(
      PetsV1.petGenderFromJSON,
      'PET_GENDER_',
      b.gender,
      PetsV1.PetGender.PET_GENDER_UNSPECIFIED
    ),
    size: tokenToEnum(
      PetsV1.petSizeFromJSON,
      'PET_SIZE_',
      b.size,
      PetsV1.PetSize.PET_SIZE_UNSPECIFIED
    ),
    ageGroup: tokenToEnum(
      PetsV1.petAgeGroupFromJSON,
      'PET_AGE_GROUP_',
      b.age_group ?? b.ageGroup,
      PetsV1.PetAgeGroup.PET_AGE_GROUP_UNSPECIFIED
    ),
    breedId: str(b.breed_id ?? b.breedId),
    secondaryBreedId: str(b.secondary_breed_id ?? b.secondaryBreedId),
    shortDescription: str(b.short_description ?? b.shortDescription),
    longDescription: str(b.long_description ?? b.longDescription),
    ageYears: int(b.age_years ?? b.ageYears),
    ageMonths: int(b.age_months ?? b.ageMonths),
    adoptionFeeMinor: feeToMinor(b.adoption_fee ?? b.adoptionFee ?? b.adoption_fee_minor),
    adoptionFeeCurrency: str(b.adoption_fee_currency),
    specialNeeds: boolean(b.special_needs ?? b.specialNeeds) ?? false,
    houseTrained: boolean(b.house_trained ?? b.houseTrained) ?? false,
    temperamentJson: jsonArray(b.temperament) ?? '[]',
    tagsJson: jsonArray(b.tags) ?? '[]',
    extraJson: pickExtra(b),
  };
}

// Partial: only fields present in the body are set (the proto Update message
// writes just the supplied ones). extra_json is always sent so long-tail
// edits land; enum/scalars only when present.
export function viewToUpdateRequest(petId: string, body: unknown): UpdatePetRequest {
  const b = (body ?? {}) as Record<string, unknown>;
  const req: UpdatePetRequest = { petId, extraJson: pickExtra(b) };

  const name = str(b.name);
  if (name !== undefined) {
    req.name = name;
  }
  const shortDescription = str(b.short_description ?? b.shortDescription);
  if (shortDescription !== undefined) {
    req.shortDescription = shortDescription;
  }
  const longDescription = str(b.long_description ?? b.longDescription);
  if (longDescription !== undefined) {
    req.longDescription = longDescription;
  }
  if (b.gender !== undefined) {
    req.gender = tokenToEnum(
      PetsV1.petGenderFromJSON,
      'PET_GENDER_',
      b.gender,
      PetsV1.PetGender.PET_GENDER_UNSPECIFIED
    );
  }
  if (b.size !== undefined) {
    req.size = tokenToEnum(
      PetsV1.petSizeFromJSON,
      'PET_SIZE_',
      b.size,
      PetsV1.PetSize.PET_SIZE_UNSPECIFIED
    );
  }
  if (b.age_group !== undefined || b.ageGroup !== undefined) {
    req.ageGroup = tokenToEnum(
      PetsV1.petAgeGroupFromJSON,
      'PET_AGE_GROUP_',
      b.age_group ?? b.ageGroup,
      PetsV1.PetAgeGroup.PET_AGE_GROUP_UNSPECIFIED
    );
  }
  const breedId = str(b.breed_id ?? b.breedId);
  if (breedId !== undefined) {
    req.breedId = breedId;
  }
  const fee = feeToMinor(b.adoption_fee ?? b.adoptionFee ?? b.adoption_fee_minor);
  if (fee !== undefined) {
    req.adoptionFeeMinor = fee;
  }
  const specialNeeds = boolean(b.special_needs ?? b.specialNeeds);
  if (specialNeeds !== undefined) {
    req.specialNeeds = specialNeeds;
  }
  const houseTrained = boolean(b.house_trained ?? b.houseTrained);
  if (houseTrained !== undefined) {
    req.houseTrained = houseTrained;
  }
  const featured = boolean(b.featured);
  if (featured !== undefined) {
    req.featured = featured;
  }
  const priorityListing = boolean(b.priority_listing ?? b.priorityListing);
  if (priorityListing !== undefined) {
    req.priorityListing = priorityListing;
  }
  const temperament = jsonArray(b.temperament);
  if (temperament !== undefined) {
    req.temperamentJson = temperament;
  }
  const tags = jsonArray(b.tags);
  if (tags !== undefined) {
    req.tagsJson = tags;
  }

  return req;
}
