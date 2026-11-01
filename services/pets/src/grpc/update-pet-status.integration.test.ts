// Real-Postgres coverage for updatePetStatus.
//
// handlers.test.ts runs updatePetStatus against a mocked pool, which can't see
// how Postgres types the UPDATE's parameters: the same status parameter is
// written to the pet_status enum column and compared with text literals in
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

import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';
import { PetsV1 } from '@adopt-dont-shop/proto';
import { makeNatsDouble, testPrincipal, withTestDatabase } from '@adopt-dont-shop/test-utils';

import { updatePetStatus, type HandlerDeps } from './handlers.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

// randomUUID() returns a plain string; UserId / RescueId are branded strings
// with no runtime representation, so a cast is the only way to construct one.
const RESCUE_ID = randomUUID() as RescueId;
const STAFF = testPrincipal({
  userId: randomUUID() as UserId,
  roles: ['rescue_staff'],
  permissions: ['pets.update' as Permission],
  rescueId: RESCUE_ID,
});

const DB_OPTIONS = {
  schemaPrefix: 'pets',
  exactSchemaName: true,
  migrationsDir: MIGRATIONS_DIR,
  registerTsxLoader: true,
} as const;

const insertAvailablePet = async (pool: HandlerDeps['pool']): Promise<string> => {
  const petId = randomUUID();
  await pool.query(
    `INSERT INTO pets.pets (pet_id, name, rescue_id, type, status, available_since)
     VALUES ($1, 'Buddy', $2, 'dog', 'available', now() - interval '30 days')`,
    [petId, RESCUE_ID]
  );
  return petId;
};

const moveTo = (deps: HandlerDeps, petId: string, toStatus: PetsV1.PetStatus) =>
  updatePetStatus(deps, STAFF, { petId, toStatus, reason: 'test' });

describe.skipIf(!process.env.DATABASE_URL)('updatePetStatus (real Postgres)', () => {
  it('moves a pet to pending and logs the transition', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const petId = await insertAvailablePet(pool);

      const res = await moveTo(deps, petId, PetsV1.PetStatus.PET_STATUS_PENDING);

      expect(res.pet?.status).toBe(PetsV1.PetStatus.PET_STATUS_PENDING);
      const transitions = await pool.query<{ from_status: string; to_status: string }>(
        `SELECT from_status, to_status FROM pets.pet_status_transitions WHERE pet_id = $1`,
        [petId]
      );
      expect(transitions.rows).toEqual([{ from_status: 'available', to_status: 'pending' }]);
    });
  });

  it('stamps adopted_date when the pet is adopted', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const petId = await insertAvailablePet(pool);

      await moveTo(deps, petId, PetsV1.PetStatus.PET_STATUS_PENDING);
      await moveTo(deps, petId, PetsV1.PetStatus.PET_STATUS_ADOPTED);

      const { rows } = await pool.query<{ status: string; adopted_date: Date | null }>(
        `SELECT status, adopted_date FROM pets.pets WHERE pet_id = $1`,
        [petId]
      );
      expect(rows[0].status).toBe('adopted');
      expect(rows[0].adopted_date).not.toBeNull();
    });
  });

  it('restamps available_since when a pet becomes available again', async () => {
    await withTestDatabase(DB_OPTIONS, async pool => {
      const deps: HandlerDeps = { pool, nats: makeNatsDouble().connection };
      const petId = await insertAvailablePet(pool);

      await moveTo(deps, petId, PetsV1.PetStatus.PET_STATUS_PENDING);
      await moveTo(deps, petId, PetsV1.PetStatus.PET_STATUS_AVAILABLE);

      const { rows } = await pool.query<{ recent: boolean }>(
        `SELECT available_since > now() - interval '1 minute' AS recent
           FROM pets.pets WHERE pet_id = $1`,
        [petId]
      );
      expect(rows[0].recent).toBe(true);
    });
  });
});
