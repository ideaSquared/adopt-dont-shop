// Consumer-driven contract: gateway → applications.GetApplication
//
// Models the contract at the JSON message level. See ADR 0005 for rationale.

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';

// Repo-root pacts/ directory: test/contracts/ → test/ → gateway/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const pact = new MessageConsumerPact({
  consumer: 'service.gateway',
  provider: 'service.applications',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

// ---------------------------------------------------------------------------
// Types mirroring the proto-generated shapes the gateway consumes
// ---------------------------------------------------------------------------

type Application = {
  applicationId: string;
  adopterId: string;
  petId: string;
  rescueId: string;
  status: number; // ApplicationsV1.ApplicationStatus enum value
  answersJson: string; // JSON-encoded answers map
  referencesJson: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type GetApplicationResponse = {
  application: Application;
  timeline: unknown[];
};

// ---------------------------------------------------------------------------
// Assertion handler — proves the gateway can consume the response shape
// ---------------------------------------------------------------------------

function assertGetApplicationResponse(body: unknown): void {
  if (typeof body !== 'object' || body === null || !('application' in body)) {
    throw new Error(`GetApplicationResponse: missing required fields in: ${JSON.stringify(body)}`);
  }
  const resp = body as GetApplicationResponse;
  const app = resp.application;
  if (typeof app !== 'object' || app === null) {
    throw new Error('GetApplicationResponse: application must be an object');
  }

  const requiredStrings: Array<keyof Application> = [
    'applicationId',
    'adopterId',
    'petId',
    'rescueId',
    'answersJson',
    'referencesJson',
    'createdAt',
    'updatedAt',
  ];
  for (const field of requiredStrings) {
    if (typeof app[field] !== 'string' || (app[field] as string) === '') {
      throw new Error(`GetApplicationResponse: application.${field} must be a non-empty string`);
    }
  }
  if (typeof app.status !== 'number') {
    throw new Error('GetApplicationResponse: application.status must be a number');
  }
  if (typeof app.version !== 'number') {
    throw new Error('GetApplicationResponse: application.version must be a number');
  }
  if (!Array.isArray(resp.timeline)) {
    throw new Error('GetApplicationResponse: timeline must be an array');
  }
}

// ---------------------------------------------------------------------------
// Contract interactions
// ---------------------------------------------------------------------------

describe('gateway → applications contract: GetApplication', () => {
  // 1. Happy path — authorised owner reads their own application
  it('returns a GetApplicationResponse with a complete Application when the application exists', () => {
    const expectedResponse: GetApplicationResponse = {
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
    };

    return pact
      .given('application app-001 exists and is owned by adopter-001')
      .expectsToReceive('GetApplicationResponse with application data')
      .withContent(expectedResponse)
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          assertGetApplicationResponse(body);
          const resp = body as GetApplicationResponse;
          expect(resp.application.applicationId).toBe('app-001');
          expect(resp.application.adopterId).toBe('adopter-001');
          expect(resp.application.status).toBe(1);
          expect(resp.timeline).toEqual([]);
        })
      );
  });

  // 2. Error path — application not found → NOT_FOUND gRPC status
  it('returns an error descriptor with code NOT_FOUND when the application does not exist', () => {
    const errorResponse = {
      code: 'NOT_FOUND',
      message: 'application not found',
    };

    return pact
      .given('no application with id app-missing exists')
      .expectsToReceive('error descriptor with code NOT_FOUND for a missing application')
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
