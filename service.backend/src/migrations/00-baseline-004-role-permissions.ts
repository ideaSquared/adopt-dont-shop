import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline (rebaseline 1/10): `role_permissions`.
 *
 * Junction table for the role/permission many-to-many. Composite primary key
 * (role_id, permission_id). The cross-table FKs to `roles.role_id` and
 * `permissions.permission_id` are added in `00-baseline-zzz-foreign-keys.ts`.
 */
const MIGRATION_KEY = '00-baseline-004-role-permissions';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'role_permissions',
        {
          role_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
          },
          permission_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
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
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.dropTable('role_permissions', { transaction: t });
    });
  },
};
