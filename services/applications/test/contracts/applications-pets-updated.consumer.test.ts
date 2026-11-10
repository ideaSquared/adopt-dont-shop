// Consumer-driven contract: applications → pets.updated (NATS event)
//
// service.applications keeps a copy of each pet's type and breed on its
// applications read model (migration 016) and follows changes through the
// pets.updated subscriber (src/nats/pet-updates.ts). The subscriber reads
// petId, type, breed and version, and ignores an event missing any of the
// required ones — so a producer that drops a field makes the copy go stale
// silently. This contract pins exactly those fields.
//
// The message is fed to the real applyPetUpdate(), so the contract fails if
// the subscriber would ignore it. Provider verification:
// services/pets/test/contracts/pets-events.provider.test.ts. See ADR 0005.

import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { asynchronousBodyHandler, MatchersV3, MessageConsumerPact } from '@pact-foundation/pact';

import { applyPetUpdate } from '../../src/nats/pet-updates.js';

const { integer, like } = MatchersV3;

// Repo-root pacts/ directory: test/contracts/ → test/ → applications/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const pact = new MessageConsumerPact({
  consumer: 'service.applications',
  provider: 'service.pets',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

describe('applications consumer → pets: pets.updated', () => {
  it("applies a pets.updated event to the pet's copied type and breed", () => {
    return pact
      .given('a pet with a breed is edited')
      .expectsToReceive('pets.updated event')
      .withContent({
        petId: like('pet-001'),
        type: like('dog'),
        breed: like('Labrador Retriever'),
        version: integer(5),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        asynchronousBodyHandler(async body => {
          const query = vi.fn().mockResolvedValue({ rows: [] });
          // A query spy stands in for the pool: the effect is the UPDATE it issues.
          await applyPetUpdate({ query } as unknown as Pool, body);

          expect(query).toHaveBeenCalledTimes(1);
          expect(query.mock.calls[0][1]).toEqual(['dog', 'Labrador Retriever', 'pet-001', 5]);
        })
      );
  });
});
