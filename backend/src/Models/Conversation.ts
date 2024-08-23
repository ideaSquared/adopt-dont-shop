// src/models/Conversation.ts
import { Association, DataTypes, Model, Optional } from 'sequelize'
import { Participant } from '.'
import sequelize from '../sequelize'

interface ConversationAttributes {
  conversation_id: string
  started_by?: string
  started_at?: Date
  last_message?: string
  last_message_at?: Date
  last_message_by?: string
  pet_id?: string
  status?: string
  unread_messages?: number
  messages_count?: number
  created_at?: Date
  updated_at?: Date
}

interface ConversationCreationAttributes
  extends Optional<ConversationAttributes, 'conversation_id'> {}

class Conversation
  extends Model<ConversationAttributes, ConversationCreationAttributes>
  implements ConversationAttributes
{
  public conversation_id!: string
  public started_by!: string
  public started_at!: Date
  public last_message!: string
  public last_message_at!: Date
  public last_message_by!: string
  public pet_id!: string
  public status!: string
  public unread_messages!: number
  public messages_count!: number
  public created_at!: Date
  public updated_at!: Date

  // Optional associations
  public readonly participants?: Participant[]

  public static associations: {
    participants: Association<Conversation, Participant>
  }
}

Conversation.init(
  {
    conversation_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        `'conversation_' || left(md5(random()::text), 12)`,
      ),
    },
    started_by: {
      type: DataTypes.STRING,
    },
    started_at: {
      type: DataTypes.DATE,
    },
    last_message: {
      type: DataTypes.TEXT,
    },
    last_message_at: {
      type: DataTypes.DATE,
    },
    last_message_by: {
      type: DataTypes.STRING,
    },
    pet_id: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.STRING,
    },
    unread_messages: {
      type: DataTypes.INTEGER,
    },
    messages_count: {
      type: DataTypes.INTEGER,
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
    tableName: 'conversations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
)

export default Conversation
