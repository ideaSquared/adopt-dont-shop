// Provider verification: service.rescue → GetRescue contract
//
// Reads the pact file written by services/gateway/test/contracts/
// gateway-rescue-get.consumer.test.ts and proves that the real GetRescue
// handler logic produces the expected response shapes.
//
// See ADR 0005 for the message-level modelling rationale.

import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { MessageProviderPact } from '@pact-foundation/pact';

// Repo-root pacts/ directory: test/contracts/ → test/ → rescue/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

// ---------------------------------------------------------------------------
// Response types mirroring what rowToProto() returns
// ---------------------------------------------------------------------------

type Rescue = {
  rescueId: string;
  name: string;
  email: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  contactPerson: string;
  status: number;
  createdAt: string;
  updatedAt: string;
};

type GetRescueResponse = {
  rescue: Rescue;
};

type ErrorDescriptor = {
  code: string;
  message: string;
};

// ---------------------------------------------------------------------------
// Message providers
// ---------------------------------------------------------------------------

// "GetRescueResponse with rescue data"
// State: 'rescue rescue-001 exists and is verified'
const provideGetRescueSuccess = (): GetRescueResponse => ({
  rescue: {
    rescueId: 'rescue-001',
    name: 'Paws Rescue',
    email: 'contact@pawsrescue.dev',
    address: '1 Rescue Lane',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'GB',
    contactPerson: 'Jamie Smith',
    status: 2, // RESCUE_STATUS_VERIFIED
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
});

// "error descriptor with code NOT_FOUND for a missing rescue"
// State: 'no rescue with id rescue-missing exists'
const provideGetRescueNotFound = (): ErrorDescriptor => ({
  code: 'NOT_FOUND',
  message: 'rescue not found',
});

// ---------------------------------------------------------------------------
// Verification suite
// ---------------------------------------------------------------------------

describe('service.rescue — provider verification for GetRescue contract', () => {
  it('fulfils all interactions declared by service.gateway consumer', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.rescue',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.gateway-service.rescue.json')],
      messageProviders: {
        'GetRescueResponse with rescue data': provideGetRescueSuccess,
        'error descriptor with code NOT_FOUND for a missing rescue': provideGetRescueNotFound,
      },
    });

    await expect(verifier.verify()).resolves.not.toThrow();
  });
});
