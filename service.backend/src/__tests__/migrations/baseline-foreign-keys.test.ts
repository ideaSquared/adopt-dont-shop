/**
 * Round-trip + behaviour tests for the FK baseline file
 * `00-baseline-zzz-foreign-keys.ts`.
 *
 * Strategy:
 *   1. `sequelize.sync({ force: true })` to bootstrap all tables (sync
 *      installs FKs itself; we drop them so the migration's `up()` has
 *      work to do).
 *   2. Drop every cross-table FK constraint produced by sync().
 *   3. Run the FK baseline's `up()` — re-installs them.
 *   4. Spot-check pg_constraint to confirm the constraints exist with
 *      the expected `confdeltype` / `confupdtype` for representative
 *      FKs (CASCADE, SET NULL, NO ACTION combinations).
 *   5. Idempotency: `up()` twice doesn't throw — the precheck skips
 *      already-installed constraints.
 *   6. `down()` refuses without the destructive-down ack; with the ack,
 *      it drops every constraint we added.
 *
 * Postgres-only — `pg_constraint` and `pg_dump`-equivalent behaviour
 * have no SQLite analogue; sync()-bootstrapped SQLite wouldn't emit FK
 * constraints in the same shape.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import * as models from '../../models';
import fkBaseline from '../../migrations/00-baseline-zzz-foreign-keys';

// Force every model file to register with sequelize so sync() has the
// full table set.
void models;

const isPostgres = sequelize.getDialect() === 'postgres';
const describeIfPostgres = isPostgres ? describe : describe.skip;

const queryInterface = sequelize.getQueryInterface();

type ConstraintRow = { confdeltype: string; confupdtype: string };

/**
 * Map Postgres' single-char codes from `pg_constraint` to human strings.
 * https://www.postgresql.org/docs/current/catalog-pg-constraint.html
 *   a = NO ACTION, r = RESTRICT, c = CASCADE, n = SET NULL, d = SET DEFAULT
 */
const PG_ACTION: Record<string, string> = {
  a: 'NO ACTION',
  r: 'RESTRICT',
  c: 'CASCADE',
  n: 'SET NULL',
  d: 'SET DEFAULT',
};

const fetchConstraintActions = async (
  name: string
): Promise<{ onDelete: string; onUpdate: string } | null> => {
  const [rows] = await sequelize.query(
    `SELECT confdeltype, confupdtype FROM pg_constraint WHERE conname = '${name}'`
  );
  const row = (rows as ConstraintRow[])[0];
  if (!row) return null;
  return {
    onDelete: PG_ACTION[row.confdeltype] ?? row.confdeltype,
    onUpdate: PG_ACTION[row.confupdtype] ?? row.confupdtype,
  };
};

const dropAllForeignKeys = async (): Promise<void> => {
  // Drop every FK in current_schema so up() has work to do.
  const [rows] = await sequelize.query(
    `SELECT conname, conrelid::regclass AS tbl FROM pg_constraint
       WHERE contype = 'f' AND connamespace = current_schema()::regnamespace`
  );
  for (const r of rows as Array<{ conname: string; tbl: string }>) {
    await sequelize.query(`ALTER TABLE ${r.tbl} DROP CONSTRAINT "${r.conname}"`);
  }
};

const ackKey = (key: string): void => {
  process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN = '1';
  process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY = key;
};

const clearAck = (): void => {
  delete process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN;
  delete process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY;
};

describeIfPostgres('per-model baseline — cross-table foreign keys', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
    await dropAllForeignKeys();
  });

  afterEach(() => {
    clearAck();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('up()', () => {
    it('installs FK constraints with the expected ON DELETE / ON UPDATE actions', async () => {
      await fkBaseline.up(queryInterface);

      // Representative samples covering every ON DELETE / ON UPDATE
      // combination the FK file emits. Names follow Postgres' default
      // `<table>_<column>_fkey`.

      // CASCADE / CASCADE — model declares both, also belongsTo adds CASCADE.
      expect(await fetchConstraintActions('applications_user_id_fkey')).toEqual({
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
      // CASCADE / CASCADE — junction table FK (belongsToMany default).
      expect(await fetchConstraintActions('user_roles_user_id_fkey')).toEqual({
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
      expect(await fetchConstraintActions('role_permissions_role_id_fkey')).toEqual({
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // SET NULL / CASCADE — nullable FK with belongsTo association.
      expect(await fetchConstraintActions('moderator_actions_moderator_id_fkey')).toEqual({
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

      // SET NULL / NO ACTION — audit FK (no belongsTo).
      expect(await fetchConstraintActions('users_created_by_fkey')).toEqual({
        onDelete: 'SET NULL',
        onUpdate: 'NO ACTION',
      });
      expect(await fetchConstraintActions('rescues_updated_by_fkey')).toEqual({
        onDelete: 'SET NULL',
        onUpdate: 'NO ACTION',
      });

      // CASCADE / CASCADE — single-column FK on a status-transition log.
      expect(
        await fetchConstraintActions('application_status_transitions_application_id_fkey')
      ).toEqual({ onDelete: 'CASCADE', onUpdate: 'CASCADE' });

      // SET NULL / CASCADE — invitations.user_id (mig 04 also creates
      // this; the precheck means we don't double-install).
      expect(await fetchConstraintActions('invitations_user_id_fkey')).toEqual({
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    });

    it('does NOT install a FK on audit_logs.user (soft reference per D10)', async () => {
      await fkBaseline.up(queryInterface);
      expect(await fetchConstraintActions('audit_logs_user_fkey')).toBeNull();
    });

    it('is idempotent — running up() a second time does not throw', async () => {
      await fkBaseline.up(queryInterface);
      await expect(fkBaseline.up(queryInterface)).resolves.toBeUndefined();
    });

    it('coexists with migration 04 — pre-existing invitation FKs are not duplicated', async () => {
      // Simulate the migration-04 ordering: install the invitation FKs
      // first (under the same names), then run the FK baseline. The
      // precheck must skip the existing constraints rather than throwing
      // a duplicate-name error.
      await queryInterface.addConstraint('invitations', {
        fields: ['rescue_id'],
        type: 'foreign key',
        name: 'invitations_rescue_id_fkey',
        references: { table: 'rescues', field: 'rescue_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      await expect(fkBaseline.up(queryInterface)).resolves.toBeUndefined();

      // The FK still exists with the original definition (migration 04's,
      // which happens to match what this file would emit).
      expect(await fetchConstraintActions('invitations_rescue_id_fkey')).toEqual({
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    });
  });

  describe('down()', () => {
    it('refuses without the destructive-down acknowledgement', async () => {
      await fkBaseline.up(queryInterface);
      await expect(fkBaseline.down(queryInterface)).rejects.toThrow(/destructive down/i);
    });

    it('drops every constraint when acknowledged', async () => {
      await fkBaseline.up(queryInterface);
      ackKey('00-baseline-zzz-foreign-keys');

      await fkBaseline.down(queryInterface);

      expect(await fetchConstraintActions('applications_user_id_fkey')).toBeNull();
      expect(await fetchConstraintActions('users_created_by_fkey')).toBeNull();
      expect(await fetchConstraintActions('user_roles_user_id_fkey')).toBeNull();
      expect(await fetchConstraintActions('invitations_rescue_id_fkey')).toBeNull();
    });
  });
});
