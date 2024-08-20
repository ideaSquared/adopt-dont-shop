// src/models/Message.ts
import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'

interface MessageAttributes {
  message_id: string
  conversation_id?: string
  sender_id?: string
  message_text?: string
  sent_at?: Date
  read_at?: Date
  attachments?: string[]
  status?: string
  created_at?: Date
  updated_at?: Date
}

interface MessageCreationAttributes
  extends Optional<MessageAttributes, 'message_id'> {}

class Message
  extends Model<MessageAttributes, MessageCreationAttributes>
  implements MessageAttributes
{
  public message_id!: string
  public conversation_id!: string
  public sender_id!: string
  public message_text!: string
  public sent_at!: Date
  public read_at!: Date
  public attachments!: string[]
  public status!: string
  public created_at!: Date
  public updated_at!: Date
}

Message.init(
  {
    message_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        `'message_' || left(md5(random()::text), 12)`,
      ),
    },
    conversation_id: {
      type: DataTypes.STRING,
    },
    sender_id: {
      type: DataTypes.STRING,
    },
    message_text: {
      type: DataTypes.TEXT,
    },
    sent_at: {
      type: DataTypes.DATE,
    },
    read_at: {
      type: DataTypes.DATE,
    },
    attachments: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
    },
    status: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'messages',
    timestamps: true,
  },
)

export default Message
