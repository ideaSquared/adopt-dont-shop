import { describe, expect, it } from 'vitest';

import { PetsV1, type Pet } from '@adopt-dont-shop/proto';

import { scoreCandidates } from './recommend-scoring.js';

// Minimal Pet factory — only the fields the scorer reads matter; the
// rest take harmless defaults.
function makePet(overrides: Partial<Pet> & { petId: string }): Pet {
  return {
    name: 'Rex',
    type: PetsV1.PetType.PET_TYPE_DOG,
    status: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
    gender: PetsV1.PetGender.PET_GENDER_UNSPECIFIED,
    size: PetsV1.PetSize.PET_SIZE_UNSPECIFIED,
    ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_UNSPECIFIED,
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

describe('scoreCandidates', () => {
  it('returns an empty list for no candidates', () => {
    expect(scoreCandidates([], {})).toEqual([]);
  });

  it('produces scores within [0, 1] for every candidate', () => {
    const result = scoreCandidates(
      [
        makePet({ petId: 'a', availableSince: '2026-06-01T00:00:00.000Z', featured: true }),
        makePet({ petId: 'b', availableSince: '2026-01-01T00:00:00.000Z' }),
      ],
      {}
    );
    for (const { score } of result) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('ranks a more recently available pet above an older one', () => {
    const result = scoreCandidates(
      [
        makePet({ petId: 'old', availableSince: '2026-01-01T00:00:00.000Z' }),
        makePet({ petId: 'new', availableSince: '2026-06-01T00:00:00.000Z' }),
      ],
      {}
    );
    expect(result[0].pet.petId).toBe('new');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('boosts a featured pet over a non-featured one of equal recency', () => {
    const when = '2026-03-01T00:00:00.000Z';
    const result = scoreCandidates(
      [
        makePet({ petId: 'plain', availableSince: when }),
        makePet({ petId: 'promoted', availableSince: when, featured: true }),
      ],
      {}
    );
    expect(result[0].pet.petId).toBe('promoted');
  });

  it('treats priorityListing the same as featured for promotion', () => {
    const when = '2026-03-01T00:00:00.000Z';
    const result = scoreCandidates(
      [
        makePet({ petId: 'plain', availableSince: when }),
        makePet({ petId: 'priority', availableSince: when, priorityListing: true }),
      ],
      {}
    );
    expect(result[0].pet.petId).toBe('priority');
  });

  it('boosts a pet matching the soft ageGroup preference', () => {
    const when = '2026-03-01T00:00:00.000Z';
    const result = scoreCandidates(
      [
        makePet({
          petId: 'adult',
          availableSince: when,
          ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
        }),
        makePet({
          petId: 'baby',
          availableSince: when,
          ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_BABY,
        }),
      ],
      { ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_BABY }
    );
    expect(result[0].pet.petId).toBe('baby');
  });

  it('breaks score ties deterministically on petId', () => {
    // Identical pets — same recency, no promotion, no preference — so
    // scores tie and ordering must be stable on petId ascending.
    const when = '2026-03-01T00:00:00.000Z';
    const result = scoreCandidates(
      [
        makePet({ petId: 'z', availableSince: when }),
        makePet({ petId: 'a', availableSince: when }),
      ],
      {}
    );
    expect(result.map(r => r.pet.petId)).toEqual(['a', 'z']);
  });

  it('handles candidates with no availableSince without producing NaN', () => {
    const result = scoreCandidates(
      [makePet({ petId: 'a' }), makePet({ petId: 'b', featured: true })],
      {}
    );
    for (const { score } of result) {
      expect(Number.isNaN(score)).toBe(false);
    }
    // Promotion still discriminates when recency is unknown for all.
    expect(result[0].pet.petId).toBe('b');
  });
});
