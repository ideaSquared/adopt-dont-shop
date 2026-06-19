// Dev-only bulk-data ('spam') seeder for the rescue.* schema.
//
// Floods rescue.rescues with faker rescues, then links a slice of the
// rescue_staff users (minted by the auth spam) to them as staff_members.
// MANUAL + gated via assertSpamAllowed. Additive (fresh UUIDs per run).
//
// Cross-schema read: staff user_ids come from auth.users (user_type =
// 'rescue_staff'). A spam seeder is dev-only god-access tooling, so reaching
// across the schema boundary here is deliberate — runtime code never does this.
//
// Volume: SPAM_RESCUES (default 8). Every rescue is inserted 'verified' so the
// public "view a rescue" path works. Staff links: each spam rescue_staff user
// is attached to a random spam rescue (so pets/applications have owners).

import { randomUUID } from 'node:crypto';

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import {
  assertSpamAllowed,
  bulkInsert,
  createSpamFaker,
  spamCount,
} from '@adopt-dont-shop/seed-faker';

import { loadConfig } from '../config.js';

type Faker = ReturnType<typeof createSpamFaker>;
export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

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

const rescueRow = (faker: Faker, now: Date): { id: string; row: readonly unknown[] } => {
  const id = randomUUID();
  // rescues.name is UNIQUE. The faker is seeded, so re-runs regenerate the
  // same company names — append a short random suffix so additive re-runs
  // don't collide on the name constraint.
  const name = `${faker.company.name()} Rescue ${randomUUID().slice(0, 6)}`;
  return {
    id,
    row: [
      id,
      name,
      `rescue.${randomUUID().slice(0, 8)}@example.test`.toLowerCase(),
      faker.location.streetAddress(),
      faker.location.city(),
      faker.location.zipCode(),
      'GB',
      faker.person.fullName(),
      faker.company.catchPhrase(),
      'verified',
      now,
      now,
      now,
    ],
  };
};

const staffRow = (
  rescueId: string,
  userId: string,
  faker: Faker,
  now: Date
): readonly unknown[] => [
  randomUUID(),
  rescueId,
  userId,
  faker.person.jobTitle(),
  true,
  userId,
  now,
  now,
  now,
];

export const spamRescues = async (deps: {
  query: QueryFn;
  faker: Faker;
  rescues: number;
  staffUserIds: readonly string[];
}): Promise<{ rescues: number; staff: number; rescueIds: string[] }> => {
  const now = new Date();
  const built = Array.from({ length: deps.rescues }, () => rescueRow(deps.faker, now));
  const rescueIds = built.map(b => b.id);
  await bulkInsert(
    { query: deps.query },
    'rescue.rescues',
    RESCUE_COLUMNS,
    built.map(b => b.row)
  );

  // Spread staff across the freshly-created rescues so every rescue has at
  // least a chance of staff and pets/applications have real owners to point at.
  const staffRows = deps.staffUserIds.map((userId, i) =>
    staffRow(rescueIds[i % rescueIds.length], userId, deps.faker, now)
  );
  await bulkInsert({ query: deps.query }, 'rescue.staff_members', STAFF_COLUMNS, staffRows);

  return { rescues: deps.rescues, staff: staffRows.length, rescueIds };
};

const fetchStaffUserIds = async (query: QueryFn): Promise<string[]> => {
  // Only the spam staff (example.test) — never the fixed personas, which have
  // their own deterministic staff_member links from seed.ts.
  const result = (await query(
    `SELECT user_id FROM auth.users
     WHERE user_type = 'rescue_staff' AND email LIKE '%@example.test'`,
    []
  )) as { rows: { user_id: string }[] };
  return result.rows.map(r => r.user_id);
};

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.rescue.spam' });
  assertSpamAllowed();
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    const query: QueryFn = (text, values) => pool.query(text, values as unknown[]);
    const rescues = spamCount('RESCUES', 8);
    const staffUserIds = await fetchStaffUserIds(query);
    logger.info('spamming rescues', { rescues, staffUserIds: staffUserIds.length });
    const result = await spamRescues({
      query,
      faker: createSpamFaker(),
      rescues,
      staffUserIds,
    });
    logger.info('rescue spam complete', { rescues: result.rescues, staff: result.staff });
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
