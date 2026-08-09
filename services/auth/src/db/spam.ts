// Dev bulk-data seeder for the auth.* schema — the synthetic user population.
//
// Plants faker-generated adopters + rescue staff so the rest of the stack has
// a prod-shaped population to reference. Unlike seed.ts (the small fixed
// persona set), this is the volume tier, gated via assertSpamAllowed
// (NODE_ENV + ALLOW_SPAM).
//
// Idempotent + deterministic: user_id and email are derived from a fixed key
// (seededUuid / `adopter${i}@example.test`), and the INSERT is ON CONFLICT
// DO NOTHING, so a re-run (or every container boot) converges to the SAME
// users instead of piling on. The `adopter-${i}` / `staff-${i}` key scheme is
// the contract the rescue/pets/applications seeders compute their refs from,
// so no cross-schema read is needed to wire them up.
//
// On boot the compose command sets SEED_ONLY_IF_EMPTY=true, so it plants only
// when the anchor user (index 0) is absent; the manual `pnpm db:seed:dev`
// leaves it unset to (re)populate on demand.

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import {
  assertSpamAllowed,
  bulkInsert,
  createSpamFaker,
  seededUuid,
  seedOnlyIfEmpty,
  spamCount,
} from '@adopt-dont-shop/seed-faker';
import bcrypt from 'bcryptjs';

import { loadConfig } from '../config.js';

const BCRYPT_ROUNDS = 12;
const SPAM_PASSWORD = process.env.SPAM_PASSWORD ?? 'DevPassword123!';

const USER_COLUMNS = [
  'user_id',
  'first_name',
  'last_name',
  'email',
  'password',
  'phone_number',
  'email_verified',
  'phone_verified',
  'status',
  'user_type',
  'city',
  'country',
  'terms_accepted_at',
  'privacy_policy_accepted_at',
  'created_at',
  'updated_at',
] as const;

type Faker = ReturnType<typeof createSpamFaker>;
type UserType = 'adopter' | 'rescue_staff';

// Each user type maps to a stable key prefix. The email is derived from the
// same key so both the PK and the UNIQUE(email) constraint are collision-free
// across runs, and downstream seeders can recompute the id from the index.
const KEY_PREFIX: Record<UserType, string> = {
  adopter: 'adopter',
  rescue_staff: 'staff',
};

const userRow = (
  faker: Faker,
  userType: UserType,
  index: number,
  passwordHash: string,
  now: Date
): readonly unknown[] => {
  const prefix = KEY_PREFIX[userType];
  return [
    seededUuid(`${prefix}-${index}`),
    faker.person.firstName(),
    faker.person.lastName(),
    `${prefix}${index}@example.test`,
    passwordHash,
    faker.phone.number(),
    true,
    true,
    'active',
    userType,
    faker.location.city(),
    'GB',
    now,
    now,
    now,
    now,
  ];
};

// Pure builder — deterministic given a seeded faker, so tests can assert the
// generated shape without a database or a real bcrypt hash.
export const buildUserRows = (
  faker: Faker,
  passwordHash: string,
  adopters: number,
  staff: number,
  now = new Date()
): (readonly unknown[])[] => {
  const rows: (readonly unknown[])[] = [];
  for (let i = 0; i < adopters; i++) {
    rows.push(userRow(faker, 'adopter', i, passwordHash, now));
  }
  for (let i = 0; i < staff; i++) {
    rows.push(userRow(faker, 'rescue_staff', i, passwordHash, now));
  }
  return rows;
};

export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

export const spamUsers = async (deps: {
  query: QueryFn;
  faker: Faker;
  passwordHash: string;
  adopters: number;
  staff: number;
}): Promise<{ adopters: number; staff: number }> => {
  const rows = buildUserRows(deps.faker, deps.passwordHash, deps.adopters, deps.staff);
  await bulkInsert(
    { query: deps.query },
    'auth.users',
    USER_COLUMNS,
    rows,
    500,
    'ON CONFLICT (user_id) DO NOTHING'
  );
  return { adopters: deps.adopters, staff: deps.staff };
};

const anchorExists = async (query: QueryFn): Promise<boolean> => {
  const res = (await query(`SELECT 1 FROM auth.users WHERE user_id = $1 LIMIT 1`, [
    seededUuid('adopter-0'),
  ])) as { rows: unknown[] };
  return res.rows.length > 0;
};

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.auth.spam' });
  assertSpamAllowed();
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    const query: QueryFn = (text, values) => pool.query(text, values as unknown[]);

    if (seedOnlyIfEmpty() && (await anchorExists(query))) {
      logger.info('auth users already populated — skipping (SEED_ONLY_IF_EMPTY)');
      return;
    }

    const adopters = spamCount('ADOPTERS', 50);
    const staff = spamCount('STAFF', 20);
    logger.info('spamming auth users', { adopters, staff });
    const passwordHash = await bcrypt.hash(SPAM_PASSWORD, BCRYPT_ROUNDS);
    const result = await spamUsers({
      query,
      faker: createSpamFaker(),
      passwordHash,
      adopters,
      staff,
    });
    logger.info('auth spam complete', { ...result, password: SPAM_PASSWORD });
  } catch (err) {
    logger.error('auth spam failed', {
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
