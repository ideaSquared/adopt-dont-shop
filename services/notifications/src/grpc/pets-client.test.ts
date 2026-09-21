// Behaviour tests for the notifications pets-client. Mirrors the
// auth-client test: a real @grpc/grpc-js Server bound to 127.0.0.1:0 so
// there are no port conflicts; the server is torn down in afterEach.

import {
  Metadata,
  Server,
  ServerCredentials,
  ServerUnaryCall,
  sendUnaryData,
  ServiceError,
  status,
} from '@grpc/grpc-js';

import {
  PetsV1,
  type ListFavoritesForUserRequest,
  type ListFavoritesForUserResponse,
  type ListPetFavoritersRequest,
  type ListPetFavoritersResponse,
} from '@adopt-dont-shop/proto';
import {
  PRINCIPAL_TOKEN_HEADER,
  resetDefaultPrincipalSigningKeyForTests,
  verifyPrincipalToken,
} from '@adopt-dont-shop/service-bootstrap';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createPetsClient } from './pets-client.js';

const makeServiceError = (code: number, details: string): ServiceError => {
  const err = new Error(details) as ServiceError;
  err.code = code;
  err.details = details;
  err.metadata = new Metadata();
  return err;
};

describe('createPetsClient — deadline + retry behaviour', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = async (): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) =>
        err ? reject(err) : resolve(boundPort)
      );
    });

  it('rejects with DEADLINE_EXCEEDED when the server never responds', async () => {
    server.addService(PetsV1.PetServiceService, {
      listFavoriters: (
        _call: ServerUnaryCall<ListPetFavoritersRequest, ListPetFavoritersResponse>,
        _cb: sendUnaryData<ListPetFavoritersResponse>
      ) => {
        // Never call _cb — hung server.
      },
    });

    port = await startServer();
    const client = createPetsClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 200,
      maxRetries: 0,
    });

    try {
      await client.listFavoriters('pet-1');
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.DEADLINE_EXCEEDED);
    } finally {
      client.close();
    }
  });

  it('resolves with the user_ids on the second attempt after a transient UNAVAILABLE', async () => {
    let callCount = 0;
    server.addService(PetsV1.PetServiceService, {
      listFavoriters: (
        _call: ServerUnaryCall<ListPetFavoritersRequest, ListPetFavoritersResponse>,
        cb: sendUnaryData<ListPetFavoritersResponse>
      ) => {
        callCount += 1;
        if (callCount === 1) {
          cb(makeServiceError(status.UNAVAILABLE, 'service unavailable'), null);
        } else {
          cb(null, { userIds: ['usr-1', 'usr-2'] });
        }
      },
    });

    port = await startServer();
    const client = createPetsClient({ address: `127.0.0.1:${port}`, deadlineMs: 2_000 });

    try {
      const result = await client.listFavoriters('pet-1');
      expect(result).toEqual(['usr-1', 'usr-2']);
      expect(callCount).toBe(2);
    } finally {
      client.close();
    }
  });
});

describe('createPetsClient — signed system principal (ADS-800)', () => {
  const SIGNING_KEY = 'notifications-test-signing-key';
  let server: Server;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    delete process.env.PRINCIPAL_SIGNING_KEY;
    resetDefaultPrincipalSigningKeyForTests();
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startCapturingServer = async (): Promise<{ port: number; captured: Metadata[] }> => {
    const captured: Metadata[] = [];
    server.addService(PetsV1.PetServiceService, {
      listFavoriters: (
        call: ServerUnaryCall<ListPetFavoritersRequest, ListPetFavoritersResponse>,
        cb: sendUnaryData<ListPetFavoritersResponse>
      ) => {
        captured.push(call.metadata);
        cb(null, { userIds: [] });
      },
    });
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) =>
        err ? reject(err) : resolve(boundPort)
      );
    });
    return { port, captured };
  };

  it('stamps a verifiable x-principal-token carrying pets.favoriters.list:any + pets.favorites.list:any', async () => {
    process.env.PRINCIPAL_SIGNING_KEY = SIGNING_KEY;
    resetDefaultPrincipalSigningKeyForTests();

    const { port, captured } = await startCapturingServer();
    const client = createPetsClient({ address: `127.0.0.1:${port}` });
    try {
      await client.listFavoriters('pet-1');
      expect(captured).toHaveLength(1);
      const token = String(captured[0].get(PRINCIPAL_TOKEN_HEADER)[0]);
      const principal = verifyPrincipalToken(token, SIGNING_KEY);
      expect(principal.userId).toBe('svc-notifications');
      expect(principal.permissions).toEqual([
        'pets.favoriters.list:any',
        'pets.favorites.list:any',
      ]);
    } finally {
      client.close();
    }
  });
});

describe('createPetsClient — listFavoritesForUser (ADS-1270)', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const minimalPet = {
    petId: 'pet-1',
    name: 'Rex',
    type: PetsV1.PetType.PET_TYPE_DOG,
    status: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
    gender: PetsV1.PetGender.PET_GENDER_MALE,
    size: PetsV1.PetSize.PET_SIZE_MEDIUM,
    ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
    archived: false,
    featured: false,
    priorityListing: false,
    specialNeeds: false,
    houseTrained: true,
    temperamentJson: '',
    tagsJson: '',
    extraJson: '',
    viewCount: 0,
    favoriteCount: 0,
    applicationCount: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };

  it('sends user_id and resolves with the returned pets', async () => {
    let received: ListFavoritesForUserRequest | undefined;
    server.addService(PetsV1.PetServiceService, {
      listFavoritesForUser: (
        call: ServerUnaryCall<ListFavoritesForUserRequest, ListFavoritesForUserResponse>,
        cb: sendUnaryData<ListFavoritesForUserResponse>
      ) => {
        received = call.request;
        cb(null, { pets: [minimalPet] });
      },
    });
    port = await new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) =>
        err ? reject(err) : resolve(boundPort)
      );
    });

    const client = createPetsClient({ address: `127.0.0.1:${port}` });
    try {
      const pets = await client.listFavoritesForUser('usr-1');
      expect(received?.userId).toBe('usr-1');
      expect(pets).toHaveLength(1);
      expect(pets[0].petId).toBe('pet-1');
      expect(pets[0].name).toBe('Rex');
    } finally {
      client.close();
    }
  });
});
