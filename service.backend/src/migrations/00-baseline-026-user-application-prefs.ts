import { DataTypes, type QueryInterface } from 'sequelize';
import { runInTransaction, assertDestructiveDownAcknowledged } from './_helpers';

/**
 * Per-model rebaseline (domain: applications) —
 * `user_application_prefs` table.
 *
 * Frozen `createTable` body extracted from `models/UserApplicationPrefs.ts`.
 * 1:1 with `users` (user_id is the PK, no separate row id). No ENUM
 * columns. Cross-table FK constraints land in
 * `00-baseline-zzz-foreign-keys.ts`.
 */
const MIGRATION_KEY = '00-baseline-026-user-application-prefs';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'user_application_prefs',
        {
          user_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          auto_fill_profile: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          remember_answers: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          share_with_rescues: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          completion_reminders: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          default_household_size: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          created_by: { type: DataTypes.UUID, allowNull: true },
          updated_by: { type: DataTypes.UUID, allowNull: true },
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
          version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('user_application_prefs', {
        fields: ['created_by'],
        name: 'user_application_prefs_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('user_application_prefs', {
        fields: ['updated_by'],
        name: 'user_application_prefs_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.dropTable('user_application_prefs', { transaction });
    });
  },
};
