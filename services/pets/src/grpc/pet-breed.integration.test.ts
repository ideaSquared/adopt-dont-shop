// Real-Postgres coverage for resolving a breed NAME to a pets.breeds row.
//
// handlers.test.ts stubs pool.query, so it can't prove the lookup SQL runs
// against the real pets.breeds table (the species enum comparison, the
// case-insensitive name match, the unique (species, name) index). Only a
// real database does.
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

import { createPet, updatePet, type HandlerDeps } from './handlers.js';

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

describe.skipIf(!process.env.DATABASE_URL)('pet breed names (real Postgres)', () => {
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
});
