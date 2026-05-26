/**
 * ADS-649: Add assigned_to column to chats table.
 *
 * The unified triage inbox needs to support assigning chats to admin
 * users, matching the pattern already used by reports (assigned_moderator)
 * and support_tickets (assigned_to).
 */
import { DataTypes, type QueryInterface } from 'sequelize';
import { runInTransaction, createIndexConcurrently, dropIndexConcurrently } from './_helpers';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.addColumn(
        'chats',
        'assigned_to',
        {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'user_id',
          },
          onDelete: 'SET NULL',
        },
        { transaction }
      );
    });

    await createIndexConcurrently(queryInterface.sequelize, {
      name: 'chats_assigned_to_idx',
      table: 'chats',
      columns: ['assigned_to'],
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await dropIndexConcurrently(queryInterface.sequelize, 'chats_assigned_to_idx');
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.removeColumn('chats', 'assigned_to', { transaction });
    });
  },
};
