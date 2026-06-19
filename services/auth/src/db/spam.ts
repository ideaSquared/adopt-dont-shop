// Dev-only bulk-data ('spam') seeder for the auth.* schema.
//
// Floods auth.users with faker-generated adopters + rescue staff so the rest
// of the stack has a prod-shaped population to reference. Unlike seed.ts (a
// small fixed persona set that runs on every boot), this is MANUAL and gated:
// see @adopt-dont-shop/seed-faker assertSpamAllowed (NODE_ENV + ALLOW_SPAM).
//
// Additive: every row gets a fresh crypto.randomUUID(), so re-running adds
// more users rather than upserting. Every spam user shares one password
// (SPAM_PASSWORD, default below) so you can log in as any of them.
//
// Volume: SPAM_ADOPTERS (default 50) + SPAM_STAFF (default 20). Downstream
// spam seeders read these rows back by user_type to wire FKs.

import { randomUUID } from 'node:crypto';

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import {
  assertSpamAllowed,
  bulkInsert,
  createSpamFaker,
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

const userRow = (
  faker: Faker,
  userType: UserType,
  passwordHash: string,
  now: Date
): readonly unknown[] => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  // Unique-by-construction email: faker emails collide across dozens of rows
  // and auth.users.email is UNIQUE. A short random suffix sidesteps the
  // conflict without an ON CONFLICT branch (which would defeat additivity).
  const email = `${firstName}.${lastName}.${randomUUID().slice(0, 8)}@example.test`.toLowerCase();
  return [
    randomUUID(),
    firstName,
    lastName,
    email,
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

export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

export const spamUsers = async (deps: {
  query: QueryFn;
  faker: Faker;
  passwordHash: string;
  adopters: number;
  staff: number;
}): Promise<{ adopters: number; staff: number }> => {
  const now = new Date();
  const rows: (readonly unknown[])[] = [];
  for (let i = 0; i < deps.adopters; i++) {
    rows.push(userRow(deps.faker, 'adopter', deps.passwordHash, now));
  }
  for (let i = 0; i < deps.staff; i++) {
    rows.push(userRow(deps.faker, 'rescue_staff', deps.passwordHash, now));
  }
  await bulkInsert({ query: deps.query }, 'auth.users', USER_COLUMNS, rows);
  return { adopters: deps.adopters, staff: deps.staff };
};

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.auth.spam' });
  assertSpamAllowed();
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    const adopters = spamCount('ADOPTERS', 50);
    const staff = spamCount('STAFF', 20);
    logger.info('spamming auth users', { adopters, staff });
    const passwordHash = await bcrypt.hash(SPAM_PASSWORD, BCRYPT_ROUNDS);
    const result = await spamUsers({
      query: (text, values) => pool.query(text, values as unknown[]),
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
