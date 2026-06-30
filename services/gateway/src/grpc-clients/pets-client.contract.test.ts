// Contract tests for the gateway pets-client.
//
// Boots a real @grpc/grpc-js Server with PetsV1.PetServiceService and
// verifies:
//   1. Happy-path read: get() — typed request arrives, typed response
//      round-trips.
//   2. Happy-path write: create() — request fields arrive and response
//      round-trips.
//   3. Error contract: NOT_FOUND surfaces with .code intact.

import {
  Metadata,
  Server,
  ServerCredentials,
  type ServerUnaryCall,
  type sendUnaryData,
  type ServiceError,
  status,
} from '@grpc/grpc-js';

import {
  PetsV1,
  type CreatePetRequest,
  type CreatePetResponse,
  type GetAdoptionTrendRequest,
  type GetAdoptionTrendResponse,
  type GetPetRequest,
  type GetPetResponse,
} from '@adopt-dont-shop/proto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createPetsClient } from './pets-client.js';

// ── helpers ──────────────────────────────────────────────────────────

const makeServiceError = (code: number, details: string): ServiceError => {
  const err = new Error(details) as ServiceError;
  err.code = code;
  err.details = details;
  err.metadata = new Metadata();
  return err;
};

const unimplemented = (_call: unknown, cb: sendUnaryData<unknown>) =>
  cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null);

const makeHandlers = (overrides: Partial<PetsV1.PetServiceServer>): PetsV1.PetServiceServer => ({
  create: unimplemented,
  get: unimplemented,
  list: unimplemented,
  update: unimplemented,
  updateStatus: unimplemented,
  delete: unimplemented,
  getStats: unimplemented,
  getAdoptionTrend: unimplemented,
  getAdoptionsByType: unimplemented,
  getTopRescuesByAdoptions: unimplemented,
  addFavorite: unimplemented,
  removeFavorite: unimplemented,
  getFavoriteStatus: unimplemented,
  listUserFavorites: unimplemented,
  ...overrides,
});

// Minimal valid Pet object satisfying proto serialization.
// All required (non-optional) fields must be set; optional fields can be
// omitted. Enum fields default to 0 (UNSPECIFIED).
const minimalPet: PetsV1.Pet = {
  petId: 'pet-001',
  name: 'Buddy',
  type: 0,
  status: 0,
  gender: 0,
  size: 0,
  ageGroup: 0,
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
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// ── suite ─────────────────────────────────────────────────────────────

describe('pets-client — gRPC contract', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = (handlers: PetsV1.PetServiceServer): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      server.addService(PetsV1.PetServiceService, handlers);
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) reject(err);
        else resolve(boundPort);
      });
    });

  // ── 1. Read: get ─────────────────────────────────────────────────

  it('get — request petId arrives and typed response round-trips', async () => {
    const want: GetPetResponse = { pet: { ...minimalPet, petId: 'pet-001', name: 'Buddy' } };
    let receivedPetId = '';

    port = await startServer(
      makeHandlers({
        get: (
          call: ServerUnaryCall<GetPetRequest, GetPetResponse>,
          cb: sendUnaryData<GetPetResponse>
        ) => {
          receivedPetId = call.request.petId;
          cb(null, want);
        },
      })
    );

    const client = createPetsClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.get({ petId: 'pet-001' }, new Metadata());
      expect(receivedPetId).toBe('pet-001');
      expect(result.pet?.petId).toBe('pet-001');
      expect(result.pet?.name).toBe('Buddy');
    } finally {
      client.close();
    }
  });

  // ── 2. Write: create ─────────────────────────────────────────────

  it('create — request fields arrive and response petId round-trips', async () => {
    const want: CreatePetResponse = { pet: { ...minimalPet, petId: 'pet-new', name: 'Max' } };

    let capturedName = '';
    let capturedRescueId = '';

    port = await startServer(
      makeHandlers({
        create: (
          call: ServerUnaryCall<CreatePetRequest, CreatePetResponse>,
          cb: sendUnaryData<CreatePetResponse>
        ) => {
          capturedName = call.request.name;
          capturedRescueId = call.request.rescueId ?? '';
          cb(null, want);
        },
      })
    );

    const client = createPetsClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.create(
        {
          name: 'Max',
          rescueId: 'rescue-2',
          type: 0,
          gender: 0,
          size: 0,
          ageGroup: 0,
          specialNeeds: false,
          houseTrained: false,
          temperamentJson: '[]',
          tagsJson: '[]',
          extraJson: '{}',
        },
        new Metadata()
      );
      expect(capturedName).toBe('Max');
      expect(capturedRescueId).toBe('rescue-2');
      expect(result.pet?.petId).toBe('pet-new');
    } finally {
      client.close();
    }
  });

  // ── 3. Read: getAdoptionTrend ─────────────────────────────────────

  it('getAdoptionTrend — request groupBy arrives and typed response round-trips', async () => {
    const want: GetAdoptionTrendResponse = { points: [{ date: '2026-01-01', count: 3 }] };
    let receivedGroupBy = '';

    port = await startServer(
      makeHandlers({
        getAdoptionTrend: (
          call: ServerUnaryCall<GetAdoptionTrendRequest, GetAdoptionTrendResponse>,
          cb: sendUnaryData<GetAdoptionTrendResponse>
        ) => {
          receivedGroupBy = call.request.groupBy;
          cb(null, want);
        },
      })
    );

    const client = createPetsClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.getAdoptionTrend({ groupBy: 'month' }, new Metadata());
      expect(receivedGroupBy).toBe('month');
      expect(result.points).toEqual([{ date: '2026-01-01', count: 3 }]);
    } finally {
      client.close();
    }
  });

  // ── 4. Error contract ────────────────────────────────────────────

  it('get — NOT_FOUND from the server surfaces with .code === status.NOT_FOUND', async () => {
    port = await startServer(
      makeHandlers({
        get: (
          _call: ServerUnaryCall<GetPetRequest, GetPetResponse>,
          cb: sendUnaryData<GetPetResponse>
        ) => {
          cb(makeServiceError(status.NOT_FOUND, 'pet not found'), null);
        },
      })
    );

    const client = createPetsClient({ address: `127.0.0.1:${port}` });
    try {
      await client.get({ petId: 'missing' }, new Metadata());
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.NOT_FOUND);
    } finally {
      client.close();
    }
  });
});
