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

describe('makeRecommend distance', () => {
  const LONDON_FILTERS = JSON.stringify({ latitude: 51.5074, longitude: -0.1278 });
  const MANCHESTER = { latitude: 53.4808, longitude: -2.2426 };

  const recommendWith = async (
    filtersJsonOverride: string | undefined,
    rescueLocations: { getRescueLocations: ReturnType<typeof vi.fn> } | undefined
  ) => {
    const listPets = vi
      .fn()
      .mockResolvedValue(
        listResponse([
          makePet({ petId: 'p-1', rescueId: 'rsc-1' }),
          makePet({ petId: 'p-2', rescueId: 'rsc-2' }),
        ])
      );
    const recommend = makeRecommend(makePetsClient(listPets), rescueLocations);
    const res = await recommend(recommendDeps, makePrincipal(), {
      sessionId: 's-1',
      limit: 10,
      filtersJsonOverride,
    } as RecommendRequest);
    return new Map(res.candidates.map(c => [c.petId, c]));
  };

  it('adds miles from the caller to each pet whose rescue has coordinates', async () => {
    const getRescueLocations = vi.fn().mockResolvedValue(new Map([['rsc-1', MANCHESTER]]));

    const candidates = await recommendWith(LONDON_FILTERS, { getRescueLocations });

    // Optional lookup: short deadline, no retries, so it can't eat the
    // Recommend budget.
    expect(getRescueLocations).toHaveBeenCalledWith(['rsc-1', 'rsc-2'], {
      deadlineMs: 750,
      maxRetries: 0,
    });
    expect(candidates.get('p-1')?.distanceMiles).toBeGreaterThan(160);
    expect(candidates.get('p-1')?.distanceMiles).toBeLessThan(166);
    expect(candidates.get('p-2')?.distanceMiles).toBeUndefined();
  });

  it('skips the lookup when the caller sent no usable coordinates', async () => {
    const getRescueLocations = vi.fn();

    const none = await recommendWith(undefined, { getRescueLocations });
    const bad = await recommendWith(JSON.stringify({ latitude: 'x', longitude: 200 }), {
      getRescueLocations,
    });

    expect(getRescueLocations).not.toHaveBeenCalled();
    expect(none.get('p-1')?.distanceMiles).toBeUndefined();
    expect(bad.get('p-1')?.distanceMiles).toBeUndefined();
  });

  it('still returns the deck, without distances, when the rescue lookup fails', async () => {
    const getRescueLocations = vi.fn().mockRejectedValue(new Error('rescue down'));

    const candidates = await recommendWith(LONDON_FILTERS, { getRescueLocations });

    expect([...candidates.keys()].sort()).toEqual(['p-1', 'p-2']);
    expect(candidates.get('p-1')?.distanceMiles).toBeUndefined();
  });
});

