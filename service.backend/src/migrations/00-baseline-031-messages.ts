import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — messages (rebaseline 5/10).
 *
 * Frozen snapshot of `Message`'s sync() output. FKs (chat_id, sender_id,
 * created_by, updated_by) land in `00-baseline-999-foreign-keys.ts`.
 *
 * Two model concerns NOT replicated as DDL here:
 *
 *   - The `search_vector` BEFORE INSERT/UPDATE trigger and its GIN
 *     index (`messages_search_vector_gin_idx`) are installed by the model's
 *     afterSync hook (`installGeneratedSearchVector` in
 *     `models/generated-search-vector.ts`) — a model concern, not a baseline
 *     concern. The column itself is declared here as a writable TSVECTOR.
 *   - The `attachments` JSONB column declares its column type only. The
 *     URL-shape correctness inside elements is enforced by callers (model
 *     validators); migrations 17/18 fixed past write paths but the baseline
 *     column type is just JSONB.
 *
 * Moderation columns (is_flagged / flag_reason / flag_severity /
 * moderation_status / flagged_at) are part of the current `Message` model
 * and therefore part of `sync()` output, but the moderation INDEXES added
 * by migration 02 are not in the model's index list and are NOT part of
 * the baseline — they continue to be created by migration 02.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'messages',
        {
          message_id: {
            type: DataTypes.UUID,
            primaryKey: true,
          },
          chat_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          sender_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          content: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          content_format: {
            type: DataTypes.ENUM('plain', 'markdown', 'html'),
            allowNull: false,
            defaultValue: 'plain',
          },
          attachments: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
          },
          search_vector: {
            type: DataTypes.TSVECTOR,
            allowNull: true,
          },
          is_flagged: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          flag_reason: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          flag_severity: {
            type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
            allowNull: true,
          },
          moderation_status: {
            type: DataTypes.ENUM('pending_review', 'approved', 'rejected'),
            allowNull: true,
          },
          flagged_at: {
            type: DataTypes.DATE,
            allowNull: true,
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

      await queryInterface.addIndex('messages', {
        fields: ['chat_id'],
        name: 'messages_chat_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('messages', {
        fields: ['sender_id'],
        name: 'messages_sender_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('messages', {
        fields: ['created_at'],
        name: 'messages_created_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('messages', {
        fields: ['search_vector'],
        using: 'gin',
        name: 'messages_search_vector_gin_idx',
        transaction: t,
      });
      await queryInterface.addIndex('messages', {
        fields: ['chat_id', { name: 'created_at', order: 'DESC' }],
        name: 'messages_chat_created_idx',
        transaction: t,
      });
      await queryInterface.addIndex('messages', {
        fields: ['created_by'],
        name: 'messages_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('messages', {
        fields: ['updated_by'],
        name: 'messages_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-031-messages');
    await queryInterface.dropTable('messages');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_messages_content_format');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_messages_flag_severity');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_messages_moderation_status');
  },
};
