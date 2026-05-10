import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline (rebaseline 2/10): `rescue_settings`.
 *
 * 1:1 typed preference table for `rescues` (plan 5.6 — see model docstring).
 * Auto-created via `Rescue.afterCreate` so consumers can always assume the
 * row exists.
 *
 * Cross-table FKs (`rescue_id` → rescues, `created_by`/`updated_by` → users)
 * are intentionally omitted; they live in `00-baseline-zzz-foreign-keys.ts`.
 */
const MIGRATION_KEY = '00-baseline-013-rescue-settings';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'rescue_settings',
        {
          // FK to rescues.rescue_id deferred to 00-baseline-zzz-foreign-keys.ts.
          rescue_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          auto_approve_applications: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          require_home_visit: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          require_references: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          min_adopter_age: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 18,
          },
          allow_out_of_area_adoptions: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          application_expiry_days: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 30,
          },
          // Audit columns (FK constraints added in 00-baseline-zzz-foreign-keys.ts).
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

      await queryInterface.addIndex('rescue_settings', ['created_by'], {
        name: 'rescue_settings_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('rescue_settings', ['updated_by'], {
        name: 'rescue_settings_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.dropTable('rescue_settings', { transaction: t });
    });
  },
};