describe('makeRecommend', () => {
  describe('activity label', () => {
    const recommendOne = async (pet: Pet) => {
      const listPets = vi.fn().mockResolvedValue(listResponse([pet]));
      const recommend = makeRecommend(makePetsClient(listPets));
      const res = await recommend(recommendDeps, makePrincipal(), {
        sessionId: 's-1',
        limit: 10,
      } as RecommendRequest);
      return res.candidates[0];
    };

    it('says how long a pet has been waiting once it passes a week', async () => {
      vi.useFakeTimers({ now: new Date('2026-11-01T12:00:00.000Z') });
      try {
        const candidate = await recommendOne(
          makePet({ petId: 'p-1', availableSince: '2026-08-03T00:00:00.000Z' })
        );
        expect(candidate.activityLabel).toEqual({
          kind: 'days_waiting',
          text: 'Waiting 90 days',
          icon: '🕒',
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it('shows no label for a recently listed pet or one without an available date', async () => {
      vi.useFakeTimers({ now: new Date('2026-11-01T12:00:00.000Z') });
      try {
        const recent = await recommendOne(
          makePet({ petId: 'p-1', availableSince: '2026-10-30T00:00:00.000Z' })
        );
        const undated = await recommendOne(makePet({ petId: 'p-2' }));
        expect(recent.activityLabel).toBeUndefined();
        expect(undated.activityLabel).toBeUndefined();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it('carries the swipe-card fields on each candidate', async () => {
    const listPets = vi.fn().mockResolvedValue(
      listResponse([
        makePet({
          petId: 'p-1',
          gender: PetsV1.PetGender.PET_GENDER_FEMALE,
          size: PetsV1.PetSize.PET_SIZE_SMALL,
          ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_YOUNG,
          ageYears: 2,
          ageMonths: 3,
          extraJson: JSON.stringify({
            breed: 'Beagle',
            image_urls: ['/a.jpg', '/b.jpg'],
          }),
        }),
      ])
    );
    const recommend = makeRecommend(makePetsClient(listPets));

    const res = await recommend(recommendDeps, makePrincipal(), {
      sessionId: 's-1',
      limit: 10,
    } as RecommendRequest);

    expect(res.candidates[0]).toMatchObject({
      gender: 'female',
      size: 'small',
      ageGroup: 'young',
      ageYears: 2,
      ageMonths: 3,
      breed: 'Beagle',
      images: ['/a.jpg', '/b.jpg'],
      primaryImageUrl: '/a.jpg',
    });
  });

  it('keeps only same-origin paths and https urls on the platform storage host', async () => {
    vi.stubEnv('CLOUDFRONT_DOMAIN', 'cdn.example');
    const listPets = vi.fn().mockResolvedValue(
      listResponse([
        makePet({
          petId: 'p-1',
          extraJson: JSON.stringify({
            image_urls: [
              '/ok.jpg',
              'http://cdn.example/a.jpg',
              'javascript:alert(1)',
              'https://evil.example/d.jpg',
              '//evil.example/b.jpg',
              'https://cdn.example/c.jpg',
            ],
            // Legacy key: image_urls is the single list, so this is ignored.
            images: ['/legacy.jpg'],
          }),
        }),
      ])
    );
    const recommend = makeRecommend(makePetsClient(listPets));

    const res = await recommend(recommendDeps, makePrincipal(), {
      sessionId: 's-1',
      limit: 10,
    } as RecommendRequest);

    expect(res.candidates[0].images).toEqual(['/ok.jpg', 'https://cdn.example/c.jpg']);
    vi.unstubAllEnvs();
  });

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

  it('paginates past the first page to surface fresh pets beyond it (ADS-1169)', async () => {
    // The whole first page is already swiped; the only fresh pet lives on
    // the second page. Before the fix the handler fetched a single page
    // and never saw it.
    const firstPage = Array.from({ length: 100 }, (_, i) =>
      makePet({ petId: `seen-${i}`, rescueId: 'rsc-1' })
    );
    const listPets = vi
      .fn()
      .mockResolvedValueOnce(listResponse(firstPage, 'CURSOR_1'))
      .mockResolvedValueOnce(listResponse([makePet({ petId: 'beyond', rescueId: 'rsc-1' })]));
    const recommend = makeRecommend(makePetsClient(listPets));
    const swipedAll = depsWithSwipes(firstPage.map(p => p.petId));

    const res = await recommend(swipedAll, makePrincipal(), { sessionId: 's-1', limit: 10 });

    expect(res.candidates.map(c => c.petId)).toContain('beyond');
    // The second page is fetched with the first page's keyset cursor.
    expect(listPets.mock.calls[1][0].cursor).toBe('CURSOR_1');
  });

  it('does not falsely report exhausted when adoptable pets remain past the first page (ADS-1169)', async () => {
    // First page: 95 already-swiped + 5 fresh, and a next cursor. Second
    // page: 50 more fresh pets. The old handler stopped at page one, saw
    // only 5 fresh, and reported exhausted; the fix drains the source.
    const firstPage = Array.from({ length: 100 }, (_, i) =>
      makePet({ petId: i < 95 ? `seen-${i}` : `fresh-a-${i}`, rescueId: 'rsc-1' })
    );
    const secondPage = Array.from({ length: 50 }, (_, i) =>
      makePet({ petId: `fresh-b-${i}`, rescueId: 'rsc-1' })
    );
    const listPets = vi
      .fn()
      .mockResolvedValueOnce(listResponse(firstPage, 'CURSOR_1'))
      .mockResolvedValueOnce(listResponse(secondPage));
    const recommend = makeRecommend(makePetsClient(listPets));
    const swiped = depsWithSwipes(firstPage.slice(0, 95).map(p => p.petId));

    const res = await recommend(swiped, makePrincipal(), { sessionId: 's-1', limit: 10 });

    expect(res.candidates).toHaveLength(10);
    expect(res.exhausted).toBe(false);
  });

  it('does not surface the same pet twice when it spans consecutive pages (ADS-1169)', async () => {
    // A pet appearing on the boundary of two keyset pages must not yield
    // a duplicate card.
    const dup = makePet({ petId: 'dup', rescueId: 'rsc-1' });
    const listPets = vi
      .fn()
      .mockResolvedValueOnce(listResponse([dup, makePet({ petId: 'a', rescueId: 'rsc-1' })], 'C1'))
      .mockResolvedValueOnce(listResponse([dup, makePet({ petId: 'b', rescueId: 'rsc-1' })]));
    const recommend = makeRecommend(makePetsClient(listPets));

    const res = await recommend(depsWithSwipes([]), makePrincipal(), {
      sessionId: 's-1',
      limit: 50,
    });

    const dupCount = res.candidates.filter(c => c.petId === 'dup').length;
    expect(dupCount).toBe(1);
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

  it('forwards the free-text query to service.pets search (ADS-1160)', async () => {
    const listPets = vi.fn().mockResolvedValue(listResponse([]));
    const searchPets = makeSearchPets(makePetsClient(listPets));

    await searchPets(deps, makePrincipal(), { limit: 10, query: 'buddy' });

    expect(listPets.mock.calls[0][0].search).toBe('buddy');
  });

  it('omits the pets search term when no query is supplied (ADS-1160)', async () => {
    const listPets = vi.fn().mockResolvedValue(listResponse([]));
    const searchPets = makeSearchPets(makePetsClient(listPets));

    await searchPets(deps, makePrincipal(), { limit: 10 });

    expect(listPets.mock.calls[0][0].search).toBeUndefined();
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
