import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline (rebaseline 1/10): `revoked_tokens`.
 *
 * Note: the original `01-create-revoked-tokens.ts` migration created this
 * table without `updated_at`; migration 14 added the column afterwards.
 * Today's `RevokedToken` model declares both `revoked_at` (acting as
 * createdAt) and `updated_at`, so the baseline includes both. This file
 * runs FIRST (before migration 14), so when migration 14 runs against a
 * fresh DB, its `addColumn` will be skipped — but on existing DBs that ran
 * the legacy `00-baseline.ts`, migration 14 still does its job because
 * SequelizeMeta will have skipped this per-model file via the rebaseline
 * pre-seed (see `docs/migrations/per-model-rebaseline.md` §3).
 */
const MIGRATION_KEY = '00-baseline-007-revoked-tokens';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'revoked_tokens',
        {
          jti: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          revoked_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('revoked_tokens', ['expires_at'], {
        name: 'revoked_tokens_expires_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('revoked_tokens', ['user_id'], {
        name: 'revoked_tokens_user_id_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.dropTable('revoked_tokens', { transaction: t });
    });
  },
};
