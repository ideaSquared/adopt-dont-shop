// Pure ranking for GetTopPicks — no I/O, fully unit-testable.
//
// Top picks differs from Recommend's swipe feed: it scores a candidate
// set against the adopter's STORED match profile (preferred types /
// sizes / age groups + lifestyle) rather than transient session filters,
// and attaches human-readable "reason chips" explaining each pick.
//
// score ∈ [0, 1] is a weighted blend of three signals:
//
//   1. Preference match (weight 0.5) — the share of the adopter's SET
//      preference dimensions (type / size / age group) the pet satisfies.
//      Dimensions the adopter left empty don't discriminate; when the
//      adopter set NO preferences at all the axis collapses to 1.0.
//
//   2. Recency (weight 0.3) — freshly-listed pets surface first.
//      Normalised linearly against the freshest availableSince in the
//      set (newest 1.0, oldest 0.0); unknown freshness scores 0.
//
//   3. Promotion (weight 0.2) — the rescue's `featured` / priorityListing
//      boost flags.
//
// Lifestyle does NOT carry its own scoring weight — household fit is a
// soft, presentational signal surfaced only as a reason chip, never a
// rank multiplier (a child-friendly pet shouldn't outrank a better
// preference match just because the adopter has kids).
//
// Weights sum to 1.0 so the blend stays within [0, 1].

import { PetsV1, type Pet } from '@adopt-dont-shop/proto';

const PREF_MATCH_WEIGHT = 0.5;
const RECENCY_WEIGHT = 0.3;
const PROMOTION_WEIGHT = 0.2;

// A recency component at or above this surfaces the "fresh" chip.
const FRESH_CHIP_THRESHOLD = 0.8;

// The adopter's stored match profile, pre-mapped to proto enums by the
// handler. Empty sets mean "no preference on this dimension".
export type TopPickPreferences = {
  preferredTypes: ReadonlySet<PetsV1.PetType>;
  preferredSizes: ReadonlySet<PetsV1.PetSize>;
  preferredAgeGroups: ReadonlySet<PetsV1.PetAgeGroup>;
  lifestyle: {
    hasChildren?: boolean;
    hasOtherPets?: boolean;
    otherPetsType?: 'none' | 'dogs' | 'cats' | 'mixed';
  };
};

export type TopPickReason = {
  kind: string;
  label: string;
};

export type ScoredTopPick = {
  pet: Pet;
  score: number;
  reasons: ReadonlyArray<TopPickReason>;
};

export function scoreTopPicks(
  candidates: ReadonlyArray<Pet>,
  preferences: TopPickPreferences
): ReadonlyArray<ScoredTopPick> {
  if (candidates.length === 0) {
    return [];
  }

  const timestamps = candidates
    .map(pet => availableSinceMs(pet))
    .filter((ms): ms is number => ms !== undefined);
  const newest = timestamps.length > 0 ? Math.max(...timestamps) : undefined;
  const oldest = timestamps.length > 0 ? Math.min(...timestamps) : undefined;

  const scored = candidates.map(pet => {
    const recency = recencyScore(pet, newest, oldest);
    const prefMatch = preferenceMatchScore(pet, preferences);
    const promotion = pet.featured || pet.priorityListing ? 1 : 0;

    const raw =
      prefMatch.score * PREF_MATCH_WEIGHT + recency * RECENCY_WEIGHT + promotion * PROMOTION_WEIGHT;
    const score = Math.min(1, Math.max(0, raw));

    return { pet, score, reasons: buildReasons(pet, preferences, prefMatch.matched, recency) };
  });

  return [...scored].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.pet.petId < b.pet.petId ? -1 : a.pet.petId > b.pet.petId ? 1 : 0;
  });
}

type PreferenceMatch = {
  // Mean satisfaction across the SET dimensions (1.0 when none set).
  score: number;
  // True when at least one set dimension was satisfied.
  matched: boolean;
};

function preferenceMatchScore(pet: Pet, preferences: TopPickPreferences): PreferenceMatch {
  const dimensions: boolean[] = [];
  if (preferences.preferredTypes.size > 0) {
    dimensions.push(preferences.preferredTypes.has(pet.type));
  }
  if (preferences.preferredSizes.size > 0) {
    dimensions.push(preferences.preferredSizes.has(pet.size));
  }
  if (preferences.preferredAgeGroups.size > 0) {
    dimensions.push(preferences.preferredAgeGroups.has(pet.ageGroup));
  }

  if (dimensions.length === 0) {
    return { score: 1, matched: false };
  }
  const hits = dimensions.filter(Boolean).length;
  return { score: hits / dimensions.length, matched: hits > 0 };
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

function buildReasons(
  pet: Pet,
  preferences: TopPickPreferences,
  prefMatched: boolean,
  recency: number
): ReadonlyArray<TopPickReason> {
  const reasons: TopPickReason[] = [];
  if (prefMatched) {
    reasons.push({ kind: 'pref_match', label: 'Matches your preferences' });
  }
  const lifestyle = lifestyleReason(pet, preferences.lifestyle);
  if (lifestyle !== undefined) {
    reasons.push(lifestyle);
  }
  if (recency >= FRESH_CHIP_THRESHOLD) {
    reasons.push({ kind: 'fresh', label: 'Newly added' });
  }
  return reasons;
}

// Cross-reference the pet's good_with_* flags (carried in extra_json)
// against the adopter's household. Returns the single most relevant
// household-fit chip, or undefined when nothing lines up.
function lifestyleReason(
  pet: Pet,
  lifestyle: TopPickPreferences['lifestyle']
): TopPickReason | undefined {
  const extra = parseExtra(pet.extraJson);

  if (lifestyle.hasChildren === true && extra.goodWithChildren === true) {
    return { kind: 'lifestyle', label: 'Good with children' };
  }
  if (lifestyle.hasOtherPets === true) {
    if (lifestyle.otherPetsType === 'dogs' && extra.goodWithDogs === true) {
      return { kind: 'lifestyle', label: 'Good with dogs' };
    }
    if (lifestyle.otherPetsType === 'cats' && extra.goodWithCats === true) {
      return { kind: 'lifestyle', label: 'Good with cats' };
    }
    if (
      lifestyle.otherPetsType === 'mixed' &&
      (extra.goodWithDogs === true || extra.goodWithCats === true)
    ) {
      return { kind: 'lifestyle', label: 'Good with other pets' };
    }
  }
  return undefined;
}

type ExtraFlags = {
  goodWithChildren?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
};

function parseExtra(extraJson: string | undefined): ExtraFlags {
  if (extraJson === undefined || extraJson === '') {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(extraJson);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {};
  }
  return {
    goodWithChildren: readBool(parsed, 'goodWithChildren'),
    goodWithDogs: readBool(parsed, 'goodWithDogs'),
    goodWithCats: readBool(parsed, 'goodWithCats'),
  };
}

function readBool(obj: object, key: string): boolean | undefined {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) {
    return undefined;
  }
  const value = Object.getOwnPropertyDescriptor(obj, key)?.value;
  return typeof value === 'boolean' ? value : undefined;
}

function availableSinceMs(pet: Pet): number | undefined {
  if (pet.availableSince === undefined || pet.availableSince === '') {
    return undefined;
  }
  const ms = Date.parse(pet.availableSince);
  return Number.isNaN(ms) ? undefined : ms;
}
