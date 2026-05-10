import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline (rebaseline 1/10): `permissions`.
 *
 * Reference data (`paranoid: false`). The unique constraint on
 * `permission_name` is declared at the column level.
 */
const MIGRATION_KEY = '00-baseline-003-permissions';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'permissions',
        {
          permission_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          permission_name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
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
      await queryInterface.dropTable('permissions', { transaction: t });
    });
  },
};
