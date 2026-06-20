// gRPC handler implementations for MatchingService — Recommend +
// SearchPets (Phase 9.3c).
//
// Both RPCs are STATELESS reads: they fetch a candidate set from
// service.pets via PetService.List (forwarding the caller's identity so
// pets runs its own `pets.read` gate), then map pets → PetCandidate.
//   - SearchPets returns candidates as-is (no recommender score — plain
//     search orders by relevance), paginated via the keyset cursor.
//   - Recommend ranks the candidate set with the pure scorer in
//     recommend-scoring.ts and returns the top-K by descending score.
//
// Both are factories closing over an injected PetsClient so the gRPC
// server boot wires the real client and tests inject a stub — mirrors
// services/applications/src/grpc/handlers.ts makeStartDraft.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { PETS_VIEW } from '@adopt-dont-shop/lib.types';
import {
  PetsV1,
  type ListPetsRequest,
  type Pet,
  type PetCandidate,
  type RecommendRequest,
  type RecommendResponse,
  type SearchPetsRequest,
  type SearchPetsResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import {
  AGE_GROUP_TO_ENUM,
  lookupToken,
  SIZE_TO_ENUM,
  SPECIES_TO_TYPE,
  TYPE_TO_SPECIES,
} from './pet-tokens.js';
import type { PetsClient } from './pets-client.js';
import { principalToMetadata } from './principal.js';
import { scoreCandidates, type RecommendPreferences } from './recommend-scoring.js';

// grpc-js status codes service.pets can return on the List gate.
const PETS_GRPC_PERMISSION_DENIED = 7;

const DEFAULT_RECOMMEND_LIMIT = 20;
const MAX_RECOMMEND_LIMIT = 100;
// service.pets caps List at 100/page; pull the max so the recommender
// has a real candidate pool to rank rather than just one SPA page.
const RECOMMEND_CANDIDATE_FETCH = 100;

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;

// --- Recommend -------------------------------------------------------

export function makeRecommend(
  petsClient: PetsClient
): (deps: HandlerDeps, principal: Principal, req: RecommendRequest) => Promise<RecommendResponse> {
  return async (deps, principal, req) => {
    ensureSwipePermission(principal);

    const limit = clamp(req.limit, DEFAULT_RECOMMEND_LIMIT, MAX_RECOMMEND_LIMIT);
    // filters_json_override takes precedence over session filters when set.
    const filters = parseFilters(req.filtersJsonOverride);

    const listReq: ListPetsRequest = {
      limit: RECOMMEND_CANDIDATE_FETCH,
      statusFilter: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
      typeFilter: filters.type ?? PetsV1.PetType.PET_TYPE_UNSPECIFIED,
      sizeFilter: filters.size ?? PetsV1.PetSize.PET_SIZE_UNSPECIFIED,
    };

    const pets = await listPets(petsClient, principal, listReq);

    // Drop any pet the caller has already decided on (liked / passed /
    // super-liked). Swipes are append-only — the same pet can appear
    // across many rows — so the exclusion query DEDUPEs by pet_id and we
    // match against a Set. 'info' views are NOT a decision and don't
    // exclude.
    const swiped = await fetchSwipedPetIds(deps, principal.userId);
    const fresh = pets.filter(pet => !swiped.has(pet.petId));

    const preferences: RecommendPreferences = filters.ageGroup
      ? { ageGroup: filters.ageGroup }
      : {};
    const ranked = scoreCandidates(fresh, preferences).slice(0, limit);

    const candidates = ranked.map(({ pet, score }) => petToCandidate(pet, score));

    return {
      candidates,
      // Exhausted when the post-exclusion pool didn't even fill the
      // request — the SPA can prompt the user to widen filters.
      exhausted: fresh.length <= limit,
    };
  };
}

// --- SearchPets ------------------------------------------------------

export function makeSearchPets(
  petsClient: PetsClient
): (
  deps: HandlerDeps,
  principal: Principal,
  req: SearchPetsRequest
) => Promise<SearchPetsResponse> {
  return async (_deps, principal, req) => {
    ensureSwipePermission(principal);

    const limit = clamp(req.limit, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);
    const filters = parseFilters(req.filtersJson);

    const listReq: ListPetsRequest = {
      limit,
      statusFilter: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
      typeFilter: filters.type ?? PetsV1.PetType.PET_TYPE_UNSPECIFIED,
      sizeFilter: filters.size ?? PetsV1.PetSize.PET_SIZE_UNSPECIFIED,
    };
    // The keyset cursor is service.pets' own opaque token — forward it
    // verbatim (matching adds no ranking of its own to search results).
    if (req.cursor !== undefined && req.cursor !== '') {
      listReq.cursor = req.cursor;
    }

    const res = await listPetsResponse(petsClient, principal, listReq);

    // Plain search carries no recommender score (score 0); the SPA
    // orders by relevance, which is service.pets' List order.
    const results = res.pets.map(pet => petToCandidate(pet, 0));

    const response: SearchPetsResponse = { results };
    // Forward service.pets' opaque keyset cursor verbatim — matching
    // adds no ranking of its own here, so there's no need to re-encode.
    if (res.nextCursor !== undefined && res.nextCursor !== '') {
      response.nextCursor = res.nextCursor;
    }
    return response;
  };
}

// --- Shared helpers --------------------------------------------------

function ensureSwipePermission(principal: Principal): void {
  if (!requirePermission(principal, PETS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_VIEW}' required`);
  }
}

function clamp(raw: number, fallback: number, max: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return fallback;
  }
  return Math.min(Math.trunc(raw), max);
}

