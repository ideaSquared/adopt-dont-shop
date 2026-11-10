// Consumer-driven contract: moderation → pets.created (NATS event)
//
// service.moderation scans every new pet listing's free text for scam / spam
// patterns (src/nats/subscribers.ts). The pets.created handler reads petId
// (the reported entity), rescueId (for the report description) and the
// shortDescription / longDescription it scans. These fields once shipped
// missing from the event, so the scanner saw empty text and never fired.
// This contract pins exactly the fields the handler reads.
//
// Provider verification: services/pets/test/contracts/pets-events.provider.test.ts.
// See ADR 0005.

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MatchersV3, MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';

import { scanContent } from '../../src/nats/content-scanner.js';
import type { PetCreatedEvent } from '../../src/nats/event-types.js';

const { like } = MatchersV3;

// Repo-root pacts/ directory: test/contracts/ → test/ → moderation/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const pact = new MessageConsumerPact({
  consumer: 'service.moderation',
  provider: 'service.pets',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

// The fields the pets.created handler reads, checked the way it uses them.
function assertPetCreated(body: unknown): PetCreatedEvent {
  if (typeof body !== 'object' || body === null) {
    throw new Error(`pets.created: body must be an object, got: ${JSON.stringify(body)}`);
  }
  // Narrowed to a non-null object above; each field is still checked individually.
  const { petId, rescueId, shortDescription, longDescription } = body as Record<string, unknown>;
  if (typeof petId !== 'string' || petId === '') {
    throw new Error('pets.created: petId must be a non-empty string');
  }
  if (typeof rescueId !== 'string') {
    throw new Error('pets.created: rescueId must be a string');
  }
  if (typeof shortDescription !== 'string' || typeof longDescription !== 'string') {
    throw new Error('pets.created: shortDescription and longDescription must be strings');
  }
  return { petId, rescueId, shortDescription, longDescription };
}

describe('moderation consumer → pets: pets.created', () => {
  it("scans a new listing's descriptions from pets.created", () => {
    return pact
      .given('a rescue lists a pet with descriptions')
      .expectsToReceive('pets.created event with descriptions')
      .withContent({
        petId: like('pet-001'),
        rescueId: like('rescue-001'),
        shortDescription: like('Friendly lab'),
        longDescription: like('Send a deposit by wire transfer to reserve him today.'),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = assertPetCreated(body);
          const text = [event.shortDescription, event.longDescription].join('\n');
          // The scanner sees the listing text the event carries.
          expect(scanContent(text)).not.toBeNull();
        })
      );
  });
});
