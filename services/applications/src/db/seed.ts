// Seed entry point — populates the applications.* read model with the
// canonical dev/e2e application(s) (see seed-data.ts).
//
// Mirrors migrate.ts: invoked by `pnpm db:seed`, reuses loadConfig() +
// createDbClient. Depends on the auth/pets/rescue seeds for the referenced
// ids, but rows carry no cross-schema FK so insert order doesn't matter — the
// root orchestrator runs applications last.
//
// Idempotent: events are `ON CONFLICT (aggregate_id, version) DO NOTHING`, the
// projection row is `ON CONFLICT (application_id) DO UPDATE`.

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import { assertNotProduction } from '@adopt-dont-shop/seed-faker';

import { loadConfig } from '../config.js';
import type { ApplicationEvent } from '../domain/index.js';
import { SEED_APPLICATIONS, type SeedApplication } from './seed-data.js';

export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

// Events are immutable (a trigger rejects UPDATE/DELETE), so a re-run is a
// no-op on (aggregate_id, version) rather than an upsert.
const INSERT_EVENT = `
  INSERT INTO applications.application_events (
    event_id, aggregate_id, version, event_type, event_data, occurred_at, actor_user_id
  ) VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5, $6)
  ON CONFLICT (aggregate_id, version) DO NOTHING
`;

// version is the event count, matching what the live write path projects.
// submitted_at is stamped so the row reads like a genuinely submitted application.
const UPSERT_APPLICATION = `
  INSERT INTO applications.applications (
    application_id, user_id, pet_id, rescue_id, status, version, submitted_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6, now()
  )
  ON CONFLICT (application_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    pet_id = EXCLUDED.pet_id,
    rescue_id = EXCLUDED.rescue_id,
    status = EXCLUDED.status,
    version = EXCLUDED.version,
    updated_at = now()
`;

const DAY_MS = 86_400_000;

// The event chain that leaves an application in `app.status`. Timestamps trail
// `now` so the seeded history reads as recent.
export const buildSeedEvents = (app: SeedApplication, now: Date): ApplicationEvent[] => {
  const at = (daysAgo: number): string => new Date(now.getTime() - daysAgo * DAY_MS).toISOString();
  const submitted: ApplicationEvent[] = [
    {
      type: 'draftCreated',
      applicationId: app.applicationId,
      adopterId: app.userId,
      petId: app.petId,
      rescueId: app.rescueId,
      at: at(3),
    },
    { type: 'draftSubmitted', applicationId: app.applicationId, at: at(2) },
  ];
  return app.status === 'under_review'
    ? [
        ...submitted,
        {
          type: 'reviewStarted',
          applicationId: app.applicationId,
          actorUserId: app.reviewerId,
          note: null,
          at: at(1),
        },
      ]
    : submitted;
};

export type SeedDeps = {
  query: QueryFn;
  now?: Date;
};

const actorOf = (app: SeedApplication, event: ApplicationEvent): string =>
  'actorUserId' in event ? event.actorUserId : app.userId;

export const seedApplications = async (deps: SeedDeps): Promise<string[]> => {
  const now = deps.now ?? new Date();
  const seeded: string[] = [];
  for (const app of SEED_APPLICATIONS) {
    const events = buildSeedEvents(app, now);
    for (const [index, event] of events.entries()) {
      await deps.query(INSERT_EVENT, [
        app.applicationId,
        index + 1,
        event.type,
        JSON.stringify(event),
        event.at,
        actorOf(app, event),
      ]);
    }
    await deps.query(UPSERT_APPLICATION, appParams(app, events.length));
    seeded.push(app.applicationId);
  }
  return seeded;
};

const appParams = (a: SeedApplication, version: number): readonly unknown[] => [
  a.applicationId,
  a.userId,
  a.petId,
  a.rescueId,
  a.status,
  version,
];

export const main = async (): Promise<void> => {
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
