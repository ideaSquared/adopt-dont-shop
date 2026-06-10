// Seed entry point — populates the auth.* schema with the canonical
// dev/e2e personas (see seed-data.ts).
//
// Mirrors migrate.ts: invoked by `npm run db:seed`, reuses loadConfig()
// + createDbClient from @adopt-dont-shop/db. Runs AFTER migrations.
//
// Idempotent: every INSERT is `ON CONFLICT (user_id) DO UPDATE` so a
// re-run refreshes the row (e.g. a rotated password) without erroring on
// the unique email/user_id constraints. Safe to run on every boot.

import bcrypt from 'bcryptjs';

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';

import { loadConfig } from '../config.js';
import { SEED_PASSWORD, SEED_USERS, type SeedUser } from './seed-data.js';

// Matches the runtime hasher (createBcryptPasswordHasher) so a seeded
// password validates against AuthService.Login without a re-hash.
const BCRYPT_ROUNDS = 12;

// Minimal shape of the bits of `pg` we use — lets the tests inject a
// fake without standing up a real Postgres.
export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

const UPSERT_USER = `
  INSERT INTO auth.users (
    user_id, first_name, last_name, email, password, phone_number,
    email_verified, phone_verified, status, user_type,
    terms_accepted_at, privacy_policy_accepted_at, created_at, updated_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6,
    true, true, 'active', $7,
    now(), now(), now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    phone_number = EXCLUDED.phone_number,
    email_verified = true,
    status = 'active',
    user_type = EXCLUDED.user_type,
    updated_at = now()
`;

export type SeedDeps = {
  query: QueryFn;
  hash: (password: string) => Promise<string>;
};

// Pure-ish core: upserts every persona via the injected query fn. The
// password is hashed ONCE (all personas share SEED_PASSWORD) to keep the
// re-run cost low. Returns the emails seeded so callers can log/verify.
export const seedUsers = async (deps: SeedDeps): Promise<string[]> => {
  const passwordHash = await deps.hash(SEED_PASSWORD);
  const seeded: string[] = [];
  for (const user of SEED_USERS) {
    await deps.query(UPSERT_USER, paramsFor(user, passwordHash));
    seeded.push(user.email);
  }
  return seeded;
};

const paramsFor = (user: SeedUser, passwordHash: string): readonly unknown[] => [
  user.userId,
  user.firstName,
  user.lastName,
  user.email,
  passwordHash,
  user.phoneNumber ?? null,
  user.userType,
];

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.auth.seed' });
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    logger.info('seeding auth personas', { schema: config.schema, count: SEED_USERS.length });
    const seeded = await seedUsers({
      query: (text, values) => pool.query(text, values as unknown[]),
      hash: password => bcrypt.hash(password, BCRYPT_ROUNDS),
    });
    logger.info('auth seed complete', { seeded });
  } catch (err) {
    logger.error('auth seed failed', {
      message: (err as Error)?.message,
      stack: (err as Error)?.stack,
    });
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

// Only run when invoked as a script (not when imported by tests).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
