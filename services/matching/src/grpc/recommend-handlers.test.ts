import { describe, expect, it, vi } from 'vitest';

import {
  PetsV1,
  type ListPetsResponse,
  type Pet,
  type RecommendRequest,
  type SearchPetsRequest,
} from '@adopt-dont-shop/proto';

import type { HandlerDeps } from './adapter.js';
import type { PetsClient } from './pets-client.js';
import { makeRecommend, makeSearchPets } from './recommend-handlers.js';

function makePrincipal(
  overrides: Partial<{ userId: string; permissions: string[]; roles: string[] }> = {}
) {
  return {
    userId: overrides.userId ?? 'usr-1',
    roles: overrides.roles ?? ['adopter'],
    permissions: overrides.permissions ?? ['pets.read'],
    rescueId: undefined,
  } as unknown as Parameters<ReturnType<typeof makeRecommend>>[1];
}

// SearchPets is a stateless read — deps are unused, so an empty object
// suffices. Recommend reads the caller's swipe history from deps.pool to
// exclude already-swiped pets; tests that exercise that inject a pool
// stub via depsWithSwipes().
const deps = {} as unknown as HandlerDeps;

// Build a deps whose pool returns the given already-swiped pet_ids from
// the swipe-history exclusion query. DISTINCT pet_id is the contract —
// the stub returns whatever rows the test supplies.
function depsWithSwipes(petIds: string[]): HandlerDeps {
  const query = vi.fn().mockResolvedValue({ rows: petIds.map(pet_id => ({ pet_id })) });
  return { pool: { query } } as unknown as HandlerDeps;
}

// Default deps for Recommend tests that don't care about swipe history —
// the exclusion query returns no rows (user has swiped nothing).
const recommendDeps = depsWithSwipes([]);

function makePetsClient(listPets: ReturnType<typeof vi.fn>): PetsClient {
  return { listPets, close: vi.fn() } as unknown as PetsClient;
}

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

function listResponse(pets: Pet[], nextCursor?: string): ListPetsResponse {
  return nextCursor === undefined ? { pets } : { pets, nextCursor };
}

