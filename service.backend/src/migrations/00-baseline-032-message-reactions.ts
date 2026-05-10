import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline — message_reactions (rebaseline 5/10).
 *
 * Frozen snapshot of `MessageReaction`'s sync() output. FKs (message_id,
 * user_id, created_by, updated_by) land in
 * `00-baseline-zzz-foreign-keys.ts`.
 *
 * `paranoid: false` on the model — no `deleted_at` column. Reactions are
 * deleted hard.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'message_reactions',
        {
          reaction_id: {
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
          emoji: {
            type: DataTypes.STRING(32),
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
        },
        { transaction: t }
      );

      await queryInterface.addIndex('message_reactions', {
        fields: ['message_id', 'user_id', 'emoji'],
        unique: true,
        name: 'message_reactions_message_user_emoji_unique',
        transaction: t,
      });
      await queryInterface.addIndex('message_reactions', {
        fields: ['user_id'],
        name: 'message_reactions_user_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('message_reactions', {
        fields: ['created_by'],
        name: 'message_reactions_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('message_reactions', {
        fields: ['updated_by'],
        name: 'message_reactions_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-032-message-reactions');
    await queryInterface.dropTable('message_reactions');
  },
};
