// Seed entry point — populates the rescue.* schema with the canonical
// dev/e2e rescue organisations + their staff_member links (see
// seed-data.ts).
//
// Mirrors migrate.ts: invoked by `npm run db:seed`, reuses loadConfig()
// + createDbClient. Depends on the auth seed having run first (the
// staff_member.user_id pointers reference auth.users), but the rows
// carry no cross-schema FK so the insert succeeds regardless of order —
// the root orchestrator (scripts/seed.mjs) still runs auth first.
//
// Idempotent: every INSERT is `ON CONFLICT (...) DO UPDATE`. Rescues are
// inserted as already-verified so the public "view a rescue" path works.

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';

import { loadConfig } from '../config.js';
import { SEED_RESCUES, SEED_STAFF, type SeedRescue, type SeedStaff } from './seed-data.js';

export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

const UPSERT_RESCUE = `
  INSERT INTO rescue.rescues (
    rescue_id, name, email, address, city, zip_code, country,
    contact_person, description, status, verified_at,
    created_at, updated_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6, 'GB',
    $7, $8, 'verified', now(),
    now(), now()
  )
  ON CONFLICT (rescue_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    city = EXCLUDED.city,
    zip_code = EXCLUDED.zip_code,
    contact_person = EXCLUDED.contact_person,
    description = EXCLUDED.description,
    status = 'verified',
    updated_at = now()
`;

const UPSERT_STAFF = `
  INSERT INTO rescue.staff_members (
    staff_member_id, rescue_id, user_id, title,
    is_verified, added_by, added_at, created_at, updated_at
  ) VALUES (
    $1, $2, $3, $4,
    true, $3, now(), now(), now()
  )
  ON CONFLICT (staff_member_id) DO UPDATE SET
    rescue_id = EXCLUDED.rescue_id,
    user_id = EXCLUDED.user_id,
    title = EXCLUDED.title,
    is_verified = true,
    updated_at = now()
`;

export type SeedDeps = {
  query: QueryFn;
};

export const seedRescues = async (deps: SeedDeps): Promise<string[]> => {
  const seeded: string[] = [];
  for (const rescue of SEED_RESCUES) {
    await deps.query(UPSERT_RESCUE, rescueParams(rescue));
    seeded.push(rescue.name);
  }
  for (const staff of SEED_STAFF) {
    await deps.query(UPSERT_STAFF, staffParams(staff));
  }
  return seeded;
};

const rescueParams = (r: SeedRescue): readonly unknown[] => [
  r.rescueId,
  r.name,
  r.email,
  // `address` is NOT NULL; the seed data only carries city/zip so we
  // synthesise a placeholder street line.
  `${r.city} (dev seed address)`,
  r.city,
  r.zipCode,
  r.contactPerson,
  r.description,
];

const staffParams = (s: SeedStaff): readonly unknown[] => [
  s.staffMemberId,
  s.rescueId,
  s.userId,
  s.title,
];

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.rescue.seed' });
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    logger.info('seeding rescues', { schema: config.schema, count: SEED_RESCUES.length });
    const seeded = await seedRescues({
      query: (text, values) => pool.query(text, values as unknown[]),
    });
    logger.info('rescue seed complete', { seeded });
  } catch (err) {
    logger.error('rescue seed failed', {
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
