import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

/**
 * Per-user emoji reactions on a message (plan 2.1 — typed table
 * replacing Message.reactions JSONB).
 *
 * Composite uniqueness on (message_id, user_id, emoji) so the same
 * user can't react with the same emoji twice on one message; they
 * can still attach different emoji to the same message.
 */
interface MessageReactionAttributes {
  reaction_id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at?: Date;
  updated_at?: Date;
}

interface MessageReactionCreationAttributes extends Optional<
  MessageReactionAttributes,
  'reaction_id' | 'created_at' | 'updated_at'
> {}

class MessageReaction
  extends Model<MessageReactionAttributes, MessageReactionCreationAttributes>
  implements MessageReactionAttributes
{
  public reaction_id!: string;
  public message_id!: string;
  public user_id!: string;
  public emoji!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MessageReaction.init(
  {
    reaction_id: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
    },
    message_id: {
      type: getUuidType(),
      allowNull: false,
      references: { model: 'messages', key: 'message_id' },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: getUuidType(),
      allowNull: false,
      references: { model: 'users', key: 'user_id' },
      onDelete: 'CASCADE',
    },
    emoji: {
      type: DataTypes.STRING(32),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 32] },
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'message_reactions',
    modelName: 'MessageReaction',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['message_id', 'user_id', 'emoji'],
        name: 'message_reactions_message_user_emoji_unique',
      },
      // Lookup "who reacted to this message" — covered by the unique
      // index's leading message_id column, but added explicitly for
      // clarity and to keep the standards check happy.
      { fields: ['user_id'], name: 'message_reactions_user_id_idx' },
      ...auditIndexes('message_reactions'),
    ],
  })
);

export default MessageReaction;
