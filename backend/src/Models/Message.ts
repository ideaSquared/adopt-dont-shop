// src/models/Message.ts
import { DataTypes, Model, Op, Optional, QueryTypes } from 'sequelize'
import sequelize from '../sequelize'
import Chat from './Chat'

export interface MessageAttachment {
  attachment_id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
}

interface MessageAttributes {
  message_id: string
  chat_id: string
  sender_id: string
  content: string
  content_format: 'plain' | 'markdown' | 'html'
  attachments?: MessageAttachment[]
  search_vector?: any // tsvector type for full-text search
  created_at?: Date
  updated_at?: Date
  Chat?: Chat
}

interface MessageCreationAttributes
  extends Optional<
    MessageAttributes,
    'message_id' | 'created_at' | 'updated_at' | 'search_vector' | 'Chat'
  > {}

export class Message
  extends Model<MessageAttributes, MessageCreationAttributes>
  implements MessageAttributes
{
  public message_id!: string
  public chat_id!: string
  public sender_id!: string
  public content!: string
  public content_format!: 'plain' | 'markdown' | 'html'
  public attachments?: MessageAttachment[]
  public search_vector?: any
  public readonly created_at!: Date
  public readonly updated_at!: Date
  public length!: number
  public Chat?: Chat

  // Add static method type declaration
  public static searchMessages: (
    query: string,
    chatId?: string,
    limit?: number,
    offset?: number,
  ) => Promise<Message[]>

  // Add association methods
  public static associate(models: any) {
    Message.belongsTo(models.Chat, {
      foreignKey: 'chat_id',
      as: 'Chat',
      onDelete: 'CASCADE',
    })
    Message.belongsTo(models.User, {
      foreignKey: 'sender_id',
      as: 'User',
    })
  }
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
    chat_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Chat,
        key: 'chat_id',
      },
      onDelete: 'CASCADE',
    },
    sender_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 10000], // Maximum length of 10,000 characters
      },
    },
    content_format: {
      type: DataTypes.ENUM('plain', 'markdown', 'html'),
      allowNull: false,
      defaultValue: 'plain',
      validate: {
        isIn: [['plain', 'markdown', 'html']],
      },
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      validate: {
        isValidAttachments(value: MessageAttachment[]) {
          if (!Array.isArray(value)) {
            throw new Error('Attachments must be an array')
          }
          value.forEach((attachment) => {
            if (
              !attachment.attachment_id ||
              !attachment.filename ||
              !attachment.mimeType
            ) {
              throw new Error('Invalid attachment format')
            }
          })
        },
      },
    },
    search_vector: {
      type: DataTypes.TSVECTOR,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'messages',
    modelName: 'Message',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        fields: ['chat_id'],
      },
      {
        fields: ['sender_id'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['search_vector'],
        using: 'gin',
      },
    ],
    hooks: {
      beforeSave: async (message: Message) => {
        // Update search vector when content changes
        if (message.changed('content')) {
          const [results] = await sequelize.query(
            "SELECT to_tsvector('english', ?) as vector",
            {
              replacements: [message.content],
              type: QueryTypes.SELECT,
            },
          )
          message.search_vector = (results as any).vector
        }
      },
    },
  },
)

// Add class method for full-text search
Message.searchMessages = async function (
  query: string,
  chatId?: string,
  limit = 50,
  offset = 0,
): Promise<Message[]> {
  const whereClause: any = {
    search_vector: {
      [Op.match]: sequelize.fn('plainto_tsquery', 'english', query),
    },
  }

  if (chatId) {
    whereClause.chat_id = chatId
  }

  const messages = await Message.findAll({
    where: whereClause,
    attributes: {
      include: [
        [
          sequelize.fn(
            'ts_rank',
            sequelize.col('search_vector'),
            sequelize.fn('plainto_tsquery', 'english', query),
          ),
          'rank',
        ],
      ],
    },
    order: [
      [
        sequelize.fn(
          'ts_rank',
          sequelize.col('search_vector'),
          sequelize.fn('plainto_tsquery', 'english', query),
        ),
        'DESC',
      ],
      ['created_at', 'DESC'],
    ],
    limit,
    offset,
  })

  return messages
}

export default Message
