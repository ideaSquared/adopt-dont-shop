// Seed entry point — populates the pets.* schema with the canonical
// dev/e2e pet catalogue (see seed-data.ts).
//
// Mirrors migrate.ts: invoked by `pnpm db:seed`, reuses loadConfig()
// + createDbClient. Depends on the rescue seed having run first (pets
// reference rescue_id), but rows carry no cross-schema FK so the insert
// succeeds regardless of order — the root orchestrator runs pets last.
//
// Idempotent: every INSERT is `ON CONFLICT (pet_id) DO UPDATE`.

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';

import { loadConfig } from '../config.js';
import {
  PAWS_MANAGER_ID,
  SEED_FAVORITES,
  SEED_PETS,
  type SeedFavorite,
  type SeedPet,
} from './seed-data.js';

export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

const UPSERT_PET = `
  INSERT INTO pets.pets (
    pet_id, rescue_id, name, type, gender, size, age_group, status,
    short_description, available_since, created_by, created_at, updated_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    $9, now(), $10, now(), now()
  )
  ON CONFLICT (pet_id) DO UPDATE SET
    rescue_id = EXCLUDED.rescue_id,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    gender = EXCLUDED.gender,
    size = EXCLUDED.size,
    age_group = EXCLUDED.age_group,
    status = EXCLUDED.status,
    short_description = EXCLUDED.short_description,
    updated_at = now()
`;

export type SeedDeps = {
  query: QueryFn;
};

export const seedPets = async (deps: SeedDeps): Promise<string[]> => {
  const seeded: string[] = [];
  for (const pet of SEED_PETS) {
    await deps.query(UPSERT_PET, petParams(pet));
    seeded.push(pet.name);
  }
  return seeded;
};

// Idempotent on the fixed favourite id; ON CONFLICT revives a row a prior
// e2e run soft-deleted so re-seeding restores the two-favourite baseline.
const UPSERT_FAVORITE = `
  INSERT INTO pets.user_favorites (id, user_id, pet_id, created_by, created_at, updated_at)
  VALUES ($1, $2, $3, $2, now(), now())
  ON CONFLICT (id) DO UPDATE SET deleted_at = NULL, updated_at = now()
`;

export const seedFavorites = async (deps: SeedDeps): Promise<number> => {
  for (const fav of SEED_FAVORITES) {
    await deps.query(UPSERT_FAVORITE, favoriteParams(fav));
  }
  return SEED_FAVORITES.length;
};

const favoriteParams = (f: SeedFavorite): readonly unknown[] => [f.id, f.userId, f.petId];

const petParams = (p: SeedPet): readonly unknown[] => [
  p.petId,
  p.rescueId,
  p.name,
  p.type,
  p.gender,
  p.size,
  p.ageGroup,
  p.status,
  p.shortDescription,
  PAWS_MANAGER_ID,
];

export const assertNotProduction = (): void => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    throw new Error('Refusing to run db:seed in production. Set ALLOW_PROD_SEED=true to override.');
  }
};

const main = async (): Promise<void> => {
  assertNotProduction();
  const logger = createLogger({ serviceName: 'service.pets.seed' });
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    logger.info('seeding pets', { schema: config.schema, count: SEED_PETS.length });
    const query: QueryFn = (text, values) => pool.query(text, values as unknown[]);
    const seeded = await seedPets({ query });
    const favorites = await seedFavorites({ query });
    logger.info('pets seed complete', { seeded, favorites });
  } catch (err) {
    logger.error('pets seed failed', {
      message: (err as Error)?.message,
      stack: (err as Error)?.stack,
    });
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
