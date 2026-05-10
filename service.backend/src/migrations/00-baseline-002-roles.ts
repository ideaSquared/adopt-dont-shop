import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline (rebaseline 1/10): `roles`.
 *
 * Reference data (`paranoid: false`). Note the model maps `name` to the
 * column `role_name`, so the DDL column is `role_name`, not `name`. The
 * unique constraint on `role_name` is applied at the column level — no
 * separate index entry in the model's `init()` block.
 */
const MIGRATION_KEY = '00-baseline-002-roles';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'roles',
        {
          role_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          role_name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
          },
          description: {
            type: DataTypes.TEXT,
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
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.dropTable('roles', { transaction: t });
    });
  },
};
