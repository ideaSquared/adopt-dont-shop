// Pure ranking for Recommend — no I/O, fully unit-testable.
//
// The recommender is intentionally SIMPLE (v1). Candidates arriving
// here have ALREADY been hard-filtered by PetService.List to available
// pets matching the session's species / size filters, so scoring only
// needs to order that set. Every signal is read off the Pet message
// itself — NO extra lookups, no swipe-history joins (a later iteration
// can layer those in).
//
// score ∈ [0, 1] is a weighted blend of three signals:
//
//   1. Recency (weight 0.4) — a freshly-listed pet is more likely to
//      still be available and is what the SPA wants to surface first.
//      Normalised linearly against the freshest `availableSince` in the
//      candidate set, so the newest pet scores 1.0 on this axis and the
//      oldest 0.0. Pets with no availableSince get 0 (unknown freshness).
//
//   2. Promotion (weight 0.3) — `featured` and `priorityListing` are the
//      rescue's explicit "boost this" flags; honouring them mirrors the
//      monolith's listing prioritisation.
//
//   3. Preference match (weight 0.3) — when the session filters carry a
//      soft `ageGroup` preference (which PetService.List can't filter on),
//      matching pets get the full preference weight. Absent that soft
//      preference, every candidate gets it (nothing to discriminate on).
//
// Weights sum to 1.0 so the blend stays within [0, 1].

import { PetsV1, type Pet } from '@adopt-dont-shop/proto';

const RECENCY_WEIGHT = 0.4;
const PROMOTION_WEIGHT = 0.3;
const PREFERENCE_WEIGHT = 0.3;

// Soft preferences extracted from the session filter blob — the fields
// PetService.List can't hard-filter on, used only to nudge the ranking.
export type RecommendPreferences = {
  ageGroup?: PetsV1.PetAgeGroup;
};

export type ScoredPet = {
  pet: Pet;
  score: number;
};

// Rank a candidate set, returning the SAME pets annotated with a score,
// sorted by descending score (ties break on petId for determinism).
export function scoreCandidates(
  candidates: ReadonlyArray<Pet>,
  preferences: RecommendPreferences
): ReadonlyArray<ScoredPet> {
  if (candidates.length === 0) {
    return [];
  }

  const timestamps = candidates
    .map(pet => availableSinceMs(pet))
    .filter((ms): ms is number => ms !== undefined);

  // Range for recency normalisation. When every candidate shares one
  // timestamp (or none has one) recency carries no signal — collapse it
  // so the other axes decide the order.
  const newest = timestamps.length > 0 ? Math.max(...timestamps) : undefined;
  const oldest = timestamps.length > 0 ? Math.min(...timestamps) : undefined;

  const scored = candidates.map(pet => ({
    pet,
    score: scorePet(pet, preferences, newest, oldest),
  }));

  return [...scored].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.pet.petId < b.pet.petId ? -1 : a.pet.petId > b.pet.petId ? 1 : 0;
  });
}

function scorePet(
  pet: Pet,
  preferences: RecommendPreferences,
  newest: number | undefined,
  oldest: number | undefined
): number {
  const recency = recencyScore(pet, newest, oldest);
  const promotion = pet.featured || pet.priorityListing ? 1 : 0;
  const preference = preferenceScore(pet, preferences);

  const raw =
    recency * RECENCY_WEIGHT + promotion * PROMOTION_WEIGHT + preference * PREFERENCE_WEIGHT;

  // Clamp defensively — the blend is already in range but floating-point
  // drift shouldn't ever push a candidate outside [0, 1].
  return Math.min(1, Math.max(0, raw));
}

function recencyScore(pet: Pet, newest: number | undefined, oldest: number | undefined): number {
  if (newest === undefined || oldest === undefined || newest === oldest) {
    return 0;
  }
  const ms = availableSinceMs(pet);
  if (ms === undefined) {
    return 0;
  }
  return (ms - oldest) / (newest - oldest);
}

function preferenceScore(pet: Pet, preferences: RecommendPreferences): number {
  if (
    preferences.ageGroup === undefined ||
    preferences.ageGroup === PetsV1.PetAgeGroup.PET_AGE_GROUP_UNSPECIFIED
  ) {
    return 1;
  }
  return pet.ageGroup === preferences.ageGroup ? 1 : 0;
}

function availableSinceMs(pet: Pet): number | undefined {
  if (pet.availableSince === undefined || pet.availableSince === '') {
    return undefined;
  }
  const ms = Date.parse(pet.availableSince);
  return Number.isNaN(ms) ? undefined : ms;
}
