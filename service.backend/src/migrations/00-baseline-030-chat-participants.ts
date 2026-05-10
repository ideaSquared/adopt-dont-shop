import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — chat_participants (rebaseline 5/10).
 *
 * Frozen snapshot of `ChatParticipant`'s sync() output. FKs (chat_id,
 * participant_id, rescue_id, created_by, updated_by) land in
 * `00-baseline-zzz-foreign-keys.ts`.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'chat_participants',
        {
          chat_participant_id: {
            type: DataTypes.UUID,
            primaryKey: true,
          },
          chat_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          participant_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          role: {
            type: DataTypes.ENUM('rescue', 'user', 'admin', 'member'),
            allowNull: false,
          },
          rescue_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          last_read_at: {
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

      await queryInterface.addIndex('chat_participants', {
        fields: ['chat_id', 'participant_id'],
        unique: true,
        name: 'chat_participants_chat_id_participant_id_unique',
        transaction: t,
      });
      await queryInterface.addIndex('chat_participants', {
        fields: ['participant_id'],
        name: 'chat_participants_participant_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('chat_participants', { fields: ['role'], transaction: t });
      await queryInterface.addIndex('chat_participants', {
        fields: ['created_by'],
        name: 'chat_participants_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('chat_participants', {
        fields: ['updated_by'],
        name: 'chat_participants_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-030-chat-participants');
    await queryInterface.dropTable('chat_participants');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_chat_participants_role');
  },
};
