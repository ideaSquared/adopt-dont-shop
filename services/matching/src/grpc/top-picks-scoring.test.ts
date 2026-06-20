import { describe, expect, it } from 'vitest';

import { PetsV1, type Pet } from '@adopt-dont-shop/proto';

import { scoreTopPicks, type TopPickPreferences } from './top-picks-scoring.js';

// Minimal Pet factory — only the fields the scorer reads matter; the
// rest take harmless defaults.
function makePet(overrides: Partial<Pet> & { petId: string }): Pet {
  return {
    name: 'Rex',
    type: PetsV1.PetType.PET_TYPE_DOG,
    status: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
    gender: PetsV1.PetGender.PET_GENDER_UNSPECIFIED,
    size: PetsV1.PetSize.PET_SIZE_MEDIUM,
    ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
    archived: false,
    featured: false,
    priorityListing: false,
    specialNeeds: false,
    houseTrained: false,
    temperamentJson: '[]',
    tagsJson: '[]',
    extraJson: '{}',
    viewCount: 0,
    favoriteCount: 0,
    applicationCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const NO_PREFERENCES: TopPickPreferences = {
  preferredTypes: new Set(),
  preferredSizes: new Set(),
  preferredAgeGroups: new Set(),
  lifestyle: {},
};

describe('scoreTopPicks', () => {
  it('returns an empty list for no candidates', () => {
    expect(scoreTopPicks([], NO_PREFERENCES)).toEqual([]);
  });

  it('produces scores within [0, 1] for every candidate', () => {
    const result = scoreTopPicks(
      [
        makePet({ petId: 'a', availableSince: '2026-06-01T00:00:00.000Z', featured: true }),
        makePet({ petId: 'b', availableSince: '2026-01-01T00:00:00.000Z' }),
      ],
      NO_PREFERENCES
    );
    for (const { score } of result) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('ranks a pet matching the stored type/size/age preferences above a non-matching one', () => {
    const when = '2026-03-01T00:00:00.000Z';
    const result = scoreTopPicks(
      [
        makePet({
          petId: 'mismatch',
          availableSince: when,
          type: PetsV1.PetType.PET_TYPE_CAT,
          size: PetsV1.PetSize.PET_SIZE_LARGE,
          ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_SENIOR,
        }),
        makePet({
          petId: 'match',
          availableSince: when,
          type: PetsV1.PetType.PET_TYPE_DOG,
          size: PetsV1.PetSize.PET_SIZE_SMALL,
          ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_BABY,
        }),
      ],
      {
        preferredTypes: new Set([PetsV1.PetType.PET_TYPE_DOG]),
        preferredSizes: new Set([PetsV1.PetSize.PET_SIZE_SMALL]),
        preferredAgeGroups: new Set([PetsV1.PetAgeGroup.PET_AGE_GROUP_BABY]),
        lifestyle: {},
      }
    );
    expect(result[0].pet.petId).toBe('match');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('attaches a pref_match reason chip only to pets matching a stored preference', () => {
    const when = '2026-03-01T00:00:00.000Z';
    const result = scoreTopPicks(
      [
        makePet({ petId: 'dog', availableSince: when, type: PetsV1.PetType.PET_TYPE_DOG }),
        makePet({ petId: 'cat', availableSince: when, type: PetsV1.PetType.PET_TYPE_CAT }),
      ],
      {
        preferredTypes: new Set([PetsV1.PetType.PET_TYPE_DOG]),
        preferredSizes: new Set(),
        preferredAgeGroups: new Set(),
        lifestyle: {},
      }
    );
    const byId = new Map(result.map(r => [r.pet.petId, r]));
    expect(byId.get('dog')?.reasons.some(r => r.kind === 'pref_match')).toBe(true);
    expect(byId.get('cat')?.reasons.some(r => r.kind === 'pref_match')).toBe(false);
  });

  it('never emits a pref_match chip when the adopter set no preferences', () => {
    const result = scoreTopPicks(
      [makePet({ petId: 'a', availableSince: '2026-03-01T00:00:00.000Z' })],
      NO_PREFERENCES
    );
    expect(result[0].reasons.some(r => r.kind === 'pref_match')).toBe(false);
  });

  it('attaches a lifestyle chip when a child-friendly pet meets a household with children', () => {
    const result = scoreTopPicks(
      [
        makePet({
          petId: 'kid-safe',
          availableSince: '2026-03-01T00:00:00.000Z',
          extraJson: JSON.stringify({ goodWithChildren: true }),
        }),
      ],
      { ...NO_PREFERENCES, lifestyle: { hasChildren: true } }
    );
    expect(result[0].reasons.some(r => r.kind === 'lifestyle')).toBe(true);
  });

  it('omits the lifestyle chip when the household has no children even if the pet is child-friendly', () => {
    const result = scoreTopPicks(
      [
        makePet({
          petId: 'kid-safe',
          availableSince: '2026-03-01T00:00:00.000Z',
          extraJson: JSON.stringify({ goodWithChildren: true }),
        }),
      ],
      { ...NO_PREFERENCES, lifestyle: { hasChildren: false } }
    );
    expect(result[0].reasons.some(r => r.kind === 'lifestyle')).toBe(false);
  });

  it('matches a dog-friendly pet against a household with dogs', () => {
    const result = scoreTopPicks(
      [
        makePet({
          petId: 'dog-ok',
          availableSince: '2026-03-01T00:00:00.000Z',
          extraJson: JSON.stringify({ goodWithDogs: true }),
        }),
      ],
      { ...NO_PREFERENCES, lifestyle: { hasOtherPets: true, otherPetsType: 'dogs' } }
    );
    expect(result[0].reasons.some(r => r.kind === 'lifestyle')).toBe(true);
  });

  it('attaches a fresh chip to the most recently available pet', () => {
    const result = scoreTopPicks(
      [
        makePet({ petId: 'old', availableSince: '2026-01-01T00:00:00.000Z' }),
        makePet({ petId: 'new', availableSince: '2026-06-01T00:00:00.000Z' }),
      ],
      NO_PREFERENCES
    );
    const byId = new Map(result.map(r => [r.pet.petId, r]));
    expect(byId.get('new')?.reasons.some(r => r.kind === 'fresh')).toBe(true);
    expect(byId.get('old')?.reasons.some(r => r.kind === 'fresh')).toBe(false);
  });

  it('boosts a featured pet over a plain one of equal recency and preference fit', () => {
    const when = '2026-03-01T00:00:00.000Z';
    const result = scoreTopPicks(
      [
        makePet({ petId: 'plain', availableSince: when }),
        makePet({ petId: 'promoted', availableSince: when, featured: true }),
      ],
      NO_PREFERENCES
    );
    expect(result[0].pet.petId).toBe('promoted');
  });

  it('breaks score ties deterministically on petId ascending', () => {
    const when = '2026-03-01T00:00:00.000Z';
    const result = scoreTopPicks(
      [
        makePet({ petId: 'z', availableSince: when }),
        makePet({ petId: 'a', availableSince: when }),
      ],
      NO_PREFERENCES
    );
    expect(result.map(r => r.pet.petId)).toEqual(['a', 'z']);
  });

  it('tolerates an unparseable extra_json without throwing', () => {
    const result = scoreTopPicks(
      [makePet({ petId: 'a', availableSince: '2026-03-01T00:00:00.000Z', extraJson: 'not json' })],
      { ...NO_PREFERENCES, lifestyle: { hasChildren: true } }
    );
    expect(result).toHaveLength(1);
    expect(result[0].reasons.some(r => r.kind === 'lifestyle')).toBe(false);
  });
});
