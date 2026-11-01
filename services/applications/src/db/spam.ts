// Dev bulk-data seeder for the applications.* read model.
//
// Floods applications.applications with rows wiring a spam adopter to a spam
// pet (and that pet's rescue). Gated via assertSpamAllowed.
//
// The service is event-sourced: list/detail reads fold application_events, and
// a projection row with no events loads as an empty aggregate and is dropped.
// So every row is written with the event chain the live write path would have
// produced (draftCreated → draftSubmitted → review / decision / withdrawal),
// reviewed by a staff member of the pet's rescue.
//
// Idempotent: application_id is deterministic (derived from the user/pet pair)
// and the INSERT is ON CONFLICT DO NOTHING, so a re-run converges instead of
// piling on. Reads the (now deterministic) spam adopters + pets cross-schema;
// run after the auth/rescue/pets seeders via the `pnpm db:seed:dev`
// orchestrator. Pairing the application's rescue_id to the pet's own rescue
// keeps the row internally consistent.
//
// Volume: SPAM_APPLICATIONS (default 400). Status is skewed toward
// submitted/under_review with a tail of approved/rejected/withdrawn.

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import {
  assertSpamAllowed,
  bulkInsert,
  createSpamFaker,
  seededUuid,
  spamCount,
} from '@adopt-dont-shop/seed-faker';

import { loadConfig } from '../config.js';
import type { ApplicationEvent } from '../domain/index.js';

type Faker = ReturnType<typeof createSpamFaker>;
export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

// Skewed status distribution — most applications are in flight.
const STATUS_BAG = [
  ...Array<string>(40).fill('submitted'),
  ...Array<string>(25).fill('under_review'),
  ...Array<string>(15).fill('approved'),
  ...Array<string>(10).fill('rejected'),
  ...Array<string>(10).fill('withdrawn'),
];

const STAGE_FOR: Record<string, string> = {
  submitted: 'pending',
  under_review: 'reviewing',
  approved: 'resolved',
  rejected: 'resolved',
  withdrawn: 'withdrawn',
};

const OUTCOME_FOR: Record<string, string | null> = {
  approved: 'approved',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
};

const APP_COLUMNS = [
  'application_id',
  'user_id',
  'pet_id',
  'rescue_id',
  'status',
  'stage',
  'final_outcome',
  'submitted_at',
  'created_by',
  'created_at',
  'updated_at',
  'version',
] as const;

const EVENT_COLUMNS = [
  'event_id',
  'aggregate_id',
  'version',
  'event_type',
  'event_data',
  'occurred_at',
  'actor_user_id',
] as const;

// reviewer_id: a staff member of the pet's rescue, who reviews and decides.
type Pet = { pet_id: string; rescue_id: string; reviewer_id: string };

const MINUTE_MS = 60_000;

// The events that take a new application to `status`, one minute apart and
// ending at `decidedAt`.
const eventsFor = (
  status: string,
  ids: { applicationId: string; userId: string; pet: Pet },
  decidedAt: Date
): ApplicationEvent[] => {
  const { applicationId, userId, pet } = ids;
  const reviewer = pet.reviewer_id;
  const head: Array<(at: string) => ApplicationEvent> = [
    at => ({
      type: 'draftCreated',
      applicationId,
      adopterId: userId,
      petId: pet.pet_id,
      rescueId: pet.rescue_id,
      at,
    }),
    at => ({ type: 'draftSubmitted', applicationId, at }),
  ];
  const review = (at: string): ApplicationEvent => ({
    type: 'reviewStarted',
    applicationId,
    actorUserId: reviewer,
    note: null,
    at,
  });
  const tail: Record<string, Array<(at: string) => ApplicationEvent>> = {
    submitted: [],
    under_review: [review],
    approved: [
      review,
      at => ({ type: 'approved', applicationId, actorUserId: reviewer, notes: null, at }),
    ],
    rejected: [
      review,
      at => ({
        type: 'rejected',
        applicationId,
        actorUserId: reviewer,
        reason: 'Not the right match for this pet.',
        at,
      }),
    ],
    withdrawn: [
      at => ({ type: 'withdrawn', applicationId, actorUserId: userId, reason: null, at }),
    ],
  };
  const builders = [...head, ...tail[status]];
  return builders.map((build, i) =>
    build(new Date(decidedAt.getTime() - (builders.length - 1 - i) * MINUTE_MS).toISOString())
  );
};

const actorOf = (event: ApplicationEvent, userId: string): string =>
  'actorUserId' in event ? event.actorUserId : userId;

