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
  type ActivityLabel,
  type AdoptionCohort,
  type ListPetsRequest,
  type Pet,
  type PetCandidate,
  type RecommendRequest,
  type RecommendResponse,
  type SearchPetsRequest,
  type SearchPetsResponse,
} from '@adopt-dont-shop/proto';
import { isSafeImageUrl } from '@adopt-dont-shop/service-bootstrap';

import { HandlerError, type HandlerDeps } from './adapter.js';
import {
  AGE_GROUP_TO_ENUM,
  AGE_GROUP_TO_TOKEN,
  GENDER_TO_TOKEN,
  lookupToken,
  SIZE_TO_ENUM,
  SIZE_TO_TOKEN,
  SPECIES_TO_TYPE,
  TYPE_TO_SPECIES,
} from './pet-tokens.js';
import { haversineMiles, parseUserLocation, type LatLng } from './distance.js';
import type { PetsClient } from './pets-client.js';
import type { RescueCoordinates, RescueLocationClient } from './rescue-client.js';
import { principalToMetadata } from './principal.js';
import { scoreCandidates, type RecommendPreferences } from './recommend-scoring.js';

// grpc-js status codes service.pets can return on the List gate.
const PETS_GRPC_PERMISSION_DENIED = 7;

const DEFAULT_RECOMMEND_LIMIT = 20;
const MAX_RECOMMEND_LIMIT = 100;
// service.pets caps List at 100/page; pull the max so the recommender
// has a real candidate pool to rank rather than just one SPA page.
const RECOMMEND_CANDIDATE_FETCH = 100;
// Cap on keyset pages scanned per request so a caller who has swiped
// through most of the catalogue can't fan one Recommend/TopPicks call out
// into an unbounded run of pets.List calls. Hitting the cap without
// draining the source leaves `sourceExhausted` false — there may be more
// fresh pets past the scanned window.
const MAX_CANDIDATE_PAGES = 10;

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;

// --- Recommend -------------------------------------------------------

