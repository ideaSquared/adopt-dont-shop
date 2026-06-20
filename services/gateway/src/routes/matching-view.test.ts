import { describe, expect, it } from 'vitest';

import type {
  GetTopPicksResponse,
  PetCandidate,
  RecommendResponse,
  SearchPetsResponse,
} from '@adopt-dont-shop/proto';

import {
  petCandidateToView,
  recommendToQueue,
  searchToView,
  topPicksToView,
} from './matching-view.js';

function makeCandidate(overrides: Partial<PetCandidate> = {}): PetCandidate {
  return {
    petId: 'pet-1',
    name: 'Rex',
    species: 'dog',
    rescueId: 'rsc-1',
    score: 0.83,
    breed: 'Labrador',
    age: '3 years',
    shortDescription: 'Good boy',
    primaryImageUrl: '/uploads/pets/pet-1.jpg',
    ...overrides,
  } as PetCandidate;
}

describe('petCandidateToView', () => {
  it('maps camelCase to snake_case + includes the score by default', () => {
    expect(petCandidateToView(makeCandidate())).toEqual({
      pet_id: 'pet-1',
      name: 'Rex',
      rescue_id: 'rsc-1',
      type: 'dog',
      breed: 'Labrador',
      age: '3 years',
      short_description: 'Good boy',
      primary_image_url: '/uploads/pets/pet-1.jpg',
      score: 0.83,
    });
  });

  it('omits the score on plain search results', () => {
    const v = petCandidateToView(makeCandidate(), false);
    expect('score' in v).toBe(false);
  });

  it('omits optional fields when absent', () => {
    const v = petCandidateToView({
      petId: 'pet-2',
      name: 'Whiskers',
      species: 'cat',
      rescueId: 'rsc-1',
      score: 0,
    } as PetCandidate);
    expect(v).toMatchObject({ pet_id: 'pet-2', type: 'cat', score: 0 });
    expect('breed' in v).toBe(false);
    expect('primary_image_url' in v).toBe(false);
  });
});

describe('recommendToQueue', () => {
  it('builds the discovery queue envelope and inverts exhausted → hasMore', () => {
    const env = recommendToQueue({
      candidates: [makeCandidate(), makeCandidate({ petId: 'pet-2' })],
      exhausted: false,
    } as RecommendResponse);
    expect(env).toEqual({
      pets: [
        expect.objectContaining({ pet_id: 'pet-1', score: 0.83 }),
        expect.objectContaining({ pet_id: 'pet-2', score: 0.83 }),
      ],
      currentIndex: 0,
      hasMore: true,
      nextBatchSize: 20,
    });
  });

  it('reports hasMore false when exhausted', () => {
    const env = recommendToQueue({ candidates: [], exhausted: true } as RecommendResponse);
    expect(env.hasMore).toBe(false);
  });
});

describe('searchToView', () => {
  it('drops the score on search results and forwards next_cursor when present', () => {
    const env = searchToView({
      results: [makeCandidate()],
      nextCursor: 'cur-2',
    } as SearchPetsResponse);
    expect(env.next_cursor).toBe('cur-2');
    expect('score' in env.results[0]).toBe(false);
  });

  it('omits next_cursor when absent or empty', () => {
    const env = searchToView({ results: [], nextCursor: '' } as SearchPetsResponse);
    expect('next_cursor' in env).toBe(false);
  });
});

describe('topPicksToView', () => {
  it('maps proto TopPicks to the SPA MatchTopPick shape, preserving default fields', () => {
    const view = topPicksToView({
      picks: [
        {
          petId: 'pet-1',
          name: 'Bella',
          type: 'cat',
          ageGroup: 'baby',
          size: 'small',
          score: 0.74,
          reasons: [{ kind: 'pref_match', label: 'Matches your preferences' }],
          rescueName: 'Happy Tails',
        },
      ],
    } as GetTopPicksResponse);

    expect(view).toEqual([
      {
        petId: 'pet-1',
        name: 'Bella',
        type: 'cat',
        ageGroup: 'baby',
        size: 'small',
        score: 0.74,
        reasons: [{ kind: 'pref_match', label: 'Matches your preferences' }],
        rescueName: 'Happy Tails',
      },
    ]);
  });

  it('keeps zero score, empty rescue name and empty reasons rather than dropping them', () => {
    const view = topPicksToView({
      picks: [
        {
          petId: 'pet-2',
          name: 'Rex',
          type: 'dog',
          ageGroup: 'adult',
          size: 'medium',
          score: 0,
          reasons: [],
          rescueName: '',
        },
      ],
    } as GetTopPicksResponse);

    expect(view[0]).toMatchObject({ petId: 'pet-2', score: 0, rescueName: '', reasons: [] });
  });

  it('forwards breedName and photoUrl when present', () => {
    const view = topPicksToView({
      picks: [
        {
          petId: 'pet-3',
          name: 'Max',
          type: 'dog',
          ageGroup: 'young',
          size: 'large',
          score: 0.5,
          reasons: [],
          rescueName: 'Rescue',
          breedName: 'Labrador',
          photoUrl: '/uploads/pets/pet-3.jpg',
        },
      ],
    } as GetTopPicksResponse);

    expect(view[0]).toMatchObject({ breedName: 'Labrador', photoUrl: '/uploads/pets/pet-3.jpg' });
  });
});