describe('makeRecommend', () => {
  it('throws PERMISSION_DENIED without pets.read', async () => {
    const recommend = makeRecommend(makePetsClient(vi.fn()));
    await expect(
      recommend(deps, makePrincipal({ permissions: [] }), {
        sessionId: 's-1',
        limit: 10,
      } as RecommendRequest)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('fetches available pets, ranks them, returns top-K candidates with scores', async () => {
    const listPets = vi
      .fn()
      .mockResolvedValue(
        listResponse([
          makePet({ petId: 'old', rescueId: 'rsc-1', availableSince: '2026-01-01T00:00:00.000Z' }),
          makePet({ petId: 'new', rescueId: 'rsc-1', availableSince: '2026-06-01T00:00:00.000Z' }),
        ])
      );
    const recommend = makeRecommend(makePetsClient(listPets));

    const res = await recommend(recommendDeps, makePrincipal(), { sessionId: 's-1', limit: 1 });

    // Only the available status is requested from service.pets.
    const listReq = listPets.mock.calls[0][0];
    expect(listReq.statusFilter).toBe(PetsV1.PetStatus.PET_STATUS_AVAILABLE);
    // Top-K honoured.
    expect(res.candidates).toHaveLength(1);
    // The fresher pet ranks first.
    expect(res.candidates[0].petId).toBe('new');
    expect(res.candidates[0].score).toBeGreaterThanOrEqual(0);
    expect(res.candidates[0].score).toBeLessThanOrEqual(1);
  });

  it('forwards the caller identity to service.pets as metadata', async () => {
    const listPets = vi.fn().mockResolvedValue(listResponse([]));
    const recommend = makeRecommend(makePetsClient(listPets));

    await recommend(recommendDeps, makePrincipal({ userId: 'usr-9' }), {
      sessionId: 's-1',
      limit: 10,
    });

    const metadata = listPets.mock.calls[0][1];
    expect(metadata.get('x-user-id')).toEqual(['usr-9']);
  });

  it('translates a species filter override into the pets type filter', async () => {
    const listPets = vi.fn().mockResolvedValue(listResponse([]));
    const recommend = makeRecommend(makePetsClient(listPets));

    await recommend(recommendDeps, makePrincipal(), {
      sessionId: 's-1',
      limit: 10,
      filtersJsonOverride: '{"species":"cat"}',
    });

    expect(listPets.mock.calls[0][0].typeFilter).toBe(PetsV1.PetType.PET_TYPE_CAT);
  });

  it('reports exhausted when the candidate pool does not exceed the limit', async () => {
    const listPets = vi
      .fn()
      .mockResolvedValue(listResponse([makePet({ petId: 'a', rescueId: 'rsc-1' })]));
    const recommend = makeRecommend(makePetsClient(listPets));

    const res = await recommend(recommendDeps, makePrincipal(), { sessionId: 's-1', limit: 10 });
    expect(res.exhausted).toBe(true);
  });

  it('throws INVALID_ARGUMENT on malformed filters override', async () => {
    const recommend = makeRecommend(makePetsClient(vi.fn()));
    await expect(
      recommend(recommendDeps, makePrincipal(), {
        sessionId: 's-1',
        limit: 10,
        filtersJsonOverride: 'not-json',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('maps a pets PERMISSION_DENIED (grpc code 7) onto PERMISSION_DENIED', async () => {
    const listPets = vi.fn().mockRejectedValue({ code: 7 });
    const recommend = makeRecommend(makePetsClient(listPets));
    await expect(
      recommend(recommendDeps, makePrincipal(), { sessionId: 's-1', limit: 10 })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('maps an unexpected pets error onto INTERNAL', async () => {
    const listPets = vi.fn().mockRejectedValue(new Error('boom'));
    const recommend = makeRecommend(makePetsClient(listPets));
    await expect(
      recommend(recommendDeps, makePrincipal(), { sessionId: 's-1', limit: 10 })
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('excludes a pet the user has already swiped, deduping repeat swipe rows', async () => {
    // Append-only history: the user swiped 'seen' THREE times (product
    // decision keeps every row). The exclusion read must dedupe by
    // pet so 'seen' is filtered out exactly once and never leaks back
    // into the candidate set.
    const listPets = vi
      .fn()
      .mockResolvedValue(
        listResponse([
          makePet({ petId: 'seen', rescueId: 'rsc-1' }),
          makePet({ petId: 'fresh', rescueId: 'rsc-1' }),
        ])
      );
    const recommend = makeRecommend(makePetsClient(listPets));
    // DISTINCT pet_id query returns 'seen' once even though it was
    // swiped three times.
    const deps3 = depsWithSwipes(['seen']);

    const res = await recommend(deps3, makePrincipal(), { sessionId: 's-1', limit: 10 });

    const ids = res.candidates.map(c => c.petId);
    expect(ids).toContain('fresh');
    expect(ids).not.toContain('seen');
  });

  it('scopes the swipe-history exclusion query to the calling user', async () => {
    const listPets = vi
      .fn()
      .mockResolvedValue(listResponse([makePet({ petId: 'fresh', rescueId: 'rsc-1' })]));
    const recommend = makeRecommend(makePetsClient(listPets));
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const depsUser = { pool: { query } } as unknown as HandlerDeps;

    await recommend(depsUser, makePrincipal({ userId: 'usr-42' }), {
      sessionId: 's-1',
      limit: 10,
    });

    // The exclusion query is parameterised on the caller's userId.
    expect(query.mock.calls[0][1]).toContain('usr-42');
  });
});

describe('makeSearchPets', () => {
  it('throws PERMISSION_DENIED without pets.read', async () => {
    const searchPets = makeSearchPets(makePetsClient(vi.fn()));
    await expect(
      searchPets(deps, makePrincipal({ permissions: [] }), {
        limit: 10,
      } as SearchPetsRequest)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('returns search results as candidates with no recommender score', async () => {
    const listPets = vi.fn().mockResolvedValue(
      listResponse([
        makePet({
          petId: 'p-1',
          name: 'Bella',
          rescueId: 'rsc-1',
          type: PetsV1.PetType.PET_TYPE_CAT,
          ageYears: 2,
          shortDescription: 'A lovely cat',
        }),
      ])
    );
    const searchPets = makeSearchPets(makePetsClient(listPets));

    const res = await searchPets(deps, makePrincipal(), { limit: 10 });

    expect(res.results).toHaveLength(1);
    expect(res.results[0]).toMatchObject({
      petId: 'p-1',
      name: 'Bella',
      species: 'cat',
      rescueId: 'rsc-1',
      age: '2y',
      shortDescription: 'A lovely cat',
      score: 0,
    });
  });

  it('forwards the pets keyset cursor verbatim on both directions', async () => {
    const listPets = vi
      .fn()
      .mockResolvedValue(
        listResponse([makePet({ petId: 'p-1', rescueId: 'rsc-1' })], 'CURSOR_OUT')
      );
    const searchPets = makeSearchPets(makePetsClient(listPets));

    const res = await searchPets(deps, makePrincipal(), { limit: 10, cursor: 'CURSOR_IN' });

    expect(listPets.mock.calls[0][0].cursor).toBe('CURSOR_IN');
    expect(res.nextCursor).toBe('CURSOR_OUT');
  });

  it('translates species + size filters into the pets list filters', async () => {
    const listPets = vi.fn().mockResolvedValue(listResponse([]));
    const searchPets = makeSearchPets(makePetsClient(listPets));

    await searchPets(deps, makePrincipal(), {
      limit: 10,
      filtersJson: '{"species":"dog","size":"large"}',
    });

    const listReq = listPets.mock.calls[0][0];
    expect(listReq.typeFilter).toBe(PetsV1.PetType.PET_TYPE_DOG);
    expect(listReq.sizeFilter).toBe(PetsV1.PetSize.PET_SIZE_LARGE);
  });

  it('throws INVALID_ARGUMENT when filters is a JSON array, not an object', async () => {
    const searchPets = makeSearchPets(makePetsClient(vi.fn()));
    await expect(
      searchPets(deps, makePrincipal(), { limit: 10, filtersJson: '[1,2]' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});
