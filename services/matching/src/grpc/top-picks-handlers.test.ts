import { describe, expect, it, vi } from 'vitest';

import {
  PetsV1,
  type ListPetsResponse,
  type Pet,
  type GetTopPicksRequest,
} from '@adopt-dont-shop/proto';

import type { HandlerDeps } from './adapter.js';
import type { PetsClient } from './pets-client.js';
import type { RescueNameClient } from './rescue-client.js';
import { makeGetTopPicks } from './top-picks-handlers.js';

function makePrincipal(
  overrides: Partial<{ userId: string; permissions: string[]; roles: string[] }> = {}
) {
  return {
    userId: overrides.userId ?? 'usr-1',
    roles: overrides.roles ?? ['adopter'],
    permissions: overrides.permissions ?? ['pets.read'],
    rescueId: undefined,
  } as unknown as Parameters<ReturnType<typeof makeGetTopPicks>>[1];
}

type ProfileRow = {
  preferred_types: unknown[] | null;
  preferred_sizes: unknown[] | null;
  preferred_age_groups: unknown[] | null;
  lifestyle: Record<string, unknown>;
};

// A pool stub that answers the two reads the handler makes — the match
// profile SELECT and the swipe-history exclusion — by branching on the
// SQL text. `profile: null` simulates an adopter with no saved profile.
function makeDeps(opts: { profile?: ProfileRow | null; swiped?: string[] } = {}): HandlerDeps {
  const query = vi.fn((sql: string) => {
    if (sql.includes('adopter_match_profiles')) {
      const noProfile = opts.profile === null || opts.profile === undefined;
      return Promise.resolve({ rows: noProfile ? [] : [opts.profile] });
    }
    if (sql.includes('swipe_actions')) {
      return Promise.resolve({ rows: (opts.swiped ?? []).map(pet_id => ({ pet_id })) });
    }
    return Promise.resolve({ rows: [] });
  });
  return { pool: { query } } as unknown as HandlerDeps;
}

function makePetsClient(listPets: ReturnType<typeof vi.fn>): PetsClient {
  return { listPets, close: vi.fn() } as unknown as PetsClient;
}

function makeRescueClient(
  getRescueName: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue('A Rescue')
): RescueNameClient {
  return { getRescueName, close: vi.fn() };
}

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

const listResponse = (pets: Pet[]): ListPetsResponse => ({ pets });
const req = (limit = 10): GetTopPicksRequest => ({ limit });

