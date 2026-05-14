import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — chats (rebaseline 5/10).
 *
 * Frozen snapshot of `Chat`'s sync() output. Cross-table foreign keys
 * (application_id, rescue_id, pet_id, created_by, updated_by) live in
 * `00-baseline-999-foreign-keys.ts` so each per-model file is independently
 * orderable. The columns themselves carry the right shape (UUID), but no
 * REFERENCES clause until the FK file lands.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'chats',
        {
          chat_id: {
            type: DataTypes.UUID,
            primaryKey: true,
          },
          application_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          rescue_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          pet_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          status: {
            type: DataTypes.ENUM('active', 'locked', 'archived'),
            allowNull: false,
            defaultValue: 'active',
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

      await queryInterface.addIndex('chats', {
        fields: ['application_id'],
        name: 'chats_application_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('chats', {
        fields: ['rescue_id'],
        name: 'chats_rescue_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('chats', {
        fields: ['pet_id'],
        name: 'chats_pet_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('chats', { fields: ['status'], transaction: t });
      await queryInterface.addIndex('chats', {
        fields: ['created_by'],
        name: 'chats_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('chats', {
        fields: ['updated_by'],
        name: 'chats_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-029-chats');
    await queryInterface.dropTable('chats');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_chats_status');
  },
};
