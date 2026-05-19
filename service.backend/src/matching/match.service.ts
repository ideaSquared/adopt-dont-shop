import AdopterMatchProfile from '../models/AdopterMatchProfile';
import Pet from '../models/Pet';
import User from '../models/User';
import { logger } from '../utils/logger';
import { buildMixHash, readCached, writeCached } from './cache';
import { blendScores, runScorers } from './blend';
import { getActiveScorerNames, loadMatchConfig, MatchConfig } from './config';
import { CfScorer } from './scorers/cf.scorer';
import { EmbeddingScorer } from './scorers/embedding.scorer';
import { LlmScorer } from './scorers/llm.scorer';
import { RuleScorer } from './scorers/rule.scorer';
import { AdopterContext, MatchScorer, PetContext, ScoredPet, ScorerName } from './types';

/**
 * Public facade for the matching module.
 *
 * Responsibilities:
 *   - Hydrate adopter + pet contexts.
 *   - Skip everything when MATCH_ENABLED=false (returns input order
 *     unchanged so callers can wrap legacy paths safely).
 *   - Dispatch only the scorers with non-zero blend weight.
 *   - Cache the blended result per (user, pet, blend-hash) for the
 *     configured TTL.
 *   - Return ScoredPet[] sorted by descending score.
 */

const SCORERS: Record<ScorerName, MatchScorer> = {
  rule: new RuleScorer(),
  cf: new CfScorer(),
  embedding: new EmbeddingScorer(),
  llm: new LlmScorer(),
};

const extractPoint = (loc: unknown): { lng: number; lat: number } | null => {
  if (!loc || typeof loc !== 'object') return null;
  const maybe = loc as { type?: string; coordinates?: unknown };
  if (maybe.type !== 'Point' || !Array.isArray(maybe.coordinates)) return null;
  const [lng, lat] = maybe.coordinates as [unknown, unknown];
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;
  return { lng, lat };
};

export class MatchService {
  private config: MatchConfig;

  constructor(config?: MatchConfig) {
    this.config = config ?? loadMatchConfig();
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Rank a candidate set for an adopter. If matching is disabled,
   * returns the input order with score 0. Errors fall back to input
   * order — discovery degradation must never page someone.
   */
  async rankPets(userId: string, pets: Pet[]): Promise<ScoredPet[]> {
    if (!this.config.enabled || pets.length === 0) {
      logger.info('match.rankPets skipped', {
        userId,
        reason: !this.config.enabled ? 'MATCH_ENABLED=false' : 'no candidate pets',
        candidateCount: pets.length,
      });
      return pets.map(p => ({ petId: p.petId, score: 0, reasons: [] }));
    }

    const startedAt = Date.now();
    try {
      const adopter = await this.loadAdopterContext(userId);
      const activeScorers = getActiveScorerNames(this.config).map(name => SCORERS[name]);
      if (activeScorers.length === 0) {
        logger.warn('match.rankPets has no active scorers — all blend weights 0', {
          userId,
          blend: this.config.blend,
        });
        return pets.map(p => ({ petId: p.petId, score: 0, reasons: [] }));
      }

      const mixHash = buildMixHash(this.config.blend);
      const results = await Promise.all(
        pets.map(pet => this.scoreOne(adopter, pet, activeScorers, mixHash))
      );

      const sorted = results.sort((a, b) => b.score - a.score);
      logger.info('match.rankPets', {
        userId,
        candidateCount: pets.length,
        scorers: activeScorers.map(s => s.name),
        blend: this.config.blend,
        topScores: sorted.slice(0, 5).map(s => ({ petId: s.petId, score: s.score })),
        durationMs: Date.now() - startedAt,
      });
      return sorted;
    } catch (err) {
      logger.warn('match.rankPets failed — falling back to input order', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return pets.map(p => ({ petId: p.petId, score: 0, reasons: [] }));
    }
  }

  private async scoreOne(
    adopter: AdopterContext,
    pet: Pet,
    scorers: MatchScorer[],
    mixHash: string
  ): Promise<ScoredPet> {
    const cached = await readCached(adopter.userId, pet.petId, mixHash);
    if (cached) {
      return { petId: pet.petId, score: cached.score, reasons: cached.reasons };
    }

    const petCtx = this.toPetContext(pet);
    const perScorer = await runScorers(scorers, adopter, petCtx);
    const blended = blendScores(perScorer, this.config);

    await writeCached(adopter.userId, pet.petId, mixHash, blended, this.config.cacheTtlSeconds);

    return { petId: pet.petId, score: blended.score, reasons: blended.reasons };
  }

  async loadAdopterContext(userId: string): Promise<AdopterContext> {
    const [profile, user] = await Promise.all([
      AdopterMatchProfile.findByPk(userId),
      User.findByPk(userId, { attributes: ['user_id', 'location'] }),
    ]);

    const location = user
      ? extractPoint((user as unknown as { location?: unknown }).location)
      : null;

    if (!profile) {
      return {
        userId,
        preferredTypes: null,
        preferredSizes: null,
        preferredAgeGroups: null,
        preferredEnergy: null,
        preferredTemperament: null,
        lifestyle: {},
        maxDistanceKm: null,
        openToSpecialNeeds: false,
        inferredPrefs: {},
        location,
      };
    }

    return {
      userId,
      preferredTypes: profile.preferred_types,
      preferredSizes: profile.preferred_sizes,
      preferredAgeGroups: profile.preferred_age_groups,
      preferredEnergy: profile.preferred_energy,
      preferredTemperament: profile.preferred_temperament,
      lifestyle: profile.lifestyle ?? {},
      maxDistanceKm: profile.max_distance_km,
      openToSpecialNeeds: profile.open_to_special_needs,
      inferredPrefs: profile.inferred_prefs ?? {},
      location,
    };
  }

  private toPetContext(pet: Pet): PetContext {
    return {
      petId: pet.petId,
      type: pet.type,
      breedId: pet.breedId ?? null,
      size: pet.size,
      ageGroup: pet.ageGroup,
      gender: pet.gender,
      energyLevel: pet.energyLevel,
      temperament: pet.temperament ?? [],
      specialNeeds: pet.specialNeeds,
      goodWithChildren: pet.goodWithChildren ?? null,
      goodWithDogs: pet.goodWithDogs ?? null,
      goodWithCats: pet.goodWithCats ?? null,
      goodWithSmallAnimals: pet.goodWithSmallAnimals ?? null,
      createdAt: (pet as unknown as { created_at?: Date }).created_at ?? new Date(),
      location: extractPoint((pet as unknown as { location?: unknown }).location),
    };
  }
}

export const matchService = new MatchService();
