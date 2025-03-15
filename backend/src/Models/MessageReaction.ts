import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'
import Message from './Message'
import User from './User'

interface MessageReactionAttributes {
  reaction_id: string
  message_id: string
  user_id: string
  emoji: string
  created_at?: Date
  updated_at?: Date
}

interface MessageReactionCreationAttributes
  extends Optional<
    MessageReactionAttributes,
    'reaction_id' | 'created_at' | 'updated_at'
  > {}

export class MessageReaction
  extends Model<MessageReactionAttributes, MessageReactionCreationAttributes>
  implements MessageReactionAttributes
{
  public reaction_id!: string
  public message_id!: string
  public user_id!: string
  public emoji!: string
  public readonly created_at!: Date
  public readonly updated_at!: Date

  // Add association methods
  public static associate(models: any) {
    MessageReaction.belongsTo(models.Message, {
      foreignKey: 'message_id',
      onDelete: 'CASCADE',
    })
    MessageReaction.belongsTo(models.User, {
      foreignKey: 'user_id',
    })
  }
}

MessageReaction.init(
  {
    reaction_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        "'reaction_' || left(md5(random()::text), 12)",
      ),
    },
    message_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Message,
        key: 'message_id',
      },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: User,
        key: 'user_id',
      },
    },
    emoji: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
  },
  {
    sequelize,
    tableName: 'message_reactions',
    modelName: 'MessageReaction',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['message_id', 'user_id', 'emoji'],
        name: 'message_reactions_unique_user_emoji',
      },
      {
        fields: ['message_id'],
      },
      {
        fields: ['user_id'],
      },
    ],
  },
)

export default MessageReaction
