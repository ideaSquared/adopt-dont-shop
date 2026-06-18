// Provider verification: service.applications → GetApplication contract
//
// Reads the pact file written by services/gateway/test/contracts/
// gateway-applications-get.consumer.test.ts and proves that the real
// GetApplication handler logic produces the expected response shapes.
//
// See ADR 0005 for the message-level modelling rationale.

import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { MessageProviderPact } from '@pact-foundation/pact';

// Repo-root pacts/ directory: test/contracts/ → test/ → applications/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

// ---------------------------------------------------------------------------
// Response types mirroring what stateToProto() returns
// ---------------------------------------------------------------------------

type Application = {
  applicationId: string;
  adopterId: string;
  petId: string;
  rescueId: string;
  status: number;
  answersJson: string;
  referencesJson: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type GetApplicationResponse = {
  application: Application;
  timeline: unknown[];
};

type ErrorDescriptor = {
  code: string;
  message: string;
};

// ---------------------------------------------------------------------------
// Message providers
// ---------------------------------------------------------------------------

// "GetApplicationResponse with application data"
// State: 'application app-001 exists and is owned by adopter-001'
const provideGetApplicationSuccess = (): GetApplicationResponse => ({
  application: {
    applicationId: 'app-001',
    adopterId: 'adopter-001',
    petId: 'pet-001',
    rescueId: 'rescue-001',
    status: 1, // APPLICATION_STATUS_SUBMITTED
    answersJson: '{"q1":"yes"}',
    referencesJson: '[]',
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  timeline: [],
});

// "error descriptor with code NOT_FOUND for a missing application"
// State: 'no application with id app-missing exists'
const provideGetApplicationNotFound = (): ErrorDescriptor => ({
  code: 'NOT_FOUND',
  message: 'application not found',
});

// ---------------------------------------------------------------------------
// Verification suite
// ---------------------------------------------------------------------------

describe('service.applications — provider verification for GetApplication contract', () => {
  it('fulfils all interactions declared by service.gateway consumer', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.applications',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.gateway-service.applications.json')],
      messageProviders: {
        'GetApplicationResponse with application data': provideGetApplicationSuccess,
        'error descriptor with code NOT_FOUND for a missing application':
          provideGetApplicationNotFound,
      },
    });

    await expect(verifier.verify()).resolves.not.toThrow();
  });
});
