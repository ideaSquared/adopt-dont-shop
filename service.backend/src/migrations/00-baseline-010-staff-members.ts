import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline (rebaseline 1/10): `staff_members`.
 *
 * Uses `withAuditHooks` so the table picks up the `version` column and
 * standard `created_by`/`updated_by` audit columns. `paranoid: true` adds
 * `deleted_at`. Cross-table FKs (`rescue_id`, `user_id`, `verified_by`,
 * `added_by`, `created_by`, `updated_by`) live in
 * `00-baseline-999-foreign-keys.ts`.
 */
const MIGRATION_KEY = '00-baseline-010-staff-members';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'staff_members',
        {
          staff_member_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          rescue_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          title: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          is_verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          verified_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          verified_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          added_by: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          added_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
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
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('staff_members', ['rescue_id'], {
        name: 'staff_members_rescue_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('staff_members', ['user_id'], {
        name: 'staff_members_user_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('staff_members', ['verified_by'], {
        name: 'staff_members_verified_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('staff_members', ['added_by'], {
        name: 'staff_members_added_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('staff_members', ['deleted_at'], {
        name: 'staff_members_deleted_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('staff_members', ['created_by'], {
        name: 'staff_members_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('staff_members', ['updated_by'], {
        name: 'staff_members_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.dropTable('staff_members', { transaction: t });
    });
  },
};
