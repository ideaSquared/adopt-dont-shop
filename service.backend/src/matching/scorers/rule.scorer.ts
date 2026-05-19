import { AdopterContext, MatchScorer, PetContext, ReasonChip, ScoreResult } from '../types';

/**
 * Deterministic rule scorer. Sums weighted boolean checks against the
 * adopter's explicit preferences. Owns the reason chips surfaced to
 * the UI — other scorers contribute score only.
 *
 * Score breakdown (0..100):
 *   - type match           +25
 *   - size match           +12
 *   - age group match      +12
 *   - energy match         +10
 *   - temperament overlap  +10 (any 1+ tag)
 *   - lifestyle fit        +15 (children, other pets, hours alone)
 *   - distance ok          +10 (within max_distance_km)
 *   - special needs gate   -100 (hard fail when pet special-needs and
 *                                adopter opted out)
 *   - fresh listing bonus  +6  (<7d)
 *
 * Missing preferences are neutral, not negative — adopters who skip
 * the onboarding wizard still get sensible ordering driven by the
 * `fresh` bonus and other scorers in the blend.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const haversineKm = (a: { lng: number; lat: number }, b: { lng: number; lat: number }): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const lifestyleFitScore = (
  adopter: AdopterContext,
  pet: PetContext
): { score: number; chips: ReasonChip[] } => {
  const chips: ReasonChip[] = [];
  let score = 0;

  const { lifestyle } = adopter;

  if (lifestyle.has_children === true && pet.goodWithChildren === true) {
    score += 5;
    chips.push({ kind: 'lifestyle', label: 'Good with children' });
  } else if (lifestyle.has_children === true && pet.goodWithChildren === false) {
    score -= 10;
  }

  if (lifestyle.has_other_pets === true) {
    if (pet.goodWithDogs === true || pet.goodWithCats === true) {
      score += 5;
      chips.push({ kind: 'lifestyle', label: 'Good with other pets' });
    } else if (pet.goodWithDogs === false && pet.goodWithCats === false) {
      score -= 8;
    }
  }

  if (
    typeof lifestyle.hours_alone_daily === 'number' &&
    lifestyle.hours_alone_daily >= 8 &&
    (pet.energyLevel === 'high' || pet.energyLevel === 'very_high')
  ) {
    score -= 5;
  }

  return { score: Math.max(0, score), chips };
};

export class RuleScorer implements MatchScorer {
  readonly name = 'rule' as const;

  async score(adopter: AdopterContext, pet: PetContext): Promise<ScoreResult> {
    if (pet.specialNeeds && adopter.openToSpecialNeeds === false) {
      return { score: 0, reasons: [] };
    }

    let score = 0;
    const reasons: ReasonChip[] = [];

    if (adopter.preferredTypes && adopter.preferredTypes.includes(pet.type)) {
      score += 25;
      reasons.push({ kind: 'pref_match', label: `Your kind of ${pet.type}` });
    }

    if (adopter.preferredSizes && adopter.preferredSizes.includes(pet.size)) {
      score += 12;
      reasons.push({ kind: 'pref_match', label: 'Matches your size preference' });
    }

    if (adopter.preferredAgeGroups && adopter.preferredAgeGroups.includes(pet.ageGroup)) {
      score += 12;
    }

    if (adopter.preferredEnergy && adopter.preferredEnergy.includes(pet.energyLevel)) {
      score += 10;
      reasons.push({ kind: 'pref_match', label: 'Matches your energy level' });
    }

    if (
      adopter.preferredTemperament &&
      adopter.preferredTemperament.length > 0 &&
      pet.temperament.some(t => adopter.preferredTemperament!.includes(t))
    ) {
      score += 10;
    }

    const lifestyle = lifestyleFitScore(adopter, pet);
    score += lifestyle.score;
    reasons.push(...lifestyle.chips);

    if (adopter.location && pet.location && adopter.maxDistanceKm) {
      const km = haversineKm(adopter.location, pet.location);
      if (km <= adopter.maxDistanceKm) {
        score += 10;
        reasons.push({ kind: 'distance', label: `${Math.round(km)} km away` });
      } else {
        score -= 5;
      }
    }

    const ageMs = Date.now() - pet.createdAt.getTime();
    if (ageMs < 7 * DAY_MS) {
      score += 6;
      reasons.push({ kind: 'fresh', label: 'Newly listed' });
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      reasons: reasons.slice(0, 3),
    };
  }
}
