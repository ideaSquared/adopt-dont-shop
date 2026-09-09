// Consumer-driven contract: gateway → rescue.GetRescue
//
// Models the contract at the JSON message level. See ADR 0005 for rationale.

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';

// Repo-root pacts/ directory: test/contracts/ → test/ → gateway/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const pact = new MessageConsumerPact({
  consumer: 'service.gateway',
  provider: 'service.rescue',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

// ---------------------------------------------------------------------------
// Types mirroring the proto-generated shapes the gateway consumes
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
  status: number; // RescueV1.RescueStatus enum value
  createdAt: string;
  updatedAt: string;
};

type GetRescueResponse = {
  rescue: Rescue;
};

// ---------------------------------------------------------------------------
// Assertion handler — proves the gateway can consume the response shape
// ---------------------------------------------------------------------------

function assertGetRescueResponse(body: unknown): void {
  if (typeof body !== 'object' || body === null || !('rescue' in body)) {
    throw new Error(`GetRescueResponse: missing required fields in: ${JSON.stringify(body)}`);
  }
  const resp = body as GetRescueResponse;
  const rescue = resp.rescue;
  if (typeof rescue !== 'object' || rescue === null) {
    throw new Error('GetRescueResponse: rescue must be an object');
  }

  const requiredStrings: Array<keyof Rescue> = [
    'rescueId',
    'name',
    'email',
    'address',
    'city',
    'postcode',
    'country',
    'contactPerson',
    'createdAt',
    'updatedAt',
  ];
  for (const field of requiredStrings) {
    if (typeof rescue[field] !== 'string' || (rescue[field] as string) === '') {
      throw new Error(`GetRescueResponse: rescue.${field} must be a non-empty string`);
    }
  }
  if (typeof rescue.status !== 'number') {
    throw new Error('GetRescueResponse: rescue.status must be a number');
  }
}

// ---------------------------------------------------------------------------
// Contract interactions
// ---------------------------------------------------------------------------

describe('gateway → rescue contract: GetRescue', () => {
  // 1. Happy path — a verified rescue is publicly readable
  it('returns a GetRescueResponse with a complete Rescue when the rescue is verified', () => {
    const expectedResponse: GetRescueResponse = {
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
    };

    return pact
      .given('rescue rescue-001 exists and is verified')
      .expectsToReceive('GetRescueResponse with rescue data')
      .withContent(expectedResponse)
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          assertGetRescueResponse(body);
          const resp = body as GetRescueResponse;
          expect(resp.rescue.rescueId).toBe('rescue-001');
          expect(resp.rescue.name).toBe('Paws Rescue');
          expect(resp.rescue.status).toBe(2);
        })
      );
  });

  // 2. Error path — rescue not found (or not yet verified, for a public
  // reader) → NOT_FOUND, so existence of an unverified rescue isn't leaked.
  it('returns an error descriptor with code NOT_FOUND when the rescue does not exist', () => {
    const errorResponse = {
      code: 'NOT_FOUND',
      message: 'rescue not found',
    };

    return pact
      .given('no rescue with id rescue-missing exists')
      .expectsToReceive('error descriptor with code NOT_FOUND for a missing rescue')
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
