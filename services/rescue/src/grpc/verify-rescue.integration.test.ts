// Real-Postgres coverage for verifyRescue.
//
// handlers.test.ts runs verifyRescue against a mocked pool, which can't see
// how Postgres types the UPDATE's parameters: the same status parameter is
// written to the rescue_status enum column and compared with text literals in
// the CASE arms, and Postgres rejects the statement outright (42P08) unless
// the parameter has one explicit type. Only a real database proves the
// statement runs.
//
// Skipped (not silently passed) when DATABASE_URL isn't set — see
// docs/testing.md for how to run these locally and in CI.
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import { RescueV1 } from '@adopt-dont-shop/proto';
import { makeNatsDouble, testPrincipal, withTestDatabase } from '@adopt-dont-shop/test-utils';

import { verifyRescue, type HandlerDeps } from './handlers.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const ADMIN = testPrincipal({
  // randomUUID() returns a plain string; UserId is a branded string with no
  // runtime representation, so a cast is the only way to construct one.
  userId: randomUUID() as UserId,
  roles: ['admin'],
  permissions: ['admin.security.manage' as Permission],
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
