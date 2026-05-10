import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline (rebaseline 1/10): `refresh_tokens`.
 *
 * The model declares a single-column `replaced_by_token_id` with no
 * `references:` block — it's a soft pointer to another row in this same
 * table, but Sequelize doesn't emit a DB-level FK for it. The cross-table FK
 * to `users.user_id` is added in `00-baseline-zzz-foreign-keys.ts`.
 */
const MIGRATION_KEY = '00-baseline-006-refresh-tokens';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'refresh_tokens',
        {
          token_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          family_id: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          is_revoked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          replaced_by_token_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          created_at: {
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

      await queryInterface.addIndex('refresh_tokens', ['user_id'], {
        name: 'refresh_tokens_user_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('refresh_tokens', ['family_id'], {
        name: 'refresh_tokens_family_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('refresh_tokens', ['is_revoked'], {
        name: 'refresh_tokens_is_revoked_idx',
        transaction: t,
      });
      await queryInterface.addIndex('refresh_tokens', ['expires_at'], {
        name: 'refresh_tokens_expires_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('refresh_tokens', ['user_id', 'family_id'], {
        name: 'refresh_tokens_user_family_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.dropTable('refresh_tokens', { transaction: t });
    });
  },
};
