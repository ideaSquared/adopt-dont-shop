import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PetsV1,
  type CreatePetResponse,
  type DeletePetResponse,
  type GetPetResponse,
  type ListPetsResponse,
  type Pet,
  type UpdatePetResponse,
  type UpdatePetStatusResponse,
} from '@adopt-dont-shop/proto';

import type { PetsClient } from '../grpc-clients/pets-client.js';

import { registerPetsRoutes } from './pets.js';

function makeClient(): {
  client: PetsClient;
  createMock: ReturnType<typeof vi.fn>;
  getMock: ReturnType<typeof vi.fn>;
  listMock: ReturnType<typeof vi.fn>;
  listBreedsMock: ReturnType<typeof vi.fn>;
  getSimilarPetsMock: ReturnType<typeof vi.fn>;
  updateMock: ReturnType<typeof vi.fn>;
  updateStatusMock: ReturnType<typeof vi.fn>;
  deleteMock: ReturnType<typeof vi.fn>;
  getStatsMock: ReturnType<typeof vi.fn>;
  addFavoriteMock: ReturnType<typeof vi.fn>;
  removeFavoriteMock: ReturnType<typeof vi.fn>;
  getFavoriteStatusMock: ReturnType<typeof vi.fn>;
  listUserFavoritesMock: ReturnType<typeof vi.fn>;
  getSearchSuggestionsMock: ReturnType<typeof vi.fn>;
  getPetFacetsMock: ReturnType<typeof vi.fn>;
} {
  const createMock = vi.fn();
  const getMock = vi.fn();
  const listMock = vi.fn();
  const listBreedsMock = vi.fn();
  const getSimilarPetsMock = vi.fn();
  const updateMock = vi.fn();
  const updateStatusMock = vi.fn();
  const deleteMock = vi.fn();
  const getStatsMock = vi.fn();
  const addFavoriteMock = vi.fn();
  const removeFavoriteMock = vi.fn();
  const getFavoriteStatusMock = vi.fn();
  const listUserFavoritesMock = vi.fn();
  const getSearchSuggestionsMock = vi.fn();
  const getPetFacetsMock = vi.fn();
  const client: PetsClient = {
    create: createMock,
    get: getMock,
    list: listMock,
    listBreeds: listBreedsMock,
    getSimilarPets: getSimilarPetsMock,
    update: updateMock,
    updateStatus: updateStatusMock,
    delete: deleteMock,
    getStats: getStatsMock,
    addFavorite: addFavoriteMock,
    removeFavorite: removeFavoriteMock,
    getFavoriteStatus: getFavoriteStatusMock,
    listUserFavorites: listUserFavoritesMock,
    getSearchSuggestions: getSearchSuggestionsMock,
    getPetFacets: getPetFacetsMock,
    close: vi.fn(),
  };
  return {
    client,
    createMock,
    getMock,
    listMock,
    listBreedsMock,
    getSimilarPetsMock,
    updateMock,
    updateStatusMock,
    deleteMock,
    getStatsMock,
    addFavoriteMock,
    removeFavoriteMock,
    getFavoriteStatusMock,
    listUserFavoritesMock,
    getSearchSuggestionsMock,
    getPetFacetsMock,
  };
}

async function makeApp(client: PetsClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerPetsRoutes(app, { client });
  return app;
}