const application = (faker: Faker, userId: string, pet: Pet, now: Date) => {
  const status = faker.helpers.arrayElement(STATUS_BAG);
  // Deterministic per (adopter, pet) pair — the pair is unique, so a re-run
  // regenerates the same id and ON CONFLICT skips it.
  const applicationId = seededUuid(`app-${userId}-${pet.pet_id}`);
  const events = eventsFor(status, { applicationId, userId, pet }, now);
  const row = [
    applicationId,
    userId,
    pet.pet_id,
    pet.rescue_id,
    status,
    STAGE_FOR[status],
    OUTCOME_FOR[status] ?? null,
    now,
    userId,
    now,
    now,
    events.length,
  ];
  const eventRows = events.map((event, i) => [
    seededUuid(`app-event-${applicationId}-${i + 1}`),
    applicationId,
    i + 1,
    event.type,
    JSON.stringify(event),
    event.at,
    actorOf(event, userId),
  ]);
  return { row, eventRows };
};

export const spamApplications = async (deps: {
  query: QueryFn;
  faker: Faker;
  applications: number;
  adopterIds: readonly string[];
  pets: readonly Pet[];
}): Promise<{ applications: number }> => {
  const now = new Date();
  // applications has a UNIQUE (user_id, pet_id) constraint — at most one
  // application per adopter/pet pair. Draw DISTINCT pairs (shuffled) and cap
  // the request at the number of pairs that actually exist.
  const pairs = deps.adopterIds.flatMap(userId => deps.pets.map(pet => ({ userId, pet })));
  const shuffled = deps.faker.helpers.shuffle(pairs);
  const target = Math.min(deps.applications, shuffled.length);
  const generated = shuffled
    .slice(0, target)
    .map(({ userId, pet }) => application(deps.faker, userId, pet, now));
  const rows = generated.map(g => g.row);
  // Events are immutable (a trigger rejects UPDATE/DELETE), so a re-run is a
  // no-op on (aggregate_id, version).
  await bulkInsert(
    { query: deps.query },
    'applications.application_events',
    EVENT_COLUMNS,
    generated.flatMap(g => g.eventRows),
    500,
    'ON CONFLICT (aggregate_id, version) DO NOTHING'
  );
  // Deterministic application_id means a re-run regenerates the same PK, so
  // conflicting on the primary key skips already-seeded rows (this also covers
  // the rejected/withdrawn tail the partial (user_id, pet_id) index misses).
  await bulkInsert(
    { query: deps.query },
    'applications.applications',
    APP_COLUMNS,
    rows,
    500,
    'ON CONFLICT (application_id) DO NOTHING'
  );
  return { applications: rows.length };
};

// Orchestration over injected seams so the cross-schema read + count logic is
// testable without a real pool.
export const runSpam = async (deps: {
  query: QueryFn;
  faker: Faker;
  log?: (message: string, meta?: Record<string, unknown>) => void;
}): Promise<{ applications: number }> => {
  const adopters = (await deps.query(
    `SELECT user_id FROM auth.users WHERE user_type = 'adopter' AND email LIKE '%@example.test'`,
    []
  )) as { rows: { user_id: string }[] };
  const adopterIds = adopters.rows.map(r => r.user_id);
  const pets = (await deps.query(
    `SELECT p.pet_id, p.rescue_id,
            COALESCE(
              (SELECT s.user_id FROM rescue.staff_members s
                WHERE s.rescue_id = p.rescue_id ORDER BY s.added_at LIMIT 1),
              p.created_by
            ) AS reviewer_id
       FROM pets.pets p
       JOIN rescue.rescues r ON r.rescue_id = p.rescue_id
      WHERE r.email LIKE '%@example.test'`,
    []
  )) as { rows: Pet[] };

  if (adopterIds.length === 0 || pets.rows.length === 0) {
    throw new Error('no spam adopters/pets found — run the auth, rescue and pets spam first');
  }

  const applications = spamCount('APPLICATIONS', 400);
  deps.log?.('spamming applications', {
    applications,
    adopters: adopterIds.length,
    pets: pets.rows.length,
  });
  return spamApplications({
    query: deps.query,
    faker: deps.faker,
    applications,
    adopterIds,
    pets: pets.rows,
  });
};

export const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.applications.spam' });
  assertSpamAllowed();
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    const result = await runSpam({
      query: (text, values) => pool.query(text, values as unknown[]),
      faker: createSpamFaker(),
      log: (message, meta) => logger.info(message, meta),
    });
    logger.info('applications spam complete', result);
  } catch (err) {
    logger.error('applications spam failed', {
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