export function makeRecommend(
  petsClient: PetsClient,
  rescueLocations?: RescueLocationClient
): (deps: HandlerDeps, principal: Principal, req: RecommendRequest) => Promise<RecommendResponse> {
  return async (deps, principal, req) => {
    ensureSwipePermission(principal);

    const limit = clamp(req.limit, DEFAULT_RECOMMEND_LIMIT, MAX_RECOMMEND_LIMIT);
    // filters_json_override takes precedence over session filters when set.
    const filters = parseFilters(req.filtersJsonOverride);

    const baseReq: ListPetsRequest = {
      limit: RECOMMEND_CANDIDATE_FETCH,
      statusFilter: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
      typeFilter: filters.type ?? PetsV1.PetType.PET_TYPE_UNSPECIFIED,
      sizeFilter: filters.size ?? PetsV1.PetSize.PET_SIZE_UNSPECIFIED,
    };

    // Drop any pet the caller has already decided on (liked / passed /
    // super-liked). Swipes are append-only — the same pet can appear
    // across many rows — so the exclusion query DEDUPEs by pet_id and we
    // match against a Set. 'info' views are NOT a decision and don't
    // exclude. The candidate fetch paginates service.pets' keyset so pets
    // past the first page still become candidates (ADS-1169).
    const swiped = await fetchSwipedPetIds(deps, principal.userId);
    const { fresh, sourceExhausted } = await gatherFreshCandidates(
      petsClient,
      principal,
      baseReq,
      swiped,
      RECOMMEND_CANDIDATE_FETCH
    );

    const preferences: RecommendPreferences = filters.ageGroup
      ? { ageGroup: filters.ageGroup }
      : {};
    const ranked = scoreCandidates(fresh, preferences).slice(0, limit);

    // The lookups are optional and independent (each has its own short,
    // no-retry budget), so run them side by side. Label precedence on a card:
    // views_today > days_waiting > similar_adopted_fast.
    const [withDistance, similarAdopted, viewsToday] = await Promise.all([
      withDistances(
        ranked.map(({ pet, score }) => petToCandidate(pet, score)),
        filters.userLocation,
        rescueLocations
      ),
      similarAdoptedLabels(
        petsClient,
        principal,
        ranked.map(({ pet }) => pet)
      ),
      fetchViewsToday(
        petsClient,
        principal,
        ranked.map(({ pet }) => pet.petId)
      ),
    ]);
    const candidates = withDistance.map((candidate, i) => {
      const { petId } = ranked[i].pet;
      return withFallbackLabel(
        withPriorityLabel(candidate, viewsTodayLabel(viewsToday.get(petId) ?? 0)),
        similarAdopted.get(petId)
      );
    });

    return {
      candidates,
      // Exhausted only when service.pets has no further page AND the
      // gathered pool didn't exceed the request — otherwise adoptable pets
      // remain and the SPA must not prompt the user to widen filters.
      exhausted: sourceExhausted && fresh.length <= limit,
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
    // Forward the free-text term to service.pets' search (ADS-1160) — the
    // pets vertical matches it against the search vector. Without this the
    // filter still applied but the query was silently dropped, so search
    // returned every available pet.
    if (req.query !== undefined && req.query !== '') {
      listReq.search = req.query;
    }
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

// Fetch candidate pets from service.pets one keyset page at a time,
// dropping pets the caller has already swiped, until `targetFresh` fresh
// candidates are gathered or the source is drained. Deduping by pet_id
// guards against a pet spanning two consecutive pages producing a
// duplicate card. `sourceExhausted` is true only when service.pets
// reported no further page — the caller decides `exhausted` from it.
// Exported so GetTopPicks paginates the candidate pool identically.
export async function gatherFreshCandidates(
  petsClient: PetsClient,
  principal: Principal,
  baseReq: ListPetsRequest,
  swiped: ReadonlySet<string>,
  targetFresh: number
): Promise<{ fresh: ReadonlyArray<Pet>; sourceExhausted: boolean }> {
  const fresh: Pet[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  let sourceExhausted = false;
  let pages = 0;

  do {
    const req: ListPetsRequest = cursor === undefined ? baseReq : { ...baseReq, cursor };
    const res = await listPetsResponse(petsClient, principal, req);
    for (const pet of res.pets) {
      if (seen.has(pet.petId)) {
        continue;
      }
      seen.add(pet.petId);
      if (!swiped.has(pet.petId)) {
        fresh.push(pet);
      }
    }
    pages += 1;
    cursor = res.nextCursor !== undefined && res.nextCursor !== '' ? res.nextCursor : undefined;
    sourceExhausted = cursor === undefined || res.pets.length === 0;
  } while (!sourceExhausted && fresh.length < targetFresh && pages < MAX_CANDIDATE_PAGES);

  return { fresh, sourceExhausted };
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
  // The caller's coordinates, used only to compute card distances; never
  // logged or persisted.
  userLocation?: LatLng;
};

// Adds distance_miles to candidates whose rescue has coordinates. Best
// effort: without the caller's location, a client, or a successful lookup,
// candidates come back unchanged — a distance is never worth failing the deck.
// The gateway gives the whole Recommend call 5s and then spends another short
// budget on rescue names, so this optional lookup gets one short attempt: no
// retries, and the gRPC deadline cancels it on the wire.
const RESCUE_LOCATION_BUDGET = { deadlineMs: 750, maxRetries: 0 };

async function withDistances(
  candidates: PetCandidate[],
  userLocation: LatLng | undefined,
  rescueLocations: RescueLocationClient | undefined
): Promise<PetCandidate[]> {
  if (userLocation === undefined || rescueLocations === undefined) {
    return candidates;
  }
  const rescueIds = [...new Set(candidates.map(c => c.rescueId).filter(id => id !== ''))];
  const locations = await rescueLocations
    .getRescueLocations(rescueIds, RESCUE_LOCATION_BUDGET)
    .catch(() => new Map<string, RescueCoordinates>());
  return candidates.map(candidate => {
    const rescue = locations.get(candidate.rescueId);
    return rescue === undefined
      ? candidate
      : { ...candidate, distanceMiles: haversineMiles(userLocation, rescue) };
  });
}

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
    userLocation: parseUserLocation(readField(obj, 'latitude'), readField(obj, 'longitude')),
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
// `age` string nor image URLs; breed and images ride in extra_json (the
// same keys service.gateway's petToView reads), so they are read from
// there and otherwise omitted.
function petToCandidate(pet: Pet, score: number): PetCandidate {
  const candidate: PetCandidate = {
    petId: pet.petId,
    name: pet.name,
    species: TYPE_TO_SPECIES[pet.type] ?? 'unknown',
    rescueId: pet.rescueId ?? '',
    score,
    images: [],
  };

  const age = formatAge(pet.ageYears, pet.ageMonths);
  if (age !== undefined) {
    candidate.age = age;
  }
  if (pet.ageYears !== undefined) {
    candidate.ageYears = pet.ageYears;
  }
  if (pet.ageMonths !== undefined) {
    candidate.ageMonths = pet.ageMonths;
  }
  if (pet.shortDescription !== undefined && pet.shortDescription !== '') {
    candidate.shortDescription = pet.shortDescription;
  }
  candidate.gender = GENDER_TO_TOKEN[pet.gender];
  candidate.size = SIZE_TO_TOKEN[pet.size];
  candidate.ageGroup = AGE_GROUP_TO_TOKEN[pet.ageGroup];

  const extra = parseExtra(pet.extraJson);
  if (typeof extra.breed === 'string' && extra.breed !== '') {
    candidate.breed = extra.breed;
  }
  candidate.images = imageUrls(extra);
  if (candidate.images.length > 0) {
    candidate.primaryImageUrl = candidate.images[0];
  }
  const activityLabel = daysWaitingLabel(pet.availableSince);
  if (activityLabel !== undefined) {
    candidate.activityLabel = activityLabel;
  }
  return candidate;
}

// `days_waiting` is derived here from available_since; `views_today` and
// `similar_adopted_fast` come from lookups in makeRecommend. Under a week the
// waiting number isn't a meaningful nudge, so no label.
const MIN_WAITING_DAYS = 7;
// "3 views today" is a weak nudge; only show the label from here up.
const MIN_VIEWS_TODAY = 5;
// Optional garnish, like the adoption stats: one short attempt, no retries, so a
// stalled count query can not eat the Recommend deadline (fails open).
const VIEWS_TODAY_BUDGET = { deadlineMs: 1_000, maxRetries: 0 };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function viewsTodayLabel(views: number): ActivityLabel | undefined {
  return views >= MIN_VIEWS_TODAY
    ? { kind: 'views_today', text: `${views} views today`, icon: '👀' }
    : undefined;
}

// One batched lookup per Recommend page. The label is decoration, so a
// failure (pets down, deadline) just drops it rather than failing the deck.
async function fetchViewsToday(
  petsClient: PetsClient,
  principal: Principal,
  petIds: ReadonlyArray<string>
): Promise<ReadonlyMap<string, number>> {
  if (petIds.length === 0) {
    return new Map();
  }
  try {
    const res = await withTimeout(
      petsClient.getViewsToday(
        { petIds: [...petIds] },
        principalToMetadata(principal),
        VIEWS_TODAY_BUDGET
      ),
      VIEWS_TODAY_BUDGET.deadlineMs
    );
    return new Map(res.counts.map(c => [c.petId, c.views]));
  } catch {
    return new Map();
  }
}

function daysWaitingLabel(availableSince: string | undefined): ActivityLabel | undefined {
  if (availableSince === undefined) {
    return undefined;
  }
  const since = Date.parse(availableSince);
  if (Number.isNaN(since)) {
    return undefined;
  }
  const days = Math.floor((Date.now() - since) / MS_PER_DAY);
  return days >= MIN_WAITING_DAYS
    ? { kind: 'days_waiting', text: `Waiting ${days} days`, icon: '🕒' }
    : undefined;
}

// `similar_adopted_fast`: social proof from pets like this one (same type,
// size and age group). Lowest precedence — views_today > days_waiting >
// this — so it only fills a card that has no label yet. The stats call is
// best-effort: a failure costs the label, never the recommendations.
// The lookup is optional garnish, so it gets a short budget with no retries
// (same 750ms the gateway gives its other optional lookup) instead of the
// client-wide 5s x 3 attempts: a stalled pets call must not push this
// Recommend past the gateway's own deadline and lose the recommendations
// too. The Promise.race backs the gRPC deadline for any client that does not
// enforce it. Cohorts go out in chunks of the pets handler's per-call
// limit, so a full page (up to 100 pets) never has a cohort skipped.
const ADOPTION_STATS_BUDGET = { deadlineMs: 750, maxRetries: 0 };
const MAX_COHORTS_PER_STATS_CALL = 50;
const SIMILAR_ADOPTED_MIN_SAMPLES = 5;
const SIMILAR_ADOPTED_MAX_MEDIAN_DAYS = 30;

const cohortKey = (c: AdoptionCohort): string => `${c.type}|${c.size}|${c.ageGroup}`;

const chunk = <T>(items: ReadonlyArray<T>, size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size)
  );

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function similarAdoptedLabels(
  petsClient: PetsClient,
  principal: Principal,
  pets: ReadonlyArray<Pet>
): Promise<Map<string, ActivityLabel>> {
  const cohorts = new Map<string, AdoptionCohort>();
  for (const { type, size, ageGroup } of pets) {
    const cohort = { type, size, ageGroup };
    const known =
      type !== PetsV1.PetType.PET_TYPE_UNSPECIFIED &&
      size !== PetsV1.PetSize.PET_SIZE_UNSPECIFIED &&
      ageGroup !== PetsV1.PetAgeGroup.PET_AGE_GROUP_UNSPECIFIED;
    if (known) {
      cohorts.set(cohortKey(cohort), cohort);
    }
  }
  if (cohorts.size === 0) {
    return new Map();
  }

  // Each chunk fails open on its own, so one bad chunk only costs its own
  // cohorts' labels.
  const statsFor = async (cohortChunk: AdoptionCohort[]) => {
    try {
      const res = await withTimeout(
        petsClient.getAdoptionStats(
          { cohorts: cohortChunk },
          principalToMetadata(principal),
          ADOPTION_STATS_BUDGET
        ),
        ADOPTION_STATS_BUDGET.deadlineMs
      );
      return res.stats;
    } catch {
      return [];
    }
  };
  const stats = (
    await Promise.all(chunk([...cohorts.values()], MAX_COHORTS_PER_STATS_CALL).map(statsFor))
  ).flat();

  const fast = new Set(
    stats
      .filter(
        s =>
          s.cohort !== undefined &&
          s.sampleCount >= SIMILAR_ADOPTED_MIN_SAMPLES &&
          s.medianDays < SIMILAR_ADOPTED_MAX_MEDIAN_DAYS
      )
      .map(s => (s.cohort ? cohortKey(s.cohort) : ''))
  );
  return new Map(
    pets
      .filter(pet => fast.has(cohortKey(pet)))
      .map(pet => [
        pet.petId,
        {
          kind: 'similar_adopted_fast',
          text: `Pets like ${pet.name} adopted in <${SIMILAR_ADOPTED_MAX_MEDIAN_DAYS} days`,
        },
      ])
  );
}

// The opposite of withFallbackLabel: a label that outranks whatever the card
// already carries (views_today beats days_waiting).
function withPriorityLabel(candidate: PetCandidate, label: ActivityLabel | undefined) {
  return label === undefined ? candidate : { ...candidate, activityLabel: label };
}

function withFallbackLabel(candidate: PetCandidate, fallback: ActivityLabel | undefined) {
  const activityLabel = candidate.activityLabel ?? fallback;
  return activityLabel === undefined ? candidate : { ...candidate, activityLabel };
}

function parseExtra(json: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? Object.fromEntries(Object.entries(parsed))
      : {};
  } catch {
    return {};
  }
}

// `image_urls` is the single authoritative photo list (first is primary).
// Cards render these in every viewer's browser, so they are held to the same
// policy service.pets enforces at write time (older rows may predate it).
function imageUrls(extra: Record<string, unknown>): string[] {
  const urls = extra.image_urls;
  if (!Array.isArray(urls)) {
    return [];
  }
  return [...new Set(urls.filter((u): u is string => typeof u === 'string' && isSafeImageUrl(u)))];
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
