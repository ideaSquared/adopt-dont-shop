// Dev bulk-data seeder for the rescue.* schema — the synthetic rescue orgs.
//
// Plants real-looking rescues, then links a slice of the synthetic
// rescue_staff users to them as staff_members. Gated via assertSpamAllowed.
//
// Idempotent + deterministic: rescue_id / staff_member_id are derived from a
// fixed key (seededUuid), names/emails from the index, and every INSERT is
// ON CONFLICT DO NOTHING — so a re-run (or every container boot) converges to
// the SAME rescues instead of piling on. Staff user_ids are COMPUTED with the
// `staff-${i}` scheme the auth seeder uses, so no cross-schema read is needed
// and per-container boot seeding needs no run-order guarantee.
//
// On boot the compose command sets SEED_ONLY_IF_EMPTY=true, so it plants only
// when the anchor rescue (index 0) is absent; the manual `pnpm db:seed:dev`
// leaves it unset to (re)populate on demand.

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import {
  assertSpamAllowed,
  bulkInsert,
  createSpamFaker,
  seededUuid,
  shouldSeed,
  spamCount,
} from '@adopt-dont-shop/seed-faker';

import { loadConfig } from '../config.js';

type Faker = ReturnType<typeof createSpamFaker>;
export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

// Real-sounding UK rescue names — picked by index so a small run is all
// distinct, with a numeric suffix past the pool so larger runs stay unique
// against the rescues.name UNIQUE constraint.
const RESCUE_NAMES = [
  'Paws & Whiskers Rescue',
  'Second Chance Animal Rescue',
  'Happy Tails Rehoming',
  'Bright Futures Animal Sanctuary',
  'Willow Tree Dog Rescue',
  'Safe Haven Cat Protection',
  'The Underdog Trust',
  'Meadow View Animal Shelter',
  'Hope for Hounds',
  'Little Paws Rescue',
  'Riverside Animal Rescue',
  'Forever Home Foundation',
  'Whisker Wood Cat Rescue',
  'Blue Cross Paws',
  'Sunnyfields Animal Sanctuary',
  'Rescue Remedy UK',
] as const;

const BLURBS = [
  'A volunteer-run rescue rehoming dogs and cats across the region.',
  'We rescue, rehabilitate and rehome animals in need of a fresh start.',
  'A small charity finding loving forever homes for abandoned pets.',
  'Dedicated to the welfare and rehoming of unwanted animals since 1998.',
  'Foster-based rescue matching each animal with the right family.',
];

const rescueName = (index: number): string => {
  const base = RESCUE_NAMES[index % RESCUE_NAMES.length];
  const cycle = Math.floor(index / RESCUE_NAMES.length);
  return cycle === 0 ? base : `${base} ${cycle + 1}`;
};

const RESCUE_COLUMNS = [
  'rescue_id',
  'name',
  'email',
  'address',
  'city',
  'zip_code',
  'country',
  'contact_person',
  'description',
  'status',
  'verified_at',
  'created_at',
  'updated_at',
] as const;

const STAFF_COLUMNS = [
  'staff_member_id',
  'rescue_id',
  'user_id',
  'title',
  'is_verified',
  'added_by',
  'added_at',
  'created_at',
  'updated_at',
] as const;

const rescueRow = (faker: Faker, index: number, now: Date): readonly unknown[] => [
  seededUuid(`rescue-${index}`),
  rescueName(index),
  `rescue${index}@example.test`,
  faker.location.streetAddress(),
  faker.location.city(),
  faker.location.zipCode(),
  'GB',
  faker.person.fullName(),
  faker.helpers.arrayElement(BLURBS),
  'verified',
  now,
  now,
  now,
];

const staffRow = (
  faker: Faker,
  index: number,
  rescueCount: number,
  now: Date
): readonly unknown[] => {
  const userId = seededUuid(`staff-${index}`);
  return [
    seededUuid(`staffmember-${index}`),
    // Spread staff across rescues so every rescue has owners for its pets.
    seededUuid(`rescue-${index % rescueCount}`),
    userId,
    faker.person.jobTitle(),
    true,
    userId,
    now,
    now,
    now,
  ];
};

// Pure builders — deterministic given a seeded faker.
export const buildRescueRows = (
  faker: Faker,
  count: number,
  now = new Date()
): (readonly unknown[])[] => Array.from({ length: count }, (_, i) => rescueRow(faker, i, now));

export const buildStaffRows = (
  faker: Faker,
  staff: number,
  rescueCount: number,
  now = new Date()
): (readonly unknown[])[] =>
  Array.from({ length: staff }, (_, i) => staffRow(faker, i, rescueCount, now));

export const spamRescues = async (deps: {
  query: QueryFn;
  faker: Faker;
  rescues: number;
  staff: number;
}): Promise<{ rescues: number; staff: number }> => {
  const now = new Date();
  const rescueRows = buildRescueRows(deps.faker, deps.rescues, now);
  await bulkInsert(
    { query: deps.query },
    'rescue.rescues',
    RESCUE_COLUMNS,
    rescueRows,
    500,
    'ON CONFLICT (rescue_id) DO NOTHING'
  );

  const staffRows =
    deps.rescues > 0 ? buildStaffRows(deps.faker, deps.staff, deps.rescues, now) : [];
  await bulkInsert(
    { query: deps.query },
    'rescue.staff_members',
    STAFF_COLUMNS,
    staffRows,
    500,
    'ON CONFLICT (staff_member_id) DO NOTHING'
  );

  return { rescues: deps.rescues, staff: staffRows.length };
};

const anchorExists = async (query: QueryFn): Promise<boolean> => {
  const res = (await query(`SELECT 1 FROM rescue.rescues WHERE rescue_id = $1 LIMIT 1`, [
    seededUuid('rescue-0'),
  ])) as { rows: unknown[] };
  return res.rows.length > 0;
};

// Orchestration over injected seams so the seed-if-empty guard + count logic is
// testable without a real pool.
export const runSpam = async (deps: {
  query: QueryFn;
  faker: Faker;
  log?: (message: string, meta?: Record<string, unknown>) => void;
}): Promise<{ seeded: boolean; rescues: number; staff: number }> => {
  if (!(await shouldSeed(() => anchorExists(deps.query)))) {
    deps.log?.('rescues already populated — skipping (SEED_ONLY_IF_EMPTY)');
    return { seeded: false, rescues: 0, staff: 0 };
  }
  const rescues = spamCount('RESCUES', 8);
  const staff = spamCount('STAFF', 20);
  deps.log?.('spamming rescues', { rescues, staff });
  const result = await spamRescues({ query: deps.query, faker: deps.faker, rescues, staff });
  return { seeded: true, ...result };
};

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.rescue.spam' });
  assertSpamAllowed();
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    const result = await runSpam({
      query: (text, values) => pool.query(text, values as unknown[]),
      faker: createSpamFaker(),
      log: (message, meta) => logger.info(message, meta),
    });
    logger.info('rescue spam complete', result);
  } catch (err) {
    logger.error('rescue spam failed', {
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
