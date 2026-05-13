import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline — message_reads (rebaseline 5/10).
 *
 * Frozen snapshot of `MessageRead`'s sync() output. FKs (message_id,
 * user_id, created_by, updated_by) land in
 * `00-baseline-999-foreign-keys.ts`.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'message_reads',
        {
          read_id: {
            type: DataTypes.UUID,
            primaryKey: true,
          },
          message_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          read_at: {
            type: DataTypes.DATE,
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

      await queryInterface.addIndex('message_reads', {
        fields: ['message_id', 'user_id'],
        unique: true,
        name: 'message_reads_message_user_unique',
        transaction: t,
      });
      await queryInterface.addIndex('message_reads', {
        fields: ['user_id'],
        name: 'message_reads_user_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('message_reads', {
        fields: ['created_by'],
        name: 'message_reads_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('message_reads', {
        fields: ['updated_by'],
        name: 'message_reads_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-033-message-reads');
    await queryInterface.dropTable('message_reads');
  },
};
