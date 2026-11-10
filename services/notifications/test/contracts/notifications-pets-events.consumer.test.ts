// Consumer-driven contract: notifications → pets.statusChanged, pets.deleted
// (NATS events)
//
// service.notifications fans a pets.statusChanged notification out to every
// user who favourited the pet, looked up by petId, and logs pets.deleted with
// its petId and rescueId (src/nats/subscribers.ts). Each interaction pins
// only the fields the subscriber reads.
//
// Provider verification: services/pets/test/contracts/pets-events.provider.test.ts.
// See ADR 0005.

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MatchersV3, MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';

import type { PetDeletedEvent, PetStatusChangedEvent } from '../../src/nats/event-types.js';
import { buildPetStatusChangedCreate } from '../../src/nats/subscribers.js';
import { eventBody } from './event-body.js';

const { like } = MatchersV3;

// Repo-root pacts/ directory: test/contracts/ → test/ → notifications/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const pact = new MessageConsumerPact({
  consumer: 'service.notifications',
  provider: 'service.pets',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

describe('notifications consumer → pets: pets.statusChanged, pets.deleted', () => {
  it("tells a pet's favouriters about pets.statusChanged", () => {
    return pact
      .given('a rescue moves an available pet to pending')
      .expectsToReceive('pets.statusChanged event')
      .withContent({
        petId: like('pet-001'),
        rescueId: like('rescue-001'),
        fromStatus: like('available'),
        toStatus: like('pending'),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<PetStatusChangedEvent>('pets.statusChanged', body, [
            'petId',
            'rescueId',
            'fromStatus',
            'toStatus',
          ]);
          const create = buildPetStatusChangedCreate(event, 'usr-favouriter');
          expect(create.relatedEntityId).toBe('pet-001');
          expect(JSON.parse(create.dataJson)).toEqual({
            petId: 'pet-001',
            rescueId: 'rescue-001',
            fromStatus: 'available',
            toStatus: 'pending',
          });
        })
      );
  });

  it('logs pets.deleted with the pet and rescue ids', () => {
    return pact
      .given('a rescue deletes a pet')
      .expectsToReceive('pets.deleted event')
      .withContent({ petId: like('pet-001'), rescueId: like('rescue-001') })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<PetDeletedEvent>('pets.deleted', body, ['petId', 'rescueId']);
          expect(event.petId).toBe('pet-001');
          expect(event.rescueId).toBe('rescue-001');
        })
      );
  });
});