describe('makeGetTopPicks', () => {
  it('throws PERMISSION_DENIED without pets.read', async () => {
    const getTopPicks = makeGetTopPicks(makePetsClient(vi.fn()), makeRescueClient());
    await expect(
      getTopPicks(makeDeps(), makePrincipal({ permissions: [] }), req())
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('only requests available pets from service.pets', async () => {
    const listPets = vi.fn().mockResolvedValue(listResponse([]));
    const getTopPicks = makeGetTopPicks(makePetsClient(listPets), makeRescueClient());

    await getTopPicks(makeDeps(), makePrincipal(), req());

    expect(listPets.mock.calls[0][0].statusFilter).toBe(PetsV1.PetStatus.PET_STATUS_AVAILABLE);
  });

  it('returns scored picks with lowercase tokens and a resolved rescue name', async () => {
    const listPets = vi.fn().mockResolvedValue(
      listResponse([
        makePet({
          petId: 'p-1',
          name: 'Bella',
          rescueId: 'rsc-1',
          type: PetsV1.PetType.PET_TYPE_CAT,
          size: PetsV1.PetSize.PET_SIZE_SMALL,
          ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_BABY,
        }),
      ])
    );
    const getRescueName = vi.fn().mockResolvedValue('Happy Tails');
    const getTopPicks = makeGetTopPicks(makePetsClient(listPets), makeRescueClient(getRescueName));

    const res = await getTopPicks(makeDeps(), makePrincipal(), req());

    expect(res.picks).toHaveLength(1);
    expect(res.picks[0]).toMatchObject({
      petId: 'p-1',
      name: 'Bella',
      type: 'cat',
      size: 'small',
      ageGroup: 'baby',
      rescueName: 'Happy Tails',
    });
    expect(res.picks[0].score).toBeGreaterThanOrEqual(0);
    expect(res.picks[0].score).toBeLessThanOrEqual(1);
  });

  it('ranks a pet matching the stored profile above a non-matching one', async () => {
    const listPets = vi
      .fn()
      .mockResolvedValue(
        listResponse([
          makePet({ petId: 'cat', rescueId: 'rsc-1', type: PetsV1.PetType.PET_TYPE_CAT }),
          makePet({ petId: 'dog', rescueId: 'rsc-1', type: PetsV1.PetType.PET_TYPE_DOG }),
        ])
      );
    const getTopPicks = makeGetTopPicks(makePetsClient(listPets), makeRescueClient());

    const res = await getTopPicks(
      makeDeps({
        profile: {
          preferred_types: ['dog'],
          preferred_sizes: null,
          preferred_age_groups: null,
          lifestyle: {},
        },
      }),
      makePrincipal(),
      req()
    );

    expect(res.picks[0].petId).toBe('dog');
    expect(res.picks[0].reasons.some(r => r.kind === 'pref_match')).toBe(true);
  });

  it('excludes pets the caller has already swiped', async () => {
    const listPets = vi
      .fn()
      .mockResolvedValue(
        listResponse([
          makePet({ petId: 'seen', rescueId: 'rsc-1' }),
          makePet({ petId: 'fresh', rescueId: 'rsc-1' }),
        ])
      );
    const getTopPicks = makeGetTopPicks(makePetsClient(listPets), makeRescueClient());

    const res = await getTopPicks(makeDeps({ swiped: ['seen'] }), makePrincipal(), req());

    const ids = res.picks.map(p => p.petId);
    expect(ids).toContain('fresh');
    expect(ids).not.toContain('seen');
  });

  it('caps the result at the requested limit', async () => {
    const pets = Array.from({ length: 5 }, (_, i) =>
      makePet({ petId: `p-${i}`, rescueId: 'rsc-1' })
    );
    const listPets = vi.fn().mockResolvedValue(listResponse(pets));
    const getTopPicks = makeGetTopPicks(makePetsClient(listPets), makeRescueClient());

    const res = await getTopPicks(makeDeps(), makePrincipal(), req(2));

    expect(res.picks).toHaveLength(2);
  });

  it('resolves each distinct rescue exactly once even across many picks', async () => {
    const listPets = vi
      .fn()
      .mockResolvedValue(
        listResponse([
          makePet({ petId: 'a', rescueId: 'rsc-1' }),
          makePet({ petId: 'b', rescueId: 'rsc-1' }),
          makePet({ petId: 'c', rescueId: 'rsc-2' }),
        ])
      );
    const getRescueName = vi.fn().mockResolvedValue('Some Rescue');
    const getTopPicks = makeGetTopPicks(makePetsClient(listPets), makeRescueClient(getRescueName));

    await getTopPicks(makeDeps(), makePrincipal(), req());

    expect(getRescueName).toHaveBeenCalledTimes(2);
    expect(getRescueName.mock.calls.map(c => c[0]).sort()).toEqual(['rsc-1', 'rsc-2']);
  });

  it('leaves rescueName empty when the rescue lookup yields nothing', async () => {
    const listPets = vi
      .fn()
      .mockResolvedValue(listResponse([makePet({ petId: 'p-1', rescueId: 'rsc-1' })]));
    const getRescueName = vi.fn().mockResolvedValue(null);
    const getTopPicks = makeGetTopPicks(makePetsClient(listPets), makeRescueClient(getRescueName));

    const res = await getTopPicks(makeDeps(), makePrincipal(), req());

    expect(res.picks[0].rescueName).toBe('');
  });

  it('still returns picks when the adopter has no saved profile', async () => {
    const listPets = vi
      .fn()
      .mockResolvedValue(listResponse([makePet({ petId: 'p-1', rescueId: 'rsc-1' })]));
    const getTopPicks = makeGetTopPicks(makePetsClient(listPets), makeRescueClient());

    const res = await getTopPicks(makeDeps({ profile: null }), makePrincipal(), req());

    expect(res.picks).toHaveLength(1);
    expect(res.picks[0].reasons.some(r => r.kind === 'pref_match')).toBe(false);
  });

  it('surfaces a lifestyle chip when a child-friendly pet meets a household with children', async () => {
    const listPets = vi.fn().mockResolvedValue(
      listResponse([
        makePet({
          petId: 'p-1',
          rescueId: 'rsc-1',
          extraJson: JSON.stringify({ goodWithChildren: true }),
        }),
      ])
    );
    const getTopPicks = makeGetTopPicks(makePetsClient(listPets), makeRescueClient());

    const res = await getTopPicks(
      makeDeps({
        profile: {
          preferred_types: null,
          preferred_sizes: null,
          preferred_age_groups: null,
          lifestyle: { has_children: true },
        },
      }),
      makePrincipal(),
      req()
    );

    expect(res.picks[0].reasons.some(r => r.kind === 'lifestyle')).toBe(true);
  });

  it('forwards the caller identity to service.pets as metadata', async () => {
    const listPets = vi.fn().mockResolvedValue(listResponse([]));
    const getTopPicks = makeGetTopPicks(makePetsClient(listPets), makeRescueClient());

    await getTopPicks(makeDeps(), makePrincipal({ userId: 'usr-9' }), req());

    expect(listPets.mock.calls[0][1].get('x-user-id')).toEqual(['usr-9']);
  });

  it('maps a pets PERMISSION_DENIED (grpc code 7) onto PERMISSION_DENIED', async () => {
    const listPets = vi.fn().mockRejectedValue({ code: 7 });
    const getTopPicks = makeGetTopPicks(makePetsClient(listPets), makeRescueClient());
    await expect(getTopPicks(makeDeps(), makePrincipal(), req())).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('maps an unexpected pets error onto INTERNAL', async () => {
    const listPets = vi.fn().mockRejectedValue(new Error('boom'));
    const getTopPicks = makeGetTopPicks(makePetsClient(listPets), makeRescueClient());
    await expect(getTopPicks(makeDeps(), makePrincipal(), req())).rejects.toMatchObject({
      code: 'INTERNAL',
    });
  });
});
