import { AdopterContext, MatchScorer, PetContext, ScoreResult } from '../types';

/**
 * Collaborative-filtering scorer driven by the existing
 * `user_preferences` table (populated by swipe.service on every
 * like / pass). For each pet we compute a normalised affinity over
 * the dimensions the adopter has expressed implicit signal on.
 *
 * Cold-start: when `inferred_prefs.total_likes === 0` the scorer
 * returns 50 (neutral) so the blend collapses to the rule scorer
 * without producing a misleading zero.
 *
 * The adopter context carries `inferred_prefs` (cached projection)
 * so this scorer is pure — no DB hit per pet.
 */

const normalise = (raw: Record<string, number> | undefined, key: string): number => {
  if (!raw) return 0;
  const total = Object.values(raw).reduce((sum, v) => sum + Math.max(0, v), 0);
  if (total === 0) return 0;
  const v = Math.max(0, raw[key] ?? 0);
  return v / total;
};

export class CfScorer implements MatchScorer {
  readonly name = 'cf' as const;

  async score(adopter: AdopterContext, pet: PetContext): Promise<ScoreResult> {
    const inferred = adopter.inferredPrefs;
    if (!inferred.total_likes || inferred.total_likes === 0) {
      return { score: 50, reasons: [] };
    }

    const typeAffinity = normalise(inferred.liked_types, pet.type);
    const sizeAffinity = normalise(inferred.liked_sizes, pet.size);
    const ageAffinity = normalise(inferred.liked_age_groups, pet.ageGroup);
    const breedAffinity = pet.breedId ? normalise(inferred.liked_breeds, pet.breedId) : 0;

    // Weighted blend across dimensions, scaled to 0..100. Type and
    // breed carry the most signal (people repeatedly like the same
    // breeds), size and age contribute secondary tie-breakers.
    const weighted =
      typeAffinity * 0.35 + breedAffinity * 0.35 + sizeAffinity * 0.15 + ageAffinity * 0.15;

    return {
      score: Math.round(Math.min(1, weighted) * 100),
      reasons: [],
    };
  }
}
