// Seed entry point — plants the pets.* reference data: the canonical breed
// list every pet's breed_id points at. There is no API for creating breeds,
// so this stays SQL. The dev pet catalogue itself is created through the API
// by scripts/seed.mjs (fixed personas) and in bulk by spam.ts.
//
// Mirrors migrate.ts: invoked by `pnpm db:seed`, reuses loadConfig()
// + createDbClient. Runs AFTER migrations.
//
// Idempotent: ON CONFLICT (species, name) DO NOTHING.

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import {
  assertNotProduction,
  BREEDS_BY_SPECIES,
  seededUuid,
  SPECIES,
} from '@adopt-dont-shop/seed-faker';

import { loadConfig } from '../config.js';

export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

export type SeedDeps = {
  query: QueryFn;
};

// Deterministic breed_id (seededUuid) means the spam seeder can be sure the
// id it references exists, and a re-run never duplicates thanks to the
// (species, name) unique index.
const UPSERT_BREED = `
  INSERT INTO pets.breeds (breed_id, species, name, created_at, updated_at)
  VALUES ($1, $2, $3, now(), now())
  ON CONFLICT (species, name) DO NOTHING
`;

export const seedBreeds = async (deps: SeedDeps): Promise<number> => {
  let seeded = 0;
  for (const species of SPECIES) {
    for (const name of BREEDS_BY_SPECIES[species]) {
      await deps.query(UPSERT_BREED, [seededUuid(`breed-${species}-${name}`), species, name]);
      seeded += 1;
    }
  }
  return seeded;
};

const main = async (): Promise<void> => {
  assertNotProduction();
  const logger = createLogger({ serviceName: 'service.pets.seed' });
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    logger.info('seeding breeds', { schema: config.schema });
    const breeds = await seedBreeds({
      query: (text, values) => pool.query(text, values as unknown[]),
    });
    logger.info('pets seed complete', { breeds });
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
