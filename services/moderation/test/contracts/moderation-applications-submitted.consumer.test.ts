// Consumer-driven contract: moderation → applications.submitted (NATS event)
//
// service.moderation scans the adopter's free-text "why adopt" answer on every
// submitted application (src/nats/subscribers.ts). The handler reads
// applicationId (the reported entity), adopterId (the reported user) and
// whyAdopt (the text it scans). The event once carried no answer text, so the
// scanner never fired. This contract pins exactly the fields the handler reads.
//
// Provider verification:
// services/applications/test/contracts/applications-events.provider.test.ts.
// See ADR 0005.

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MatchersV3, MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';

import { scanContent } from '../../src/nats/content-scanner.js';

const { like } = MatchersV3;

// Repo-root pacts/ directory: test/contracts/ → test/ → moderation/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const pact = new MessageConsumerPact({
  consumer: 'service.moderation',
  provider: 'service.applications',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

type ScannedApplication = { applicationId: string; adopterId: string; whyAdopt: string };

// The fields the applications.submitted handler reads, checked the way it uses them.
function assertSubmitted(payload: unknown): ScannedApplication {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error(
      `applications.submitted: body must be an object, got: ${JSON.stringify(payload)}`
    );
  }
  // Narrowed to a non-null object above; each field is still checked individually.
  const { applicationId, adopterId, whyAdopt } = payload as Record<string, unknown>;
  if (typeof applicationId !== 'string' || applicationId === '') {
    throw new Error('applications.submitted: applicationId must be a non-empty string');
  }
  if (typeof adopterId !== 'string' || adopterId === '') {
    throw new Error('applications.submitted: adopterId must be a non-empty string');
  }
  if (typeof whyAdopt !== 'string') {
    throw new Error('applications.submitted: whyAdopt must be a string');
  }
  return { applicationId, adopterId, whyAdopt };
}

describe('moderation consumer → applications: applications.submitted', () => {
  it("scans the adopter's why-adopt answer from applications.submitted", () => {
    return pact
      .given('an adopter submits an application with a why-adopt answer')
      .expectsToReceive('applications.submitted event with a why-adopt answer')
      .withContent({
        applicationId: like('app-001'),
        adopterId: like('usr-adopter'),
        whyAdopt: like('Send a deposit by wire transfer to reserve him today.'),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(payload => {
          const event = assertSubmitted(payload);
          // The scanner sees the answer text the event carries.
          expect(scanContent(event.whyAdopt)).not.toBeNull();
        })
      );
  });
});
