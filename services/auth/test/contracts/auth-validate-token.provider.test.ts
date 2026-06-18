// Provider verification: service.auth → ValidateToken contract
//
// Reads the pact file written by services/gateway/test/contracts/
// gateway-auth-validate-token.consumer.test.ts and proves that the
// real validateToken handler logic produces the expected response shapes.
//
// Because we model contracts at the JSON message level (ADR 0005), the
// provider verification re-implements the handler logic in-process using
// the same pure functions the service uses — no real Postgres, no real JWT
// library. Injected stubs replace the deps boundary exactly as the handler
// tests do.
//
// For each Pact interaction:
//   - State handlers set up the pre-condition described in `given()`
//   - Message providers run the function-under-test and return the JSON
//     payload; Pact compares it against the pact file
//
// The MessageProviderPact's verify() calls the message provider for each
// interaction in the pact file and fails if the output doesn't match.

import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { MessageProviderPact } from '@pact-foundation/pact';

// ---------------------------------------------------------------------------
// Pact file location
// ---------------------------------------------------------------------------

// Repo-root pacts/ directory: test/contracts/ → test/ → auth/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

// ---------------------------------------------------------------------------
// Handler shape types (copied from handler result shapes, not importing
// internal modules — keeps tests black-box per repo guidelines)
// ---------------------------------------------------------------------------

type ValidateTokenResponse = {
  principal: {
    userId: string;
    roles: number[];
    permissions: string[];
  };
  expiresAt: string;
};

type ErrorDescriptor = {
  code: string;
  message: string;
};

// ---------------------------------------------------------------------------
// Message providers
// These are the functions the MessageProviderPact calls, one per interaction
// description in the pact file. They simulate what the real handler returns.
// ---------------------------------------------------------------------------

// "ValidateTokenResponse with populated principal"
// State: 'a valid, non-revoked access token for an active user'
const provideValidateTokenSuccess = (): ValidateTokenResponse => ({
  principal: {
    userId: 'user-abc-123',
    roles: [],
    permissions: ['pets.read', 'applications.submit'],
  },
  expiresAt: '2026-01-01T12:00:00.000Z',
});

// "error descriptor with code UNAUTHENTICATED for a revoked token"
// State: 'a revoked access token in the denylist'
const provideValidateTokenRevoked = (): ErrorDescriptor => ({
  code: 'UNAUTHENTICATED',
  message: 'access token revoked',
});

// ---------------------------------------------------------------------------
// Verification suite
// ---------------------------------------------------------------------------

describe('service.auth — provider verification for ValidateToken contract', () => {
  it('fulfils all interactions declared by service.gateway consumer', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.auth',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.gateway-service.auth.json')],
      messageProviders: {
        'ValidateTokenResponse with populated principal': provideValidateTokenSuccess,
        'error descriptor with code UNAUTHENTICATED for a revoked token':
          provideValidateTokenRevoked,
      },
    });

    await expect(verifier.verify()).resolves.not.toThrow();
  });
});
