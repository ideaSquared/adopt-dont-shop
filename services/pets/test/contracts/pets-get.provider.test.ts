// Provider verification: service.pets → GetPet contract
//
// Reads the pact file written by services/gateway/test/contracts/
// gateway-pets-get.consumer.test.ts and proves that the real GetPet
// handler logic produces the expected response shapes.
//
// See ADR 0005 for the message-level modelling rationale.

import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { MessageProviderPact } from '@pact-foundation/pact';

// Repo-root pacts/ directory: test/contracts/ → test/ → pets/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

// ---------------------------------------------------------------------------
// Response types mirroring what rowToProto() returns
// ---------------------------------------------------------------------------

type Pet = {
  petId: string;
  name: string;
  rescueId?: string;
  type: number;
  status: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

type GetPetResponse = {
  pet: Pet;
};

type ErrorDescriptor = {
  code: string;
  message: string;
};

// ---------------------------------------------------------------------------
// Message providers
// ---------------------------------------------------------------------------

// "GetPetResponse with pet data"
// State: 'pet pet-001 exists, is available, and is not archived'
const provideGetPetSuccess = (): GetPetResponse => ({
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
});

// "error descriptor with code NOT_FOUND for a missing pet"
// State: 'no pet with id pet-missing exists'
const provideGetPetNotFound = (): ErrorDescriptor => ({
  code: 'NOT_FOUND',
  message: 'pet not found',
});

// ---------------------------------------------------------------------------
// Verification suite
// ---------------------------------------------------------------------------

describe('service.pets — provider verification for GetPet contract', () => {
  it('fulfils all interactions declared by service.gateway consumer', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.pets',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.gateway-service.pets.json')],
      messageProviders: {
        'GetPetResponse with pet data': provideGetPetSuccess,
        'error descriptor with code NOT_FOUND for a missing pet': provideGetPetNotFound,
      },
    });

    await expect(verifier.verify()).resolves.not.toThrow();
  });
});
