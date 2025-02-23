import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'
import Message from './Message'
import User from './User'

interface MessageReadStatusAttributes {
  message_read_status: string
  message_id: string
  user_id: string
  read_at: Date
  created_at: Date
  updated_at: Date
}

interface MessageReadStatusCreationAttributes
  extends Optional<
    MessageReadStatusAttributes,
    'message_read_status' | 'read_at' | 'created_at' | 'updated_at'
  > {}

export class MessageReadStatus
  extends Model<
    MessageReadStatusAttributes,
    MessageReadStatusCreationAttributes
  >
  implements MessageReadStatusAttributes
{
  public message_read_status!: string
  public message_id!: string
  public user_id!: string
  public read_at!: Date
  public readonly created_at!: Date
  public readonly updated_at!: Date

  public static associate(models: any) {
    MessageReadStatus.belongsTo(models.Message, {
      foreignKey: 'message_id',
      as: 'message',
    })
    MessageReadStatus.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    })
  }
}

MessageReadStatus.init(
  {
    message_read_status: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        `'msg_read_' || left(md5(random()::text), 12)`,
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
      onDelete: 'CASCADE',
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
  {
    sequelize,
    tableName: 'message_read_status',
    modelName: 'MessageReadStatus',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        fields: ['message_id', 'user_id'],
        unique: true,
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['read_at'],
      },
    ],
  },
)

export default MessageReadStatus
