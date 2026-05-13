import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Idempotency note (per-model rebaseline coexistence):
 *
 * The new `00-baseline-011-invitations.ts` baseline freezes today's
 * `sync()` output, which already declares the same indexes and unique
 * constraint that this migration adds (token unique, rescue_id, user_id,
 * email). On fresh DBs the baseline runs first, so the bare `addIndex` /
 * `addConstraint` calls below would fail with a duplicate-name error.
 *
 * The original index/constraint additions are therefore expressed as raw
 * SQL with `IF NOT EXISTS` (and a `pg_constraint` precheck for the unique
 * constraint, since Postgres has no `ADD CONSTRAINT IF NOT EXISTS`). On
 * existing DBs created by the legacy monolithic `00-baseline.ts`, the
 * objects don't exist yet and these statements still create them.
 *
 * The FK swap below (`removeConstraint` + `addConstraint`) is unchanged —
 * it has always been idempotent via the `.catch(() => {})` on the
 * removeConstraint, and the per-model baseline does not declare those FKs
 * (they live in `00-baseline-zzz-foreign-keys.ts`).
 *
 * `down()` is intentionally unchanged. Per the design doc, rollback for
 * the rebaseline-coexistent migrations is via DB backup, not
 * `db:migrate:undo`.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    const sequelize = queryInterface.sequelize;

    // Add unique constraint on invitations.token (skip if already present).
    // The per-model baseline declares the unique via `token: { unique: true }`
    // on the column, which Sequelize emits as a `CREATE UNIQUE INDEX` (visible
    // in `pg_indexes`) rather than `ADD CONSTRAINT UNIQUE` (visible in
    // `pg_constraint`). Check BOTH catalogs so the precheck skips either
    // shape — otherwise `addConstraint` would error with
    // "relation invitations_token_unique already exists".
    const [existingConstraint] = await sequelize.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'invitations_token_unique'`
    );
    const [existingIndex] = await sequelize.query(
      `SELECT 1 FROM pg_indexes WHERE indexname = 'invitations_token_unique'`
    );
    if (
      (existingConstraint as unknown[]).length === 0 &&
      (existingIndex as unknown[]).length === 0
    ) {
      await queryInterface.addConstraint('invitations', {
        fields: ['token'],
        type: 'unique',
        name: 'invitations_token_unique',
      });
    }

    // Add index on rescue_id (FK performance)
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS "invitations_rescue_id_idx" ON "invitations" ("rescue_id")`
    );

    // Add index on user_id (FK performance)
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS "invitations_user_id_idx" ON "invitations" ("user_id")`
    );

    // Add index on email (lookup by invitee email)
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS "invitations_email_idx" ON "invitations" ("email")`
    );

    // Fix FK onDelete for rescue_id: CASCADE (invitation is meaningless without rescue)
    await queryInterface.removeConstraint('invitations', 'invitations_rescue_id_fkey').catch(() => {
      // Constraint name may differ; ignore if not found
    });
    await queryInterface.addConstraint('invitations', {
      fields: ['rescue_id'],
      type: 'foreign key',
      name: 'invitations_rescue_id_fkey',
      references: { table: 'rescues', field: 'rescue_id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // Fix FK onDelete for user_id: SET NULL (keep invitation row if user deleted)
    await queryInterface.removeConstraint('invitations', 'invitations_user_id_fkey').catch(() => {
      // Constraint name may differ; ignore if not found
    });
    await queryInterface.addConstraint('invitations', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'invitations_user_id_fkey',
      references: { table: 'users', field: 'user_id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface
      .removeConstraint('invitations', 'invitations_token_unique')
      .catch(() => {});
    await queryInterface.removeIndex('invitations', 'invitations_rescue_id_idx').catch(() => {});
    await queryInterface.removeIndex('invitations', 'invitations_user_id_idx').catch(() => {});
    await queryInterface.removeIndex('invitations', 'invitations_email_idx').catch(() => {});

    // Restore FKs without explicit onDelete (defaults to NO ACTION)
    await queryInterface
      .removeConstraint('invitations', 'invitations_rescue_id_fkey')
      .catch(() => {});
    await queryInterface.addConstraint('invitations', {
      fields: ['rescue_id'],
      type: 'foreign key',
      name: 'invitations_rescue_id_fkey',
      references: { table: 'rescues', field: 'rescue_id' },
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE',
    });

    await queryInterface
      .removeConstraint('invitations', 'invitations_user_id_fkey')
      .catch(() => {});
    await queryInterface.addConstraint('invitations', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'invitations_user_id_fkey',
      references: { table: 'users', field: 'user_id' },
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE',
    });
  },
};
