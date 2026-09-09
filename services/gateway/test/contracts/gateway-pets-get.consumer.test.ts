// Consumer-driven contract: gateway → pets.GetPet
//
// Models the contract at the JSON message level. See ADR 0005 for rationale.

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';

// Repo-root pacts/ directory: test/contracts/ → test/ → gateway/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const pact = new MessageConsumerPact({
  consumer: 'service.gateway',
  provider: 'service.pets',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

// ---------------------------------------------------------------------------
// Types mirroring the proto-generated shapes the gateway consumes
// ---------------------------------------------------------------------------

type Pet = {
  petId: string;
  name: string;
  rescueId?: string;
  type: number; // PetsV1.PetType enum value
  status: number; // PetsV1.PetStatus enum value
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

type GetPetResponse = {
  pet: Pet;
};

// ---------------------------------------------------------------------------
// Assertion handler — proves the gateway can consume the response shape
// ---------------------------------------------------------------------------

function assertGetPetResponse(body: unknown): void {
  if (typeof body !== 'object' || body === null || !('pet' in body)) {
    throw new Error(`GetPetResponse: missing required fields in: ${JSON.stringify(body)}`);
  }
  const resp = body as GetPetResponse;
  const pet = resp.pet;
  if (typeof pet !== 'object' || pet === null) {
    throw new Error('GetPetResponse: pet must be an object');
  }

  const requiredStrings: Array<keyof Pet> = ['petId', 'name', 'createdAt', 'updatedAt'];
  for (const field of requiredStrings) {
    if (typeof pet[field] !== 'string' || (pet[field] as string) === '') {
      throw new Error(`GetPetResponse: pet.${field} must be a non-empty string`);
    }
  }
  if (typeof pet.type !== 'number') {
    throw new Error('GetPetResponse: pet.type must be a number');
  }
  if (typeof pet.status !== 'number') {
    throw new Error('GetPetResponse: pet.status must be a number');
  }
  if (typeof pet.archived !== 'boolean') {
    throw new Error('GetPetResponse: pet.archived must be a boolean');
  }
}

// ---------------------------------------------------------------------------
// Contract interactions
// ---------------------------------------------------------------------------

describe('gateway → pets contract: GetPet', () => {
  // 1. Happy path — an available, unarchived pet is readable
  it('returns a GetPetResponse with a complete Pet when the pet exists and is visible', () => {
    const expectedResponse: GetPetResponse = {
      pet: {
        petId: 'pet-001',
        name: 'Buddy',
        rescueId: 'rescue-001',
        type: 1, // PET_TYPE_DOG
        status: 1, // PET_STATUS_AVAILABLE
        archived: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    };

    return pact
      .given('pet pet-001 exists, is available, and is not archived')
      .expectsToReceive('GetPetResponse with pet data')
      .withContent(expectedResponse)
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          assertGetPetResponse(body);
          const resp = body as GetPetResponse;
          expect(resp.pet.petId).toBe('pet-001');
          expect(resp.pet.name).toBe('Buddy');
          expect(resp.pet.status).toBe(1);
          expect(resp.pet.archived).toBe(false);
        })
      );
  });

  // 2. Error path — pet not found (or hidden from this reader) → NOT_FOUND
  it('returns an error descriptor with code NOT_FOUND when the pet does not exist', () => {
    const errorResponse = {
      code: 'NOT_FOUND',
      message: 'pet not found',
    };

    return pact
      .given('no pet with id pet-missing exists')
      .expectsToReceive('error descriptor with code NOT_FOUND for a missing pet')
      .withContent(errorResponse)
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          if (
            typeof body !== 'object' ||
            body === null ||
            !('code' in body) ||
            !('message' in body)
          ) {
            throw new Error(`Error response: missing required fields in: ${JSON.stringify(body)}`);
          }
          const err = body as typeof errorResponse;
          expect(err.code).toBe('NOT_FOUND');
          expect(typeof err.message).toBe('string');
        })
      );
  });
});
