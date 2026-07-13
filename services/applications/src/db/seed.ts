// Seed entry point — populates the applications.* read model with the
// canonical dev/e2e application(s) (see seed-data.ts).
//
// Mirrors migrate.ts: invoked by `pnpm db:seed`, reuses loadConfig() +
// createDbClient. Depends on the auth/pets/rescue seeds for the referenced
// ids, but rows carry no cross-schema FK so insert order doesn't matter — the
// root orchestrator runs applications last.
//
// Idempotent: the INSERT is `ON CONFLICT (application_id) DO UPDATE`.

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';

import { loadConfig } from '../config.js';
import { SEED_APPLICATIONS, type SeedApplication } from './seed-data.js';

export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

// version stays at the column default (0): below any real event HEAD, so a
// status PATCH that tries to load the (non-existent) event stream fails cleanly
// rather than half-applying. submitted_at is stamped so the row reads like a
// genuinely submitted application.
const UPSERT_APPLICATION = `
  INSERT INTO applications.applications (
    application_id, user_id, pet_id, rescue_id, status, submitted_at
  ) VALUES (
    $1, $2, $3, $4, $5, now()
  )
  ON CONFLICT (application_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    pet_id = EXCLUDED.pet_id,
    rescue_id = EXCLUDED.rescue_id,
    status = EXCLUDED.status,
    updated_at = now()
`;

export type SeedDeps = {
  query: QueryFn;
};

export const seedApplications = async (deps: SeedDeps): Promise<string[]> => {
  const seeded: string[] = [];
  for (const app of SEED_APPLICATIONS) {
    await deps.query(UPSERT_APPLICATION, appParams(app));
    seeded.push(app.applicationId);
  }
  return seeded;
};

const appParams = (a: SeedApplication): readonly unknown[] => [
  a.applicationId,
  a.userId,
  a.petId,
  a.rescueId,
  a.status,
];

export const assertNotProduction = (): void => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    throw new Error('Refusing to run db:seed in production. Set ALLOW_PROD_SEED=true to override.');
  }
};

const main = async (): Promise<void> => {
  assertNotProduction();
  const logger = createLogger({ serviceName: 'service.applications.seed' });
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    logger.info('seeding applications', {
      schema: config.schema,
      count: SEED_APPLICATIONS.length,
    });
    const seeded = await seedApplications({
      query: (text, values) => pool.query(text, values as unknown[]),
    });
    logger.info('applications seed complete', { seeded });
  } catch (err) {
    logger.error('applications seed failed', {
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
