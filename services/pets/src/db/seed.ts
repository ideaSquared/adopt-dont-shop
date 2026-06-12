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
import { PAWS_MANAGER_ID, SEED_PETS, type SeedPet } from './seed-data.js';

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

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.pets.seed' });
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    logger.info('seeding pets', { schema: config.schema, count: SEED_PETS.length });
    const seeded = await seedPets({
      query: (text, values) => pool.query(text, values as unknown[]),
    });
    logger.info('pets seed complete', { seeded });
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
