// Real-Postgres coverage for verifyRescue.
//
// handlers.test.ts runs verifyRescue against a mocked pool, which can't see
// how Postgres types the UPDATE's parameters: the same status parameter is
// written to the rescue_status enum column and compared with text literals in
// the CASE arms, and Postgres rejects the statement outright (42P08) unless
// the parameter has one explicit type. Only a real database proves the
// statement runs.
//
// It also covers createRescue's duplicate handling: handlers.test.ts fakes the
// unique violation, so only a real database proves the constraint names
// Postgres gives migration 001's UNIQUE columns map to ALREADY_EXISTS naming
// the field. Kept in this one file because every suite here claims the exact
// `rescue` schema, so two files would collide when Vitest runs them in parallel.
//
// Skipped (not silently passed) when DATABASE_URL isn't set — see
// docs/testing.md for how to run these locally and in CI.
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import { RescueV1, type CreateRescueRequest } from '@adopt-dont-shop/proto';
import { makeNatsDouble, testPrincipal, withTestDatabase } from '@adopt-dont-shop/test-utils';

import { createRescue, verifyRescue, type HandlerDeps } from './handlers.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const ADMIN = testPrincipal({
  // randomUUID() returns a plain string; UserId is a branded string with no
  // runtime representation, so a cast is the only way to construct one.
  userId: randomUUID() as UserId,
  roles: ['admin'],
  permissions: ['admin.security.manage' as Permission, 'rescues.create' as Permission],
});

const insertPendingRescue = async (pool: HandlerDeps['pool']): Promise<string> => {
  const rescueId = randomUUID();
  await pool.query(
    `INSERT INTO rescue.rescues (rescue_id, name, email, address, city, zip_code, contact_person)
     VALUES ($1, $2, $3, '1 High St', 'London', 'SW1A 1AA', 'Alex')`,
    [rescueId, `Rescue ${rescueId}`, `${rescueId}@example.test`]
  );
  return rescueId;
};

describe.skipIf(!process.env.DATABASE_URL)('verifyRescue (real Postgres)', () => {
  it('verifies a pending rescue and stamps who verified it and how', async () => {
    await withTestDatabase(
      {
        schemaPrefix: 'rescue',
        exactSchemaName: true,
        migrationsDir: MIGRATIONS_DIR,
        registerTsxLoader: true,
      },
      async pool => {
        const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
        const rescueId = await insertPendingRescue(pool);

        const res = await verifyRescue(deps, ADMIN, {
          rescueId,
          toStatus: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
          verificationSource: RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_MANUAL,
        });

        expect(res.rescue?.status).toBe(RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED);
        const { rows } = await pool.query<{
          status: string;
          verified_by: string;
          verification_source: string;
          verified_at: Date | null;
        }>(
          `SELECT status, verified_by, verification_source, verified_at
             FROM rescue.rescues WHERE rescue_id = $1`,
          [rescueId]
        );
        expect(rows[0]).toMatchObject({
          status: 'verified',
          verified_by: ADMIN.userId,
          verification_source: 'manual',
        });
        expect(rows[0].verified_at).not.toBeNull();
      }
    );
  });

  it('rejects a pending rescue and records the reason', async () => {
    await withTestDatabase(
      {
        schemaPrefix: 'rescue',
        exactSchemaName: true,
        migrationsDir: MIGRATIONS_DIR,
        registerTsxLoader: true,
      },
      async pool => {
        const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
        const rescueId = await insertPendingRescue(pool);

        await verifyRescue(deps, ADMIN, {
          rescueId,
          toStatus: RescueV1.RescueStatus.RESCUE_STATUS_REJECTED,
          failureReason: 'charity number not found',
        });

        const { rows } = await pool.query<{
          status: string;
          verification_failure_reason: string;
          verified_at: Date | null;
        }>(
          `SELECT status, verification_failure_reason, verified_at
             FROM rescue.rescues WHERE rescue_id = $1`,
          [rescueId]
        );
        expect(rows[0]).toMatchObject({
          status: 'rejected',
          verification_failure_reason: 'charity number not found',
          verified_at: null,
        });
      }
    );
  });
});

const FIRST: CreateRescueRequest = {
  name: 'Pawsome',
  email: 'hi@pawsome.example',
  address: '1 High St',
  city: 'London',
  postcode: 'SW1A 1AA',
  contactPerson: 'Alex',
  companiesHouseNumber: '12345678',
  charityRegistrationNumber: '1234567',
};

const UNIQUE_SECOND: CreateRescueRequest = {
  ...FIRST,
  name: 'Other Rescue',
  email: 'hi@other.example',
  companiesHouseNumber: '87654321',
  charityRegistrationNumber: '7654321',
};

describe.skipIf(!process.env.DATABASE_URL)('createRescue duplicates (real Postgres)', () => {
  it.each([
    ['name', { name: FIRST.name }, /name/],
    ['email (case-insensitive)', { email: 'HI@PAWSOME.EXAMPLE' }, /email/],
    [
      'companies house number',
      { companiesHouseNumber: FIRST.companiesHouseNumber },
      /companies house number/,
    ],
    [
      'charity registration number',
      { charityRegistrationNumber: FIRST.charityRegistrationNumber },
      /charity registration number/,
    ],
  ])('answers ALREADY_EXISTS for a duplicate %s', async (_label, clash, field) => {
    await withTestDatabase(
      {
        schemaPrefix: 'rescue',
        exactSchemaName: true,
        migrationsDir: MIGRATIONS_DIR,
        registerTsxLoader: true,
      },
      async pool => {
        const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
        await createRescue(deps, ADMIN, FIRST);

        await expect(
          createRescue(deps, ADMIN, { ...UNIQUE_SECOND, ...clash })
        ).rejects.toMatchObject({ code: 'ALREADY_EXISTS', message: expect.stringMatching(field) });
      }
    );
  });
});
