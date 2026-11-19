// Real-Postgres coverage for the staff inactivity nudge (ADS-1463).
//
// application-staff-nudge.test.ts runs the job against a scripted mock
// client, which can't show which rows the SQL actually selects. These tests
// submit applications through the real handlers (so the read-model row is
// whatever projectReadModel writes), then age the row and run the job.
//
// Skipped (not silently passed) when DATABASE_URL isn't set — see
// docs/testing.md for how to run these locally and in CI.
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import { makeNatsDouble, testPrincipal, withTestDatabase } from '@adopt-dont-shop/test-utils';

import type { HandlerDeps } from '../grpc/adapter.js';
import { makeStartDraft, submitDraft } from '../grpc/handlers.js';
import type { PetsClient } from '../grpc/pets-client.js';
import { sendApplicationStaffNudges } from './application-staff-nudge.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const DB_OPTIONS = {
  schemaPrefix: 'applications',
  migrationsDir: MIGRATIONS_DIR,
  registerTsxLoader: true,
} as const;

const RESCUE_ID = randomUUID();
const NUDGE_OPTIONS = { inactivityDays: 3, batchSize: 200 } as const;

// randomUUID() returns a plain string; UserId is a branded string with no
// runtime representation, so a cast is the only way to construct one.
const makeAdopter = () =>
  testPrincipal({
    userId: randomUUID() as UserId,
    roles: ['adopter'],
    permissions: ['applications.create' as Permission, 'applications.update' as Permission],
  });

// Only getPet is used by StartDraft; the cast is for the unused gRPC surface.
const petsClient = { getPet: vi.fn().mockResolvedValue({ pet: { rescueId: RESCUE_ID } }) };
const startDraft = makeStartDraft(petsClient as unknown as PetsClient);

const submitApplication = async (deps: HandlerDeps): Promise<string> => {
  const adopter = makeAdopter();
  const draft = await startDraft(deps, adopter, {
    adopterId: adopter.userId,
    petId: randomUUID(),
  });
  const applicationId = draft.application?.applicationId ?? '';
  await submitDraft(deps, adopter, {
    applicationId,
    expectedVersion: draft.application?.version ?? 0,
  });
  return applicationId;
};

const ageApplication = async (
  pool: HandlerDeps['pool'],
  applicationId: string,
  ages: { createdDaysAgo: number; lastActivityDaysAgo: number }
): Promise<void> => {
  await pool.query(
    `UPDATE applications
        SET created_at = now() - ($2 || ' days')::interval,
            updated_at = now() - ($3 || ' days')::interval
      WHERE application_id = $1`,
    [applicationId, ages.createdDaysAgo, ages.lastActivityDaysAgo]
  );
};

const wasNudged = async (pool: HandlerDeps['pool'], applicationId: string): Promise<boolean> => {
  const { rows } = await pool.query<{ last_nudged_at: Date | null }>(
    `SELECT last_nudged_at FROM applications WHERE application_id = $1`,
    [applicationId]
  );
  return rows[0]?.last_nudged_at !== null;
};

describe.skipIf(!process.env.DATABASE_URL)('sendApplicationStaffNudges (real Postgres)', () => {
  it('nudges an application submitted through the service once it has been idle past the threshold', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const applicationId = await submitApplication(deps);
      await ageApplication(pool, applicationId, { createdDaysAgo: 5, lastActivityDaysAgo: 5 });

      const res = await sendApplicationStaffNudges(deps, NUDGE_OPTIONS);

      expect(res.nudgedCount).toBe(1);
      expect(await wasNudged(pool, applicationId)).toBe(true);
    });
  });

  it('does not nudge an old application that staff acted on recently', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const applicationId = await submitApplication(deps);
      await ageApplication(pool, applicationId, { createdDaysAgo: 10, lastActivityDaysAgo: 1 });

      const res = await sendApplicationStaffNudges(deps, NUDGE_OPTIONS);

      expect(res.nudgedCount).toBe(0);
      expect(await wasNudged(pool, applicationId)).toBe(false);
    });
  });

  it('nudges an idle application only once', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const applicationId = await submitApplication(deps);
      await ageApplication(pool, applicationId, { createdDaysAgo: 5, lastActivityDaysAgo: 5 });

      await sendApplicationStaffNudges(deps, NUDGE_OPTIONS);
      const second = await sendApplicationStaffNudges(deps, NUDGE_OPTIONS);

      expect(second.nudgedCount).toBe(0);
    });
  });
});
