// Real-Postgres coverage for resuming a stranded draft in StartDraft.
//
// handlers.test.ts runs makeStartDraft against a scripted mock pool, which
// can't prove the two things this fix depends on: that the draft lookup SQL
// really matches only an open `draft` row (and not a submitted one), and that
// the applications_user_pet_unique partial index still refuses a second open
// application. Only a real database shows both.
//
// Skipped (not silently passed) when DATABASE_URL isn't set — see
// docs/testing.md for how to run these locally and in CI.
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import { makeNatsDouble, testPrincipal, withTestDatabase } from '@adopt-dont-shop/test-utils';

import type { HandlerDeps } from './adapter.js';
import { makeStartDraft, submitDraft } from './handlers.js';
import type { PetsClient } from './pets-client.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const DB_OPTIONS = {
  schemaPrefix: 'applications',
  migrationsDir: MIGRATIONS_DIR,
  registerTsxLoader: true,
} as const;

const RESCUE_ID = randomUUID();

// randomUUID() returns a plain string; UserId is a branded string with no
// runtime representation, so a cast is the only way to construct one.
const makeAdopter = () => {
  const userId = randomUUID() as UserId;
  return testPrincipal({
    userId,
    roles: ['adopter'],
    permissions: ['applications.create' as Permission, 'applications.update' as Permission],
  });
};

// Only getPet is used by StartDraft; the cast is for the unused gRPC surface.
const petsClient = { getPet: vi.fn().mockResolvedValue({ pet: { rescueId: RESCUE_ID } }) };
const startDraft = makeStartDraft(petsClient as unknown as PetsClient);

const countRows = async (pool: HandlerDeps['pool'], table: string): Promise<number> => {
  const { rows } = await pool.query<{ n: string }>(`SELECT count(*) AS n FROM ${table}`);
  return Number(rows[0].n);
};

describe.skipIf(!process.env.DATABASE_URL)('startDraft (real Postgres)', () => {
  it('returns the stranded draft for the same adopter and pet instead of creating another', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const adopter = makeAdopter();
      const petId = randomUUID();

      const first = await startDraft(deps, adopter, { adopterId: adopter.userId, petId });
      const retry = await startDraft(deps, adopter, { adopterId: adopter.userId, petId });

      expect(retry.application.applicationId).toBe(first.application.applicationId);
      expect(retry.application.version).toBe(first.application.version);
      expect(await countRows(pool, 'applications')).toBe(1);
      expect(await countRows(pool, 'application_events')).toBe(1);
    });
  });

  it('lets the resumed draft be submitted', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const adopter = makeAdopter();
      const petId = randomUUID();

      await startDraft(deps, adopter, { adopterId: adopter.userId, petId });
      const resumed = await startDraft(deps, adopter, { adopterId: adopter.userId, petId });
      const submitted = await submitDraft(deps, adopter, {
        applicationId: resumed.application.applicationId,
        expectedVersion: resumed.application.version,
      });

      expect(submitted.application.applicationId).toBe(resumed.application.applicationId);
      const { rows } = await pool.query<{ status: string }>(
        `SELECT status FROM applications WHERE application_id = $1`,
        [resumed.application.applicationId]
      );
      expect(rows).toEqual([{ status: 'submitted' }]);
    });
  });

  it('still refuses with ALREADY_EXISTS when the open application is already submitted', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const adopter = makeAdopter();
      const petId = randomUUID();

      const draft = await startDraft(deps, adopter, { adopterId: adopter.userId, petId });
      await submitDraft(deps, adopter, {
        applicationId: draft.application.applicationId,
        expectedVersion: draft.application.version,
      });

      await expect(
        startDraft(deps, adopter, { adopterId: adopter.userId, petId })
      ).rejects.toMatchObject({ code: 'ALREADY_EXISTS' });
      expect(await countRows(pool, 'applications')).toBe(1);
    });
  });

  it('does not hand one adopter another adopter’s draft for the same pet', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const alice = makeAdopter();
      const bob = makeAdopter();
      const petId = randomUUID();

      const aliceDraft = await startDraft(deps, alice, { adopterId: alice.userId, petId });
      const bobDraft = await startDraft(deps, bob, { adopterId: bob.userId, petId });

      expect(bobDraft.application.applicationId).not.toBe(aliceDraft.application.applicationId);
      expect(bobDraft.application.adopterId).toBe(bob.userId);
    });
  });
});
