import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — user_privacy_prefs (rebaseline 9/10).
 *
 * Frozen snapshot of `UserPrivacyPrefs`'s sync() output. FKs (user_id,
 * created_by, updated_by) land in `00-baseline-zzz-foreign-keys.ts`.
 *
 * 1:1 with users — `user_id` is both the primary key and the FK to
 * `users.user_id`. A row is auto-created by `User.afterCreate` so consumers
 * can always assume the row exists. `paranoid: false` — no `deleted_at`.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'user_privacy_prefs',
        {
          user_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          profile_visibility: {
            type: DataTypes.ENUM('public', 'rescues_only', 'private'),
            allowNull: false,
            defaultValue: 'rescues_only',
          },
          show_last_seen: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          show_location: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          allow_search_indexing: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          allow_data_export: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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
        },
        { transaction: t }
      );

      await queryInterface.addIndex('user_privacy_prefs', {
        fields: ['created_by'],
        name: 'user_privacy_prefs_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('user_privacy_prefs', {
        fields: ['updated_by'],
        name: 'user_privacy_prefs_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-057-user-privacy-prefs');
    await queryInterface.dropTable('user_privacy_prefs');
    await dropEnumTypeIfExists(
      queryInterface.sequelize,
      'enum_user_privacy_prefs_profile_visibility'
    );
  },
};
