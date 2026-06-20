// gRPC handler for MatchingService.GetTopPicks — a short, personalised
// "top picks" list distinct from Recommend's swipe feed.
//
// Unlike Recommend (which scores against the session's transient
// filters), top picks reads the adopter's STORED match profile
// (preferred types / sizes / age groups + lifestyle) from
// matching.adopter_match_profiles, scores the available pets against it
// with the pure scorer in top-picks-scoring.ts, excludes already-swiped
// pets (same rule as Recommend), and resolves each pick's rescue name
// over gRPC. Stateless — no swipe session required, no mutation.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { PETS_VIEW } from '@adopt-dont-shop/lib.types';
import {
  PetsV1,
  type GetTopPicksRequest,
  type GetTopPicksResponse,
  type ListPetsRequest,
  type Pet,
  type TopPick,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import {
  AGE_GROUP_TO_ENUM,
  AGE_GROUP_TO_TOKEN,
  lookupToken,
  SIZE_TO_ENUM,
  SIZE_TO_TOKEN,
  SPECIES_TO_TYPE,
  TYPE_TO_SPECIES,
} from './pet-tokens.js';
import type { PetsClient } from './pets-client.js';
import { principalToMetadata } from './principal.js';
import { fetchSwipedPetIds } from './recommend-handlers.js';
import type { RescueNameClient } from './rescue-client.js';
import { scoreTopPicks, type TopPickPreferences } from './top-picks-scoring.js';

// grpc-js PERMISSION_DENIED, returned by service.pets' List gate.
const PETS_GRPC_PERMISSION_DENIED = 7;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
// service.pets caps List at 100/page; pull the max so the scorer ranks a
// real pool rather than a single SPA page before slicing to the top-K.
const CANDIDATE_FETCH = 100;

export function makeGetTopPicks(
  petsClient: PetsClient,
  rescueClient: RescueNameClient
): (
  deps: HandlerDeps,
  principal: Principal,
  req: GetTopPicksRequest
) => Promise<GetTopPicksResponse> {
  return async (deps, principal, req) => {
    if (!requirePermission(principal, PETS_VIEW)) {
      throw new HandlerError('PERMISSION_DENIED', `'${PETS_VIEW}' required`);
    }

    const limit = clamp(req.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const preferences = await loadPreferences(deps, principal.userId);

    const listReq: ListPetsRequest = {
      limit: CANDIDATE_FETCH,
      statusFilter: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
      typeFilter: PetsV1.PetType.PET_TYPE_UNSPECIFIED,
      sizeFilter: PetsV1.PetSize.PET_SIZE_UNSPECIFIED,
    };
    const pets = await listAvailablePets(petsClient, principal, listReq);

    const swiped = await fetchSwipedPetIds(deps, principal.userId);
    const fresh = pets.filter(pet => !swiped.has(pet.petId));

    const ranked = scoreTopPicks(fresh, preferences).slice(0, limit);

    const rescueNames = await resolveRescueNames(
      rescueClient,
      ranked.map(r => r.pet)
    );
    const picks = ranked.map(({ pet, score, reasons }) =>
      toTopPick(pet, score, reasons, rescueNames)
    );

    return { picks };
  };
}

function clamp(raw: number, fallback: number, max: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return fallback;
  }
  return Math.min(Math.trunc(raw), max);
}

type ProfileRow = {
  preferred_types: unknown[] | null;
  preferred_sizes: unknown[] | null;
  preferred_age_groups: unknown[] | null;
  lifestyle: Record<string, unknown> | null;
};

// Read the adopter's stored match profile and map its lowercase token
// arrays onto the proto enum sets the scorer needs. A missing profile
// yields empty preferences — every candidate then scores purely on
// recency + promotion (no preference signal to discriminate on).
async function loadPreferences(deps: HandlerDeps, userId: string): Promise<TopPickPreferences> {
  const { rows } = await deps.pool.query<ProfileRow>(
    `SELECT preferred_types, preferred_sizes, preferred_age_groups, lifestyle
       FROM matching.adopter_match_profiles
      WHERE user_id = $1
      LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  if (row === undefined) {
    return emptyPreferences();
  }
  return {
    preferredTypes: tokensToEnumSet(row.preferred_types, SPECIES_TO_TYPE),
    preferredSizes: tokensToEnumSet(row.preferred_sizes, SIZE_TO_ENUM),
    preferredAgeGroups: tokensToEnumSet(row.preferred_age_groups, AGE_GROUP_TO_ENUM),
    lifestyle: parseLifestyle(row.lifestyle),
  };
}

function emptyPreferences(): TopPickPreferences {
  return {
    preferredTypes: new Set(),
    preferredSizes: new Set(),
    preferredAgeGroups: new Set(),
    lifestyle: {},
  };
}

function tokensToEnumSet<T>(tokens: unknown[] | null, table: Record<string, T>): ReadonlySet<T> {
  const set = new Set<T>();
  if (tokens === null) {
    return set;
  }
  for (const token of tokens) {
    const enumValue = lookupToken(token, table);
    if (enumValue !== undefined) {
      set.add(enumValue);
    }
  }
  return set;
}

function parseLifestyle(
  lifestyle: Record<string, unknown> | null
): TopPickPreferences['lifestyle'] {
  if (lifestyle === null) {
    return {};
  }
  return {
    hasChildren: readBool(lifestyle, 'has_children'),
    hasOtherPets: readBool(lifestyle, 'has_other_pets'),
    otherPetsType: readOtherPetsType(lifestyle),
  };
}

function readBool(obj: Record<string, unknown>, key: string): boolean | undefined {
  const value = obj[key];
  return typeof value === 'boolean' ? value : undefined;
}

function readOtherPetsType(
  obj: Record<string, unknown>
): TopPickPreferences['lifestyle']['otherPetsType'] {
  const value = obj['other_pets_type'];
  if (value === 'none' || value === 'dogs' || value === 'cats' || value === 'mixed') {
    return value;
  }
  return undefined;
}

async function listAvailablePets(
  petsClient: PetsClient,
  principal: Principal,
  req: ListPetsRequest
): Promise<ReadonlyArray<Pet>> {
  try {
    const res = await petsClient.listPets(req, principalToMetadata(principal));
    return res.pets;
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === PETS_GRPC_PERMISSION_DENIED) {
      throw new HandlerError('PERMISSION_DENIED', 'not allowed to read pets');
    }
    throw new HandlerError('INTERNAL', 'failed to read candidate pets');
  }
}

// Resolve the rescue name for every distinct rescue in the pick set in
// one batch, deduping so a rescue with several picks is fetched once.
async function resolveRescueNames(
  rescueClient: RescueNameClient,
  pets: ReadonlyArray<Pet>
): Promise<Map<string, string>> {
  const ids = [...new Set(pets.map(pet => pet.rescueId).filter((id): id is string => !!id))];
  const entries = await Promise.all(
    ids.map(async id => [id, (await rescueClient.getRescueName(id)) ?? ''] as const)
  );
  return new Map(entries);
}

function toTopPick(
  pet: Pet,
  score: number,
  reasons: ReadonlyArray<{ kind: string; label: string }>,
  rescueNames: Map<string, string>
): TopPick {
  return {
    petId: pet.petId,
    name: pet.name,
    type: TYPE_TO_SPECIES[pet.type] ?? 'unknown',
    ageGroup: AGE_GROUP_TO_TOKEN[pet.ageGroup] ?? 'unknown',
    size: SIZE_TO_TOKEN[pet.size] ?? 'unknown',
    score,
    reasons: reasons.map(r => ({ kind: r.kind, label: r.label })),
    rescueName: (pet.rescueId && rescueNames.get(pet.rescueId)) || '',
  };
}
