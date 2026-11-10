// Provider verification: service.pets → pets.* NATS events
//
// Reads the pact files written by the consumers of service.pets' events:
//   - service.applications (pets.updated)
//     services/applications/test/contracts/applications-pets-updated.consumer.test.ts
//   - service.moderation (pets.created)
//     services/moderation/test/contracts/moderation-pets-created.consumer.test.ts
//   - service.notifications (pets.statusChanged, pets.deleted)
//     services/notifications/test/contracts/notifications-pets-events.consumer.test.ts
//
// Each message provider runs the real handler that publishes the event, with
// a stubbed pool and a NATS double, and returns the payload it actually
// published. A field dropped or renamed in the handler's publish() call
// fails verification. See ADR 0005.

import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { MessageProviderPact } from '@pact-foundation/pact';

import type { UserId } from '@adopt-dont-shop/lib.types';
import { PetsV1 } from '@adopt-dont-shop/proto';
import { makeNatsDouble, testPrincipal } from '@adopt-dont-shop/test-utils';

import {
  createPet,
  deletePet,
  updatePet,
  updatePetStatus,
  type HandlerDeps,
} from '../../src/grpc/handlers.js';
import type { RescueClient } from '../../src/grpc/rescue-client.js';

// Repo-root pacts/ directory: test/contracts/ → test/ → pets/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const RESCUE_ID = 'rescue-001';

// super_admin skips the rescue-service membership lookups, which have no
// bearing on the event payload.
const ADMIN = testPrincipal({ userId: 'usr-admin' as UserId, roles: ['super_admin'] });

function petRow(overrides: Record<string, unknown> = {}) {
  return {
    pet_id: 'pet-001',
    name: 'Rex',
    rescue_id: RESCUE_ID,
    type: 'dog',
    status: 'available',
    gender: 'male',
    size: 'large',
    age_group: 'adult',
    breed_id: null,
    secondary_breed_id: null,
    short_description: null,
    long_description: null,
    age_years: 3,
    age_months: null,
    color: 'brown',
    archived: false,
    featured: false,
    priority_listing: false,
    adoption_fee_minor: 5000,
    adoption_fee_currency: 'GBP',
    special_needs: false,
    house_trained: true,
    temperament: ['friendly'],
    tags: [],
    good_with_children: true,
    good_with_dogs: true,
    good_with_cats: null,
    good_with_small_animals: null,
    medical_notes: null,
    behavioral_notes: null,
    view_count: 0,
    favorite_count: 0,
    application_count: 0,
    available_since: new Date('2026-06-01T00:00:00Z'),
    adopted_date: null,
    extra_json: {},
    version: 4,
    created_at: new Date('2026-06-01T00:00:00Z'),
    updated_at: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  };
}

// Every query — the handler's own and withTransaction's outbox plumbing —
// answers with the given pet row.
function depsReturning(row: ReturnType<typeof petRow>) {
  const query = vi.fn().mockResolvedValue({ rows: [row], rowCount: 1 });
  const client = { query, release: vi.fn() };
  const pool = { connect: vi.fn().mockResolvedValue(client), query };
  const nats = makeNatsDouble();
  const deps: HandlerDeps = {
    // Only query/connect are exercised; the rest of pg.Pool is unused here.
    pool: pool as unknown as Pool,
    nats: nats.connection,
    // super_admin never reaches the rescue client.
    rescueClient: {} as RescueClient,
  };
  return { deps, nats };
}

function payloadPublishedOn(nats: ReturnType<typeof makeNatsDouble>, subject: string): unknown {
  const call = nats.published.find(c => c.subject === subject);
  if (!call?.data) {
    throw new Error(`nothing was published on ${subject}`);
  }
  const envelope: { payload: unknown } = JSON.parse(new TextDecoder().decode(call.data));
  return envelope.payload;
}

// --- Message providers ---------------------------------------------------

// "pets.updated event" — state: 'a pet with a breed is edited'
async function providePetUpdated(): Promise<unknown> {
  const { deps, nats } = depsReturning(
    petRow({ extra_json: { breed: 'Labrador Retriever' }, version: 5 })
  );
  await updatePet(
    deps,
    ADMIN,
    PetsV1.UpdatePetRequest.fromPartial({ petId: 'pet-001', name: 'Rexy' })
  );
  return payloadPublishedOn(nats, 'pets.updated');
}

// "pets.created event with descriptions" — state: 'a rescue lists a pet with descriptions'
async function providePetCreated(): Promise<unknown> {
  const { deps, nats } = depsReturning(petRow());
  await createPet(deps, ADMIN, {
    name: 'Rex',
    rescueId: RESCUE_ID,
    type: PetsV1.PetType.PET_TYPE_DOG,
    gender: PetsV1.PetGender.PET_GENDER_MALE,
    size: PetsV1.PetSize.PET_SIZE_LARGE,
    ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
    specialNeeds: false,
    houseTrained: true,
    temperamentJson: '[]',
    tagsJson: '[]',
    extraJson: '{}',
    shortDescription: 'Friendly lab',
    longDescription: 'Send a deposit by wire transfer to reserve him today.',
  });
  return payloadPublishedOn(nats, 'pets.created');
}

// "pets.statusChanged event" — state: 'a rescue moves an available pet to pending'
async function providePetStatusChanged(): Promise<unknown> {
  const { deps, nats } = depsReturning(petRow({ status: 'available' }));
  await updatePetStatus(deps, ADMIN, {
    petId: 'pet-001',
    toStatus: PetsV1.PetStatus.PET_STATUS_PENDING,
  });
  return payloadPublishedOn(nats, 'pets.statusChanged');
}

// "pets.deleted event" — state: 'a rescue deletes a pet'
async function providePetDeleted(): Promise<unknown> {
  const { deps, nats } = depsReturning(petRow());
  await deletePet(deps, ADMIN, { petId: 'pet-001' });
  return payloadPublishedOn(nats, 'pets.deleted');
}

// --- Verification suites -------------------------------------------------

describe('service.pets — provider verification for pets.* events', () => {
  it('fulfils the pets.updated interaction declared by service.applications', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.pets',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.applications-service.pets.json')],
      messageProviders: { 'pets.updated event': providePetUpdated },
    });
    await expect(verifier.verify()).resolves.not.toThrow();
  });

  it('fulfils the pets.created interaction declared by service.moderation', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.pets',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.moderation-service.pets.json')],
      messageProviders: { 'pets.created event with descriptions': providePetCreated },
    });
    await expect(verifier.verify()).resolves.not.toThrow();
  });

  it('fulfils the pets.statusChanged and pets.deleted interactions declared by service.notifications', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.pets',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.notifications-service.pets.json')],
      messageProviders: {
        'pets.statusChanged event': providePetStatusChanged,
        'pets.deleted event': providePetDeleted,
      },
    });
    await expect(verifier.verify()).resolves.not.toThrow();
  });
});
