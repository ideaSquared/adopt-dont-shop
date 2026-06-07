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
  updateMock: ReturnType<typeof vi.fn>;
  updateStatusMock: ReturnType<typeof vi.fn>;
  deleteMock: ReturnType<typeof vi.fn>;
  getStatsMock: ReturnType<typeof vi.fn>;
} {
  const createMock = vi.fn();
  const getMock = vi.fn();
  const listMock = vi.fn();
  const updateMock = vi.fn();
  const updateStatusMock = vi.fn();
  const deleteMock = vi.fn();
  const getStatsMock = vi.fn();
  const client: PetsClient = {
    create: createMock,
    get: getMock,
    list: listMock,
    update: updateMock,
    updateStatus: updateStatusMock,
    delete: deleteMock,
    getStats: getStatsMock,
    close: vi.fn(),
  };
  return {
    client,
    createMock,
    getMock,
    listMock,
    updateMock,
    updateStatusMock,
    deleteMock,
    getStatsMock,
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
    const listRes: ListPetsResponse = { pets: [PET_FIXTURE], nextCursor: 'abc' };
    listMock.mockResolvedValueOnce(listRes);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/pets?status=available&type=dog&size=large&limit=10&rescueId=rsc-1',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    // Stage B envelope: { success, data, meta }.
    const body = res.json() as { success: boolean; data: unknown[]; meta: { hasNext: boolean } };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.meta.hasNext).toBe(true);

    const [req, metadata] = listMock.mock.calls[0];
    expect(req.limit).toBe(10);
    expect(req.statusFilter).toBe(PetsV1.PetStatus.PET_STATUS_AVAILABLE);
    expect(req.typeFilter).toBe(PetsV1.PetType.PET_TYPE_DOG);
    expect(req.sizeFilter).toBe(PetsV1.PetSize.PET_SIZE_LARGE);
    expect(req.rescueIdFilter).toBe('rsc-1');
    expect(metadata.get('x-user-id')[0]).toBe('usr-1');
  });

  it('coerces an unknown status to UNSPECIFIED (service returns 400)', async () => {
    listMock.mockResolvedValueOnce({ pets: [] });
    await app.inject({ method: 'GET', url: '/api/v1/pets?status=not_a_status' });
    const [req] = listMock.mock.calls[0];
    expect(req.statusFilter).toBe(PetsV1.PetStatus.PET_STATUS_UNSPECIFIED);
  });

  it('maps INVALID_ARGUMENT → 400', async () => {
    listMock.mockRejectedValueOnce(
      Object.assign(new Error('bad limit'), {
        code: grpcStatus.INVALID_ARGUMENT,
        details: 'bad limit',
      })
    );
    const res = await app.inject({ method: 'GET', url: '/api/v1/pets?limit=200' });
    expect(res.statusCode).toBe(400);
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
