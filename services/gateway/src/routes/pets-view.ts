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

import { PetsV1, type ListPetsResponse, type Pet } from '@adopt-dont-shop/proto';

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
