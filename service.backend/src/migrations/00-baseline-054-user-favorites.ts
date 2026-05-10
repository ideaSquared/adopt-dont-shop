import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline — user_favorites (rebaseline 8/10).
 *
 * Frozen snapshot of `UserFavorite`'s sync() output. Cross-table foreign keys
 * (user_id, pet_id, created_by, updated_by) live in
 * `00-baseline-zzz-foreign-keys.ts` so each per-model file is independently
 * orderable. The columns themselves carry the right shape (UUID), but no
 * REFERENCES clause until the FK file lands.
 *
 * `UserFavorite` is paranoid (`deleted_at`) and uses `withAuditHooks`, so
 * `created_by`, `updated_by`, and `version` are part of the column set and
 * the matching audit indexes are part of the index set. The unique partial
 * index `unique_user_pet_favorite` enforces "one active favorite per
 * user+pet" while permitting historical soft-deleted rows.
 *
 * No ENUM types are declared on this table, so `down()` only drops the
 * table itself.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'user_favorites',
        {
          id: {
            type: DataTypes.UUID,
            primaryKey: true,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          pet_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          created_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('user_favorites', {
        fields: ['user_id', 'pet_id'],
        unique: true,
        name: 'unique_user_pet_favorite',
        where: { deleted_at: null },
        transaction: t,
      });
      await queryInterface.addIndex('user_favorites', {
        fields: ['user_id'],
        name: 'idx_user_favorites_user_id',
        transaction: t,
      });
      await queryInterface.addIndex('user_favorites', {
        fields: ['pet_id'],
        name: 'idx_user_favorites_pet_id',
        transaction: t,
      });
      await queryInterface.addIndex('user_favorites', {
        fields: ['created_at'],
        name: 'idx_user_favorites_created_at',
        transaction: t,
      });
      await queryInterface.addIndex('user_favorites', {
        fields: ['deleted_at'],
        name: 'user_favorites_deleted_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('user_favorites', {
        fields: ['created_by'],
        name: 'user_favorites_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('user_favorites', {
        fields: ['updated_by'],
        name: 'user_favorites_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-054-user-favorites');
    await queryInterface.dropTable('user_favorites');
  },
};