const PET_FIXTURE: Pet = {
  petId: 'pet-1',
  name: 'Rex',
  rescueId: 'rsc-1',
  type: PetsV1.PetType.PET_TYPE_DOG,
  status: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
  gender: PetsV1.PetGender.PET_GENDER_MALE,
  size: PetsV1.PetSize.PET_SIZE_LARGE,
  ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
  archived: false,
  featured: false,
  priorityListing: false,
  specialNeeds: false,
  houseTrained: true,
  temperamentJson: '["friendly"]',
  tagsJson: '[]',
  extraJson: '{}',
  viewCount: 0,
  favoriteCount: 0,
  applicationCount: 0,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

describe('GET /api/v1/pets', () => {
  let app: FastifyInstance;
  let listMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    listMock = m.listMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists pets and forwards filters', async () => {
    const listRes: ListPetsResponse = { pets: [PET_FIXTURE], total: 1 };
    listMock.mockResolvedValueOnce(listRes);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/pets?status=available&type=dog&size=large&limit=10&rescueId=rsc-1',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    // Canonical pagination envelope: { success, data, pagination }.
    const body = res.json() as {
      success: boolean;
      data: unknown[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const [req, metadata] = listMock.mock.calls[0];
    expect(req.limit).toBe(10);
    expect(req.page).toBe(1);
    expect(req.statusFilter).toBe(PetsV1.PetStatus.PET_STATUS_AVAILABLE);
    expect(req.typeFilter).toBe(PetsV1.PetType.PET_TYPE_DOG);
    expect(req.sizeFilter).toBe(PetsV1.PetSize.PET_SIZE_LARGE);
    expect(req.rescueIdFilter).toBe('rsc-1');
    expect(metadata.get('x-user-id')[0]).toBe('usr-1');
  });

  it('forwards featured=true as featuredFilter (the homepage featured rail)', async () => {
    listMock.mockResolvedValueOnce({ pets: [PET_FIXTURE], nextCursor: undefined });
    await app.inject({
      method: 'GET',
      url: '/api/v1/pets?featured=true&limit=8',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    const [req] = listMock.mock.calls[0];
    expect(req.featuredFilter).toBe(true);
  });

  it('leaves featuredFilter false when featured is not requested', async () => {
    listMock.mockResolvedValueOnce({ pets: [], nextCursor: undefined });
    await app.inject({
      method: 'GET',
      url: '/api/v1/pets?limit=8',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    const [req] = listMock.mock.calls[0];
    expect(req.featuredFilter).toBe(false);
  });

  it('page mode: forwards page/search/breed/gender/ageGroup/sort and builds the canonical envelope', async () => {
    listMock.mockResolvedValueOnce({ pets: [PET_FIXTURE], nextCursor: undefined, total: 42 });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/pets?page=3&limit=12&search=rex&breed=labr&gender=male&ageGroup=adult&sortBy=name&sortOrder=ASC',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'rescue_staff', 'x-rescue-id': 'rsc-1' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { pagination: Record<string, unknown> };
    // total 42 / limit 12 → 4 pages; page 3 has both prev and next.
    expect(body.pagination).toEqual({
      page: 3,
      limit: 12,
      total: 42,
      totalPages: 4,
      hasNext: true,
      hasPrev: true,
    });

    const [gr] = listMock.mock.calls[0];
    expect(gr.page).toBe(3);
    expect(gr.search).toBe('rex');
    expect(gr.breed).toBe('labr');
    expect(gr.genderFilter).toBe(PetsV1.PetGender.PET_GENDER_MALE);
    expect(gr.ageGroupFilter).toBe(PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT);
    expect(gr.sortBy).toBe('name');
    expect(gr.sortOrder).toBe('ASC');
  });

  it('defaults to page 1 when no page param is requested', async () => {
    listMock.mockResolvedValueOnce({ pets: [PET_FIXTURE], total: 5 });
    await app.inject({
      method: 'GET',
      url: '/api/v1/pets?limit=12',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    const [gr] = listMock.mock.calls[0];
    expect(gr.page).toBe(1);
  });

  it('coerces an unknown status to UNSPECIFIED (service returns 400)', async () => {
    listMock.mockResolvedValueOnce({ pets: [] });
    await app.inject({ method: 'GET', url: '/api/v1/pets?status=not_a_status' });
    const [req] = listMock.mock.calls[0];
    expect(req.statusFilter).toBe(PetsV1.PetStatus.PET_STATUS_UNSPECIFIED);
  });

  it('maps INVALID_ARGUMENT → 400', async () => {
    listMock.mockRejectedValueOnce(
      Object.assign(new Error('bad filter'), {
        code: grpcStatus.INVALID_ARGUMENT,
        details: 'bad filter',
      })
    );
    const res = await app.inject({ method: 'GET', url: '/api/v1/pets?limit=50' });
    expect(res.statusCode).toBe(400);
  });

  it('rejects limit > 100 at the gateway without calling the service', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/pets?limit=200' });
    expect(res.statusCode).toBe(400);
    expect(listMock).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric limit at the gateway', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/pets?limit=abc' });
    expect(res.statusCode).toBe(400);
    expect(listMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/pets/:id', () => {
  it('forwards the path param + x-user-* metadata and returns the pet', async () => {
    const { client, getMock } = makeClient();
    const app = await makeApp(client);
    try {
      const getRes: GetPetResponse = { pet: PET_FIXTURE };
      getMock.mockResolvedValueOnce(getRes);
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pets/pet-1',
        headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      });
      expect(res.statusCode).toBe(200);
      // Stage B: { success, data: <snake_case view> }.
      const body = res.json() as { success: boolean; data: { pet_id: string } };
      expect(body.success).toBe(true);
      expect(body.data.pet_id).toBe('pet-1');
      const [req, metadata] = getMock.mock.calls[0];
      expect(req.petId).toBe('pet-1');
      expect(metadata.get('x-user-id')[0]).toBe('usr-1');
    } finally {
      await app.close();
    }
  });

  it('maps NOT_FOUND → 404', async () => {
    const { client, getMock } = makeClient();
    const app = await makeApp(client);
    try {
      getMock.mockRejectedValueOnce(
        Object.assign(new Error('gone'), {
          code: grpcStatus.NOT_FOUND,
          details: 'pet ghost not found',
        })
      );
      const res = await app.inject({ method: 'GET', url: '/api/v1/pets/ghost' });
      expect(res.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/pets/breeds', () => {
  it('lists all breeds (no species) — static path wins over /:id', async () => {
    const { client, listBreedsMock, getMock } = makeClient();
    const app = await makeApp(client);
    try {
      listBreedsMock.mockResolvedValueOnce({ breeds: ['Beagle', 'Collie'] });
      const res = await app.inject({ method: 'GET', url: '/api/v1/pets/breeds' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true, data: ['Beagle', 'Collie'] });
      // "breeds" was NOT treated as a pet id.
      expect(getMock).not.toHaveBeenCalled();
      expect(listBreedsMock.mock.calls[0][0]).toEqual({});
    } finally {
      await app.close();
    }
  });

  it('forwards the species path param', async () => {
    const { client, listBreedsMock } = makeClient();
    const app = await makeApp(client);
    try {
      listBreedsMock.mockResolvedValueOnce({ breeds: ['Beagle'] });
      const res = await app.inject({ method: 'GET', url: '/api/v1/pets/breeds/dog' });
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual(['Beagle']);
      expect(listBreedsMock.mock.calls[0][0]).toEqual({ species: 'dog' });
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/pets/:id/similar', () => {
  it('returns similar pets and forwards a parsed limit', async () => {
    const { client, getSimilarPetsMock } = makeClient();
    const app = await makeApp(client);
    try {
      getSimilarPetsMock.mockResolvedValueOnce({ pets: [PET_FIXTURE] });
      const res = await app.inject({ method: 'GET', url: '/api/v1/pets/pet-1/similar?limit=8' });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { success: boolean; data: Array<{ pet_id: string }> };
      expect(body.data[0].pet_id).toBe('pet-1');
      expect(getSimilarPetsMock.mock.calls[0][0]).toEqual({ petId: 'pet-1', limit: 8 });
    } finally {
      await app.close();
    }
  });

  it('defaults the limit to 0 (handler picks the default) when absent', async () => {
    const { client, getSimilarPetsMock } = makeClient();
    const app = await makeApp(client);
    try {
      getSimilarPetsMock.mockResolvedValueOnce({ pets: [] });
      await app.inject({ method: 'GET', url: '/api/v1/pets/pet-1/similar' });
      expect(getSimilarPetsMock.mock.calls[0][0]).toEqual({ petId: 'pet-1', limit: 0 });
    } finally {
      await app.close();
    }
  });
});

describe('POST /api/v1/pets', () => {
  it('returns 201 on success and threads body fields into the gRPC request', async () => {
    const { client, createMock } = makeClient();
    const app = await makeApp(client);
    try {
      const createRes: CreatePetResponse = { pet: PET_FIXTURE };
      createMock.mockResolvedValueOnce(createRes);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets',
        headers: { 'x-user-id': 'usr-staff', 'x-user-roles': 'rescue_staff' },
        // Frontend (lib.pets) payload: snake_case + token enums + long tail.
        payload: {
          name: 'Rex',
          rescue_id: 'rsc-1',
          type: 'dog',
          gender: 'male',
          size: 'large',
          age_group: 'adult',
          house_trained: true,
          temperament: ['friendly'],
          good_with_children: true,
          adoption_fee: '125.00',
        },
      });

      expect(res.statusCode).toBe(201);
      // Response is the frontend view envelope.
      expect((res.json() as { success: boolean }).success).toBe(true);
      const [req] = createMock.mock.calls[0];
      expect(req.name).toBe('Rex');
      expect(req.rescueId).toBe('rsc-1');
      expect(req.type).toBe(PetsV1.PetType.PET_TYPE_DOG);
      expect(req.ageGroup).toBe(PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT);
      expect(req.houseTrained).toBe(true);
      expect(req.temperamentJson).toBe('["friendly"]');
      expect(req.adoptionFeeMinor).toBe(12500);
      // long-tail field not on the core message is packed into extra_json.
      expect(JSON.parse(req.extraJson)).toMatchObject({ good_with_children: true });
    } finally {
      await app.close();
    }
  });

  it('maps PERMISSION_DENIED → 403', async () => {
    const { client, createMock } = makeClient();
    const app = await makeApp(client);
    try {
      createMock.mockRejectedValueOnce(
        Object.assign(new Error('nope'), {
          code: grpcStatus.PERMISSION_DENIED,
          details: 'pets.create required for this rescue',
        })
      );
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets',
        payload: { name: 'Rex', rescueId: 'rsc-other' },
      });
      expect(res.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
});

describe('PATCH /api/v1/pets/:id', () => {
  it('threads the path param + body fields', async () => {
    const { client, updateMock } = makeClient();
    const app = await makeApp(client);
    try {
      const updateRes: UpdatePetResponse = { pet: { ...PET_FIXTURE, name: 'Rexy' } };
      updateMock.mockResolvedValueOnce(updateRes);
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/pets/pet-1',
        payload: { name: 'Rexy' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { success: boolean; data: { name: string } };
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Rexy');
      const [req] = updateMock.mock.calls[0];
      expect(req.petId).toBe('pet-1');
      expect(req.name).toBe('Rexy');
    } finally {
      await app.close();
    }
  });
});

describe('POST /api/v1/pets/:id/status', () => {
  let app: FastifyInstance;
  let updateStatusMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    updateStatusMock = m.updateStatusMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('parses the canonical DB status string and forwards the proto enum', async () => {
    const updateStatusRes: UpdatePetStatusResponse = {
      pet: { ...PET_FIXTURE, status: PetsV1.PetStatus.PET_STATUS_PENDING },
      transition: {
        transitionId: 't-1',
        petId: 'pet-1',
        fromStatus: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
        toStatus: PetsV1.PetStatus.PET_STATUS_PENDING,
        transitionedAt: '2026-06-05T10:00:00Z',
      },
    };
    updateStatusMock.mockResolvedValueOnce(updateStatusRes);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pets/pet-1/status',
      payload: { toStatus: 'pending', reason: 'application opened' },
    });

    expect(res.statusCode).toBe(200);
    const [req] = updateStatusMock.mock.calls[0];
    expect(req.petId).toBe('pet-1');
    expect(req.toStatus).toBe(PetsV1.PetStatus.PET_STATUS_PENDING);
    expect(req.reason).toBe('application opened');
  });

  it('accepts the SCREAMING proto form too', async () => {
    updateStatusMock.mockResolvedValueOnce({ pet: PET_FIXTURE });
    await app.inject({
      method: 'POST',
      url: '/api/v1/pets/pet-1/status',
      payload: { toStatus: 'PET_STATUS_ADOPTED' },
    });
    const [req] = updateStatusMock.mock.calls[0];
    expect(req.toStatus).toBe(PetsV1.PetStatus.PET_STATUS_ADOPTED);
  });

  it('maps INVALID_ARGUMENT → 400 on illegal transition', async () => {
    updateStatusMock.mockRejectedValueOnce(
      Object.assign(new Error('illegal'), {
        code: grpcStatus.INVALID_ARGUMENT,
        details: 'illegal status transition available → adopted',
      })
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pets/pet-1/status',
      payload: { toStatus: 'adopted' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /api/v1/pets/:id', () => {
  it('soft-deletes and returns { success: true }', async () => {
    const { client, deleteMock } = makeClient();
    const app = await makeApp(client);
    try {
      const delRes: DeletePetResponse = { deleted: true };
      deleteMock.mockResolvedValueOnce(delRes);

      const res = await app.inject({ method: 'DELETE', url: '/api/v1/pets/pet-1' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ success: true });
      const [req] = deleteMock.mock.calls[0];
      expect(req.petId).toBe('pet-1');
    } finally {
      await app.close();
    }
  });
});

describe('error mapping fallback', () => {
  it('unknown gRPC code → 500', async () => {
    const { client, getMock } = makeClient();
    const app = await makeApp(client);
    try {
      getMock.mockRejectedValueOnce(new Error('connection refused'));
      const res = await app.inject({ method: 'GET', url: '/api/v1/pets/pet-1' });
      expect(res.statusCode).toBe(500);
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/pets/stats', () => {
  const STATS_FIXTURE = {
    total: 22,
    available: 10,
    pending: 3,
    adopted: 7,
    foster: 0,
    medicalHold: 2,
    behavioralHold: 0,
    notAvailable: 0,
    deceased: 0,
    monthlyAdoptions: 4,
    averageDaysToAdoption: 13,
  };

  it('routes /stats to client.getStats (not /:id getter)', async () => {
    const { client, getStatsMock, getMock } = makeClient();
    const app = await makeApp(client);
    try {
      getStatsMock.mockResolvedValueOnce(STATS_FIXTURE);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pets/stats',
        headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'rescue_staff', 'x-rescue-id': 'rsc-1' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true, data: STATS_FIXTURE });
      expect(getMock).not.toHaveBeenCalled();
      expect(getStatsMock).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });

  it('forwards optional rescueId query param', async () => {
    const { client, getStatsMock } = makeClient();
    const app = await makeApp(client);
    try {
      getStatsMock.mockResolvedValueOnce(STATS_FIXTURE);
      await app.inject({
        method: 'GET',
        url: '/api/v1/pets/stats?rescueId=rsc-target',
        headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'admin' },
      });
      const [grpcReq] = getStatsMock.mock.calls[0];
      expect(grpcReq).toEqual({ rescueIdFilter: 'rsc-target' });
    } finally {
      await app.close();
    }
  });

  it('maps PERMISSION_DENIED → 403', async () => {
    const { client, getStatsMock } = makeClient();
    const app = await makeApp(client);
    try {
      getStatsMock.mockRejectedValueOnce({
        code: grpcStatus.PERMISSION_DENIED,
        details: 'no perms',
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pets/stats',
        headers: { 'x-user-id': 'usr-noperms', 'x-user-roles': 'adopter' },
      });
      expect(res.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/pets/facets', () => {
  const FACETS_FIXTURE = {
    facets: [
      { name: 'status', values: [{ value: 'available', count: 10 }] },
      { name: 'type', values: [{ value: 'dog', count: 8 }] },
      { name: 'size', values: [{ value: 'medium', count: 5 }] },
    ],
  };

  it('routes /facets to client.getPetFacets (not /:id getter)', async () => {
    const { client, getPetFacetsMock, getMock } = makeClient();
    const app = await makeApp(client);
    try {
      getPetFacetsMock.mockResolvedValueOnce(FACETS_FIXTURE);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pets/facets',
        headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'rescue_staff', 'x-rescue-id': 'rsc-1' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true, data: FACETS_FIXTURE });
      expect(getMock).not.toHaveBeenCalled();
      expect(getPetFacetsMock).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });

  it('parses status/type/size/rescueId query params into the gRPC request', async () => {
    const { client, getPetFacetsMock } = makeClient();
    const app = await makeApp(client);
    try {
      getPetFacetsMock.mockResolvedValueOnce({ facets: [] });
      await app.inject({
        method: 'GET',
        url: '/api/v1/pets/facets?status=available&type=dog&size=medium&rescueId=rsc-target',
        headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'admin' },
      });
      const [grpcReq] = getPetFacetsMock.mock.calls[0];
      expect(grpcReq).toEqual({
        statusFilter: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
        typeFilter: PetsV1.PetType.PET_TYPE_DOG,
        sizeFilter: PetsV1.PetSize.PET_SIZE_MEDIUM,
        rescueIdFilter: 'rsc-target',
      });
    } finally {
      await app.close();
    }
  });

  it('maps PERMISSION_DENIED → 403', async () => {
    const { client, getPetFacetsMock } = makeClient();
    const app = await makeApp(client);
    try {
      getPetFacetsMock.mockRejectedValueOnce({
        code: grpcStatus.PERMISSION_DENIED,
        details: 'no perms',
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pets/facets',
        headers: { 'x-user-id': 'usr-noperms', 'x-user-roles': 'adopter' },
      });
      expect(res.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
});

describe('favourite routes', () => {
  it('GET /pets/favorites/user returns the SPA { pets } envelope', async () => {
    const { client, listUserFavoritesMock } = makeClient();
    const app = await makeApp(client);
    try {
      listUserFavoritesMock.mockResolvedValueOnce({ pets: [PET_FIXTURE] });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pets/favorites/user',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { success: boolean; data: { pets: unknown[]; total: number } };
      expect(body.success).toBe(true);
      expect(body.data.pets).toHaveLength(1);
      expect(body.data.total).toBe(1);
    } finally {
      await app.close();
    }
  });

  it('does not let /favorites/user be shadowed by GET /:id', async () => {
    const { client, listUserFavoritesMock, getMock } = makeClient();
    const app = await makeApp(client);
    try {
      listUserFavoritesMock.mockResolvedValueOnce({ pets: [] });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pets/favorites/user',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(res.statusCode).toBe(200);
      expect(listUserFavoritesMock).toHaveBeenCalledTimes(1);
      expect(getMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('GET /pets/:id/favorite/status returns { isFavorite }', async () => {
    const { client, getFavoriteStatusMock } = makeClient();
    const app = await makeApp(client);
    try {
      getFavoriteStatusMock.mockResolvedValueOnce({ isFavorite: true });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pets/pet-1/favorite/status',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { data: { isFavorite: boolean } };
      expect(body.data.isFavorite).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('POST /pets/:id/favorite adds (201) and DELETE removes', async () => {
    const { client, addFavoriteMock, removeFavoriteMock } = makeClient();
    const app = await makeApp(client);
    try {
      addFavoriteMock.mockResolvedValueOnce({ favorited: true });
      const add = await app.inject({
        method: 'POST',
        url: '/api/v1/pets/pet-1/favorite',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(add.statusCode).toBe(201);
      const [addReq] = addFavoriteMock.mock.calls[0] as [{ petId: string }];
      expect(addReq.petId).toBe('pet-1');

      removeFavoriteMock.mockResolvedValueOnce({ removed: true });
      const del = await app.inject({
        method: 'DELETE',
        url: '/api/v1/pets/pet-1/favorite',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(del.statusCode).toBe(200);
      const body = del.json() as { data: { removed: boolean } };
      expect(body.data.removed).toBe(true);
    } finally {
      await app.close();
    }
  });
});

describe('POST /api/v1/pets/:id/images', () => {
  const petWithExtra = (extra: Record<string, unknown>): Pet => ({
    ...PET_FIXTURE,
    extraJson: JSON.stringify(extra),
  });

  it('appends uploaded urls to image_urls, preserves other extra fields, returns the view', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.getMock.mockResolvedValueOnce({
        pet: petWithExtra({ image_urls: ['a.jpg'], color: 'brown' }),
      });
      m.updateMock.mockResolvedValueOnce({
        pet: petWithExtra({ image_urls: ['a.jpg', 'b.jpg'], color: 'brown' }),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets/pet-1/images',
        headers: { 'x-user-id': 'usr-staff', 'x-user-roles': 'rescue_staff' },
        payload: { images: ['b.jpg'] },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json() as { success: boolean; data: { image_urls: string[] } };
      expect(body.success).toBe(true);
      expect(body.data.image_urls).toEqual(['a.jpg', 'b.jpg']);

      const [getReq, metadata] = m.getMock.mock.calls[0];
      expect(getReq.petId).toBe('pet-1');
      expect(metadata.get('x-user-id')[0]).toBe('usr-staff');

      const [updateReq] = m.updateMock.mock.calls[0];
      expect(updateReq.petId).toBe('pet-1');
      const sentExtra = JSON.parse(updateReq.extraJson) as Record<string, unknown>;
      expect(sentExtra.image_urls).toEqual(['a.jpg', 'b.jpg']);
      // Untouched long-tail extra fields survive the merge.
      expect(sentExtra.color).toBe('brown');
    } finally {
      await app.close();
    }
  });

  it('dedupes urls already present on the pet', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.getMock.mockResolvedValueOnce({ pet: petWithExtra({ image_urls: ['a.jpg'] }) });
      m.updateMock.mockResolvedValueOnce({ pet: PET_FIXTURE });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets/pet-1/images',
        payload: { images: ['a.jpg', 'c.jpg'] },
      });

      expect(res.statusCode).toBe(200);
      const [updateReq] = m.updateMock.mock.calls[0];
      expect(JSON.parse(updateReq.extraJson).image_urls).toEqual(['a.jpg', 'c.jpg']);
    } finally {
      await app.close();
    }
  });

  it('accepts { url } and { urls } as alternates and starts from an empty list', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.getMock.mockResolvedValueOnce({ pet: petWithExtra({}) });
      m.updateMock.mockResolvedValueOnce({ pet: PET_FIXTURE });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets/pet-1/images',
        payload: { urls: ['q.jpg'], url: 'z.jpg' },
      });

      expect(res.statusCode).toBe(200);
      const [updateReq] = m.updateMock.mock.calls[0];
      expect(JSON.parse(updateReq.extraJson).image_urls).toEqual(['q.jpg', 'z.jpg']);
    } finally {
      await app.close();
    }
  });

  it('400s when no urls are supplied and never calls the service', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets/pet-1/images',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      expect(m.getMock).not.toHaveBeenCalled();
      expect(m.updateMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('404s when the pet does not exist and does not attempt an update', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.getMock.mockResolvedValueOnce({ pet: undefined });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets/ghost/images',
        payload: { images: ['a.jpg'] },
      });
      expect(res.statusCode).toBe(404);
      expect(m.updateMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('maps a PERMISSION_DENIED from Update → 403', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.getMock.mockResolvedValueOnce({ pet: petWithExtra({}) });
      m.updateMock.mockRejectedValueOnce(
        Object.assign(new Error('nope'), {
          code: grpcStatus.PERMISSION_DENIED,
          details: 'not your rescue',
        })
      );
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets/pet-1/images',
        payload: { images: ['a.jpg'] },
      });
      expect(res.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
});

describe('DELETE /api/v1/pets/:id/images', () => {
  const petWithExtra = (extra: Record<string, unknown>): Pet => ({
    ...PET_FIXTURE,
    extraJson: JSON.stringify(extra),
  });

  it('removes the given imageUrl, preserves other extra fields, returns the view', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.getMock.mockResolvedValueOnce({
        pet: petWithExtra({ image_urls: ['a.jpg', 'b.jpg'], color: 'brown' }),
      });
      m.updateMock.mockResolvedValueOnce({
        pet: petWithExtra({ image_urls: ['a.jpg'], color: 'brown' }),
      });

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/pets/pet-1/images?imageUrl=b.jpg',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json() as { success: boolean; data: { image_urls: string[] } };
      expect(body.data.image_urls).toEqual(['a.jpg']);

      const [updateReq] = m.updateMock.mock.calls[0];
      const sentExtra = JSON.parse(updateReq.extraJson) as Record<string, unknown>;
      expect(sentExtra.image_urls).toEqual(['a.jpg']);
      expect(sentExtra.color).toBe('brown');
    } finally {
      await app.close();
    }
  });

  it('url-decodes the imageUrl query param before matching', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.getMock.mockResolvedValueOnce({
        pet: petWithExtra({ image_urls: ['https://cdn/img a.jpg', 'keep.jpg'] }),
      });
      m.updateMock.mockResolvedValueOnce({ pet: PET_FIXTURE });

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/pets/pet-1/images?imageUrl=https%3A%2F%2Fcdn%2Fimg%20a.jpg',
      });

      expect(res.statusCode).toBe(200);
      const [updateReq] = m.updateMock.mock.calls[0];
      expect(JSON.parse(updateReq.extraJson).image_urls).toEqual(['keep.jpg']);
    } finally {
      await app.close();
    }
  });

  it('400s when imageUrl is missing and never calls the service', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({ method: 'DELETE', url: '/api/v1/pets/pet-1/images' });
      expect(res.statusCode).toBe(400);
      expect(m.getMock).not.toHaveBeenCalled();
      expect(m.updateMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('404s when the pet does not exist', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.getMock.mockResolvedValueOnce({ pet: undefined });
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/pets/ghost/images?imageUrl=a.jpg',
      });
      expect(res.statusCode).toBe(404);
      expect(m.updateMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});

describe('POST /api/v1/pets/bulk-update', () => {
  const ADMIN_HEADERS = {
    'x-user-id': 'admin-1',
    'x-user-roles': 'admin',
    'x-user-permissions': 'pets.manage:any',
  };

  it('rejects an empty petIds with 400 (no RPC calls)', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets/bulk-update',
        headers: ADMIN_HEADERS,
        payload: { petIds: [], operation: 'archive' },
      });
      expect(res.statusCode).toBe(400);
      expect(m.updateMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects an unknown operation with 400', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets/bulk-update',
        headers: ADMIN_HEADERS,
        payload: { petIds: ['pet-1'], operation: 'frobnicate' },
      });
      expect(res.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('archive fans out to Update(archived:true) per pet and returns the result envelope', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.updateMock.mockResolvedValue({ pet: PET_FIXTURE });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets/bulk-update',
        headers: ADMIN_HEADERS,
        payload: { petIds: ['pet-1', 'pet-2'], operation: 'archive', reason: 'off-market' },
      });
      expect(res.statusCode).toBe(200);
      expect(m.updateMock).toHaveBeenCalledTimes(2);
      expect(m.updateMock.mock.calls[0][0]).toMatchObject({ petId: 'pet-1', archived: true });
      expect(res.json()).toMatchObject({
        success: true,
        data: { successCount: 2, failedCount: 0, errors: [] },
      });
    } finally {
      await app.close();
    }
  });

  it('update_status maps data.status to the proto enum via UpdateStatus', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.updateStatusMock.mockResolvedValue({ pet: PET_FIXTURE });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets/bulk-update',
        headers: ADMIN_HEADERS,
        payload: {
          petIds: ['pet-1'],
          operation: 'update_status',
          data: { status: 'not_available' },
        },
      });
      expect(res.statusCode).toBe(200);
      expect(m.updateStatusMock.mock.calls[0][0]).toMatchObject({
        petId: 'pet-1',
        toStatus: PetsV1.PetStatus.PET_STATUS_NOT_AVAILABLE,
      });
    } finally {
      await app.close();
    }
  });

  it('update_status without data.status is a 400', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets/bulk-update',
        headers: ADMIN_HEADERS,
        payload: { petIds: ['pet-1'], operation: 'update_status' },
      });
      expect(res.statusCode).toBe(400);
      expect(m.updateStatusMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('collects per-pet failures instead of failing the whole batch', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.deleteMock
        .mockResolvedValueOnce({ deleted: true })
        .mockRejectedValueOnce({ code: grpcStatus.PERMISSION_DENIED, details: 'not your rescue' });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pets/bulk-update',
        headers: ADMIN_HEADERS,
        payload: { petIds: ['pet-1', 'pet-2'], operation: 'delete' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toMatchObject({
        successCount: 1,
        failedCount: 1,
        errors: [{ petId: 'pet-2', error: 'not your rescue' }],
      });
    } finally {
      await app.close();
    }
  });
});