async function listPets(
  petsClient: PetsClient,
  principal: Principal,
  req: ListPetsRequest
): Promise<ReadonlyArray<Pet>> {
  const res = await listPetsResponse(petsClient, principal, req);
  return res.pets;
}

async function listPetsResponse(
  petsClient: PetsClient,
  principal: Principal,
  req: ListPetsRequest
): Promise<{ pets: Pet[]; nextCursor?: string }> {
  try {
    return await petsClient.listPets(req, principalToMetadata(principal));
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === PETS_GRPC_PERMISSION_DENIED) {
      throw new HandlerError('PERMISSION_DENIED', 'not allowed to read pets');
    }
    throw new HandlerError('INTERNAL', 'failed to read candidate pets');
  }
}

// The set of pet_ids the caller has already DECIDED on (like / pass /
// super_like). Returns DISTINCT pet_id so the append-only swipe history
// — where the same pet can have many rows from repeat swipes — collapses
// to one exclusion per pet. 'info' actions are trace views, not
// decisions, so they don't exclude a pet from future recommendations.
// Exported so GetTopPicks applies the exact same exclusion rule.
export async function fetchSwipedPetIds(deps: HandlerDeps, userId: string): Promise<Set<string>> {
  const { rows } = await deps.pool.query<{ pet_id: string }>(
    `SELECT DISTINCT pet_id
       FROM matching.swipe_actions
      WHERE user_id = $1 AND action IN ('like', 'pass', 'super_like')`,
    [userId]
  );
  return new Set(rows.map(r => r.pet_id));
}

type ParsedFilters = {
  type?: PetsV1.PetType;
  size?: PetsV1.PetSize;
  ageGroup?: PetsV1.PetAgeGroup;
};

// Translate the SPA's JSONB filter blob into the typed pet filters the
// List call + scorer understand. Unknown / absent keys are ignored —
// the SPA evolves its filter shape without a proto regen, so we read
// only the keys we map and silently skip the rest.
function parseFilters(raw: string | undefined): ParsedFilters {
  if (raw === undefined || raw === '') {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new HandlerError('INVALID_ARGUMENT', `filters invalid: ${(err as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new HandlerError('INVALID_ARGUMENT', 'filters must encode a JSON object');
  }
  const obj = parsed;
  return {
    type: mapSpecies(readField(obj, 'species')),
    size: mapSize(readField(obj, 'size')),
    ageGroup: mapAgeGroup(readField(obj, 'ageGroup') ?? readField(obj, 'age_group')),
  };
}

function readField(obj: object, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(obj, key)
    ? Object.getOwnPropertyDescriptor(obj, key)?.value
    : undefined;
}

function mapSpecies(value: unknown): PetsV1.PetType | undefined {
  return lookupToken(value, SPECIES_TO_TYPE);
}

function mapSize(value: unknown): PetsV1.PetSize | undefined {
  return lookupToken(value, SIZE_TO_ENUM);
}

function mapAgeGroup(value: unknown): PetsV1.PetAgeGroup | undefined {
  return lookupToken(value, AGE_GROUP_TO_ENUM);
}

// Pet (pets vertical) → PetCandidate (matching's swipe-card subset).
// The pets Pet message has no plain `breed` name (only breedId) nor an
// `age` string nor a primary image URL, so those optional candidate
// fields are derived where possible and otherwise omitted.
function petToCandidate(pet: Pet, score: number): PetCandidate {
  const candidate: PetCandidate = {
    petId: pet.petId,
    name: pet.name,
    species: TYPE_TO_SPECIES[pet.type] ?? 'unknown',
    rescueId: pet.rescueId ?? '',
    score,
  };

  const age = formatAge(pet.ageYears, pet.ageMonths);
  if (age !== undefined) {
    candidate.age = age;
  }
  if (pet.shortDescription !== undefined && pet.shortDescription !== '') {
    candidate.shortDescription = pet.shortDescription;
  }
  return candidate;
}

function formatAge(years: number | undefined, months: number | undefined): string | undefined {
  const parts: string[] = [];
  if (years !== undefined && years > 0) {
    parts.push(`${years}y`);
  }
  if (months !== undefined && months > 0) {
    parts.push(`${months}m`);
  }
  return parts.length > 0 ? parts.join(' ') : undefined;
}
