// Real-Postgres coverage for the pets handlers.
//
// handlers.test.ts runs the handlers against a mocked pool, which can't see
// what Postgres does with the SQL:
//   - updatePetStatus writes the same status parameter to the pet_status enum
//     column and compares it with text literals in the CASE arms, and
//     Postgres rejects the statement outright (42P08) unless the parameter
//     has one explicit type.
//   - createPet / updatePet resolve a breed NAME against pets.breeds (the
//     species enum comparison, the case-insensitive match, the unique
//     (species, name) index).
//
// Every suite here uses withTestDatabase with the exact schema name `pets`,
// so they must never run at the same time (one would hit "schema already
// exists", or drop the schema under the other). Vitest runs separate files
// in parallel but the tests inside one file in order, which is why they all
// live in this single file. Do not split them into several *.integration
// files.
//
// Skipped (not silently passed) when DATABASE_URL isn't set — see
// docs/testing.md for how to run these locally and in CI.
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';
import { PetsV1 } from '@adopt-dont-shop/proto';
import { makeNatsDouble, testPrincipal, withTestDatabase } from '@adopt-dont-shop/test-utils';

import { createPet, updatePet, updatePetStatus, type HandlerDeps } from './handlers.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

// randomUUID() returns a plain string; UserId / RescueId are branded strings
// with no runtime representation, so a cast is the only way to construct one.
const RESCUE_ID = randomUUID() as RescueId;
const STAFF = testPrincipal({
  userId: randomUUID() as UserId,
  roles: ['rescue_staff'],
  permissions: ['pets.create' as Permission, 'pets.update' as Permission],
  rescueId: RESCUE_ID,
});

const DB_OPTIONS = {
  schemaPrefix: 'pets',
  exactSchemaName: true,
  migrationsDir: MIGRATIONS_DIR,
  registerTsxLoader: true,
} as const;

const insertAvailablePet = async (pool: HandlerDeps['pool']): Promise<string> => {
  const petId = randomUUID();
  await pool.query(
    `INSERT INTO pets.pets (pet_id, name, rescue_id, type, status, available_since)
     VALUES ($1, 'Buddy', $2, 'dog', 'available', now() - interval '30 days')`,
    [petId, RESCUE_ID]
  );
  return petId;
};

const moveTo = (deps: HandlerDeps, petId: string, toStatus: PetsV1.PetStatus) =>
  updatePetStatus(deps, STAFF, { petId, toStatus, reason: 'test' });

describe.skipIf(!process.env.DATABASE_URL)('updatePetStatus (real Postgres)', () => {
  it('moves a pet to pending and logs the transition', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const petId = await insertAvailablePet(pool);

      const res = await moveTo(deps, petId, PetsV1.PetStatus.PET_STATUS_PENDING);

      expect(res.pet?.status).toBe(PetsV1.PetStatus.PET_STATUS_PENDING);
      const transitions = await pool.query<{ from_status: string; to_status: string }>(
        `SELECT from_status, to_status FROM pets.pet_status_transitions WHERE pet_id = $1`,
        [petId]
      );
      expect(transitions.rows).toEqual([{ from_status: 'available', to_status: 'pending' }]);
    });
  });

  it('stamps adopted_date when the pet is adopted', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const petId = await insertAvailablePet(pool);

      await moveTo(deps, petId, PetsV1.PetStatus.PET_STATUS_PENDING);
      await moveTo(deps, petId, PetsV1.PetStatus.PET_STATUS_ADOPTED);

      const { rows } = await pool.query<{ status: string; adopted_date: Date | null }>(
        `SELECT status, adopted_date FROM pets.pets WHERE pet_id = $1`,
        [petId]
      );
      expect(rows[0].status).toBe('adopted');
      expect(rows[0].adopted_date).not.toBeNull();
    });
  });

  it('restamps available_since when a pet becomes available again', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const petId = await insertAvailablePet(pool);

      await moveTo(deps, petId, PetsV1.PetStatus.PET_STATUS_PENDING);
      await moveTo(deps, petId, PetsV1.PetStatus.PET_STATUS_AVAILABLE);

      const { rows } = await pool.query<{ recent: boolean }>(
        `SELECT available_since > now() - interval '1 minute' AS recent
           FROM pets.pets WHERE pet_id = $1`,
        [petId]
      );
      expect(rows[0].recent).toBe(true);
    });
  });
});

