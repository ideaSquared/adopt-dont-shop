import { describe, expect, it } from 'vitest';
import { CfScorer } from '../../matching/scorers/cf.scorer';
import { AdopterContext, PetContext } from '../../matching/types';
import { AgeGroup, EnergyLevel, Gender, PetType, Size } from '../../models/Pet';

const adopter = (inferred: AdopterContext['inferredPrefs']): AdopterContext => ({
  userId: 'u1',
  preferredTypes: null,
  preferredSizes: null,
  preferredAgeGroups: null,
  preferredEnergy: null,
  preferredTemperament: null,
  lifestyle: {},
  maxDistanceKm: null,
  openToSpecialNeeds: false,
  inferredPrefs: inferred,
  location: null,
});

const pet: PetContext = {
  petId: 'p1',
  type: PetType.DOG,
  breedId: 'b1',
  size: Size.MEDIUM,
  ageGroup: AgeGroup.YOUNG,
  gender: Gender.MALE,
  energyLevel: EnergyLevel.MEDIUM,
  temperament: [],
  specialNeeds: false,
  goodWithChildren: null,
  goodWithDogs: null,
  goodWithCats: null,
  goodWithSmallAnimals: null,
  createdAt: new Date(),
  location: null,
};

describe('CfScorer', () => {
  const scorer = new CfScorer();

  it('returns neutral 50 on cold start (no implicit signal yet)', async () => {
    const result = await scorer.score(adopter({}), pet);
    expect(result.score).toBe(50);
  });

  it('scores a pet matching liked dimensions higher than a pet that does not', async () => {
    const a = adopter({
      total_likes: 10,
      liked_types: { dog: 8, cat: 2 },
      liked_breeds: { b1: 6 },
      liked_sizes: { medium: 5 },
      liked_age_groups: { young: 5 },
    });
    const matchedScore = await scorer.score(a, pet);
    const unmatchedPet: PetContext = {
      ...pet,
      type: PetType.CAT,
      breedId: 'b99',
      size: Size.LARGE,
      ageGroup: AgeGroup.SENIOR,
    };
    const unmatched = await scorer.score(a, unmatchedPet);
    expect(matchedScore.score).toBeGreaterThan(unmatched.score);
  });
});
