import { describe, expect, it } from 'vitest';
import { RuleScorer } from '../../matching/scorers/rule.scorer';
import { AdopterContext, PetContext } from '../../matching/types';
import { AgeGroup, EnergyLevel, Gender, PetType, Size } from '../../models/Pet';

const baseAdopter: AdopterContext = {
  userId: 'u1',
  preferredTypes: null,
  preferredSizes: null,
  preferredAgeGroups: null,
  preferredEnergy: null,
  preferredTemperament: null,
  lifestyle: {},
  maxDistanceKm: null,
  openToSpecialNeeds: false,
  inferredPrefs: {},
  location: null,
};

const basePet: PetContext = {
  petId: 'p1',
  type: PetType.DOG,
  breedId: 'b1',
  size: Size.MEDIUM,
  ageGroup: AgeGroup.YOUNG,
  gender: Gender.MALE,
  energyLevel: EnergyLevel.MEDIUM,
  temperament: ['playful'],
  specialNeeds: false,
  goodWithChildren: true,
  goodWithDogs: true,
  goodWithCats: null,
  goodWithSmallAnimals: null,
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  location: null,
};

describe('RuleScorer', () => {
  const scorer = new RuleScorer();

  it('returns 0 when pet has special needs and adopter opted out', async () => {
    const result = await scorer.score(baseAdopter, { ...basePet, specialNeeds: true });
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it('scores pet matching all explicit prefs higher than neutral', async () => {
    const adopter: AdopterContext = {
      ...baseAdopter,
      preferredTypes: ['dog'],
      preferredSizes: ['medium'],
      preferredEnergy: ['medium'],
    };
    const result = await scorer.score(adopter, basePet);
    expect(result.score).toBeGreaterThan(40);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.some(r => r.kind === 'pref_match')).toBe(true);
  });

  it('boosts pets created within the freshness window', async () => {
    const freshPet: PetContext = { ...basePet, createdAt: new Date() };
    const stalePet: PetContext = {
      ...basePet,
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    };
    const fresh = await scorer.score(baseAdopter, freshPet);
    const stale = await scorer.score(baseAdopter, stalePet);
    expect(fresh.score).toBeGreaterThan(stale.score);
    expect(fresh.reasons.some(r => r.kind === 'fresh')).toBe(true);
  });

  it('applies lifestyle bonus when adopter has children and pet is goodWithChildren', async () => {
    const adopter: AdopterContext = { ...baseAdopter, lifestyle: { has_children: true } };
    const result = await scorer.score(adopter, basePet);
    expect(result.reasons.some(r => r.kind === 'lifestyle')).toBe(true);
  });

  it('caps score at 100 and surfaces at most 3 reasons', async () => {
    const adopter: AdopterContext = {
      ...baseAdopter,
      preferredTypes: ['dog'],
      preferredSizes: ['medium'],
      preferredAgeGroups: ['young'],
      preferredEnergy: ['medium'],
      preferredTemperament: ['playful'],
      lifestyle: { has_children: true, has_other_pets: true },
    };
    const result = await scorer.score(adopter, { ...basePet, createdAt: new Date() });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.reasons.length).toBeLessThanOrEqual(3);
  });
});
