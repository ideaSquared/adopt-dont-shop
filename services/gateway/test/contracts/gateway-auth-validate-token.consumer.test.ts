// Consumer-driven contract: gateway → auth.ValidateToken
//
// Models the contract at the JSON message level (not binary gRPC) because
// the Pact gRPC plugin requires native binaries that are not viable in this
// monorepo's CI environment. See ADR 0005 for the full rationale.
//
// Each "message" represents one RPC interaction:
//   - request: the JSON object the gateway sends as the gRPC request proto
//   - response: the JSON object the gateway expects back
//
// The consumer test writes a pact file to ../../pacts/.
// The provider verification test (services/auth/test/contracts/) reads that
// file and proves the real handler fulfils every interaction.

import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';

// ---------------------------------------------------------------------------
// Pact file location — shared with provider verifier
// ---------------------------------------------------------------------------

// Repo-root pacts/ directory: test/contracts/ → test/ → gateway/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

// ---------------------------------------------------------------------------
// Consumer pact configuration
// ---------------------------------------------------------------------------

const pact = new MessageConsumerPact({
  consumer: 'service.gateway',
  provider: 'service.auth',
  dir: PACT_DIR,
  logLevel: 'warn',
  // Write "update" so multiple test files can contribute interactions to the
  // same pact file (merging by description key).
  pactfileWriteMode: 'update',
});

// ---------------------------------------------------------------------------
// Helper: schema assertion run by synchronousBodyHandler
// ---------------------------------------------------------------------------

type ValidateTokenRequest = {
  accessToken: string;
};

type ValidateTokenResponse = {
  principal: {
    userId: string;
    roles: number[];
    permissions: string[];
  };
  expiresAt: string;
};

function assertValidateTokenResponse(body: unknown): void {
  // Runtime assertion inside the handler proves the message shape matches what
  // the gateway code actually consumes. If the provider drifts (e.g. renames
  // "userId" to "user_id") this handler throws and the test fails.
  if (
    typeof body !== 'object' ||
    body === null ||
    !('principal' in body) ||
    !('expiresAt' in body)
  ) {
    throw new Error(`ValidateTokenResponse: missing required fields in: ${JSON.stringify(body)}`);
  }
  const resp = body as ValidateTokenResponse;

  if (typeof resp.principal !== 'object' || resp.principal === null) {
    throw new Error('ValidateTokenResponse: principal must be an object');
  }
  if (typeof resp.principal.userId !== 'string' || resp.principal.userId === '') {
    throw new Error('ValidateTokenResponse: principal.userId must be a non-empty string');
  }
  if (!Array.isArray(resp.principal.permissions)) {
    throw new Error('ValidateTokenResponse: principal.permissions must be an array');
  }
  if (typeof resp.expiresAt !== 'string' || resp.expiresAt === '') {
    throw new Error('ValidateTokenResponse: expiresAt must be a non-empty ISO-8601 string');
  }
}

// ---------------------------------------------------------------------------
// Contract interactions
// ---------------------------------------------------------------------------

describe('gateway → auth contract: ValidateToken', () => {
  // 1. Happy path — valid token → principal returned
  it('returns a ValidateTokenResponse with a non-empty principal when the token is valid', () => {
    const request: ValidateTokenRequest = {
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.stub-claims.stub-sig',
    };
    const expectedResponse: ValidateTokenResponse = {
      principal: {
        userId: 'user-abc-123',
        roles: [],
        permissions: ['pets.read', 'applications.submit'],
      },
      expiresAt: '2026-01-01T12:00:00.000Z',
    };

    return pact
      .given('a valid, non-revoked access token for an active user')
      .expectsToReceive('ValidateTokenResponse with populated principal')
      .withContent(expectedResponse)
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          assertValidateTokenResponse(body);
          const resp = body as ValidateTokenResponse;
          expect(resp.principal.userId).toBe('user-abc-123');
          expect(resp.principal.permissions).toContain('pets.read');
          expect(resp.expiresAt).toBe('2026-01-01T12:00:00.000Z');
        })
      );
  });

  // 2. Error path — expired / revoked token → UNAUTHENTICATED gRPC status
  // We model error payloads as a metadata-annotated message so the provider
  // can document the error shape without needing gRPC wire encoding.
  it('returns an error descriptor when the token is revoked', () => {
    const errorResponse = {
      code: 'UNAUTHENTICATED',
      message: 'access token revoked',
    };

    return pact
      .given('a revoked access token in the denylist')
      .expectsToReceive('error descriptor with code UNAUTHENTICATED for a revoked token')
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
          expect(err.code).toBe('UNAUTHENTICATED');
          expect(typeof err.message).toBe('string');
        })
      );
  });

  afterAll(async () => {
    // pact.finalize() is implicit on the MessageConsumerPact — each verify()
    // call writes the interaction to the pact file. Nothing more needed.
  });
});