const BASE_CREATE: PetsV1.CreatePetRequest = {
  name: 'Buddy',
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
};

type SeededBreeds = {
  labrador: string;
  poodle: string;
  catShorthair: string;
};

// 'Domestic Shorthair' exists for two species, so only a species-aware lookup
// picks the right row.
const seedBreeds = async (pool: HandlerDeps['pool']): Promise<SeededBreeds> => {
  const breeds = {
    labrador: randomUUID(),
    poodle: randomUUID(),
    dogShorthair: randomUUID(),
    catShorthair: randomUUID(),
  };
  await pool.query(
    `INSERT INTO pets.breeds (breed_id, species, name) VALUES
       ($1, 'dog', 'Labrador Retriever'),
       ($2, 'dog', 'Poodle'),
       ($3, 'dog', 'Domestic Shorthair'),
       ($4, 'cat', 'Domestic Shorthair')`,
    [breeds.labrador, breeds.poodle, breeds.dogShorthair, breeds.catShorthair]
  );
  return breeds;
};

const storedBreeds = async (pool: HandlerDeps['pool'], petId: string) => {
  const { rows } = await pool.query<{
    breed_id: string | null;
    secondary_breed_id: string | null;
  }>(`SELECT breed_id, secondary_breed_id FROM pets.pets WHERE pet_id = $1`, [petId]);
  return rows[0];
};

describe.skipIf(!process.env.DATABASE_URL)(
  'createPet / updatePet breed names (real Postgres)',
  () => {
    it('stores the breed_id for a breed name on create', async () => {
      await withTestDatabase(DB_OPTIONS, async pool => {
        const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
        const breeds = await seedBreeds(pool);

        const { pet } = await createPet(deps, STAFF, {
          ...BASE_CREATE,
          breedName: 'labrador retriever',
          secondaryBreedName: 'Poodle',
        });

        expect(await storedBreeds(pool, pet.petId)).toEqual({
          breed_id: breeds.labrador,
          secondary_breed_id: breeds.poodle,
        });
        expect(pet.breedId).toBe(breeds.labrador);
      });
    });

    it("matches the breed on the pet's species when a name exists for several", async () => {
      await withTestDatabase(DB_OPTIONS, async pool => {
        const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
        const breeds = await seedBreeds(pool);

        const { pet } = await createPet(deps, STAFF, {
          ...BASE_CREATE,
          name: 'Luna',
          type: PetsV1.PetType.PET_TYPE_CAT,
          breedName: 'Domestic Shorthair',
        });

        expect((await storedBreeds(pool, pet.petId))?.breed_id).toBe(breeds.catShorthair);
      });
    });

    it('rejects a breed that does not exist for the pet species, creating no pet', async () => {
      await withTestDatabase(DB_OPTIONS, async pool => {
        const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
        await seedBreeds(pool);

        await expect(
          createPet(deps, STAFF, {
            ...BASE_CREATE,
            type: PetsV1.PetType.PET_TYPE_CAT,
            breedName: 'Labrador Retriever',
          })
        ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });

        const { rows } = await pool.query(`SELECT 1 FROM pets.pets`);
        expect(rows).toHaveLength(0);
      });
    });

    it('stores the breed_id for a breed name on update', async () => {
      await withTestDatabase(DB_OPTIONS, async pool => {
        const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
        const breeds = await seedBreeds(pool);
        const { pet } = await createPet(deps, STAFF, BASE_CREATE);
        expect((await storedBreeds(pool, pet.petId))?.breed_id).toBeNull();

        await updatePet(deps, STAFF, { petId: pet.petId, breedName: 'Poodle' });

        expect((await storedBreeds(pool, pet.petId))?.breed_id).toBe(breeds.poodle);
      });
    });
  }
);
