import { DataTypes, Model, Op, Optional, QueryTypes } from 'sequelize';
import sequelize, { getJsonType, getUuidType, getTsVectorType, TsVector } from '../sequelize';
import { MessageContentFormat } from '../types/chat';
import Chat from './Chat';
import { generateUuidV7 } from '../utils/uuid';

export interface MessageReaction {
  user_id: string;
  emoji: string;
  created_at: Date;
}

export interface MessageReadStatus {
  user_id: string;
  read_at: Date;
}

export interface MessageAttachment {
  attachment_id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

interface MessageAttributes {
  message_id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  content_format: MessageContentFormat;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  read_status?: MessageReadStatus[];
  search_vector?: TsVector;
  created_at?: Date;
  updated_at?: Date;
  Chat?: Chat;
  Sender?: { firstName?: string; lastName?: string };
}

interface MessageCreationAttributes
  extends Optional<
    MessageAttributes,
    | 'message_id'
    | 'created_at'
    | 'updated_at'
    | 'search_vector'
    | 'Chat'
    | 'reactions'
    | 'read_status'
  > {}

export class Message
  extends Model<MessageAttributes, MessageCreationAttributes>
  implements MessageAttributes
{
  public message_id!: string;
  public chat_id!: string;
  public sender_id!: string;
  public content!: string;
  public content_format!: MessageContentFormat;
  public attachments?: MessageAttachment[];
  public reactions?: MessageReaction[];
  public read_status?: MessageReadStatus[];
  public search_vector?: TsVector;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public length!: number;
  public Chat?: Chat;
  public Sender?: { firstName?: string; lastName?: string };

  // Instance methods for reactions
  public addReaction(userId: string, emoji: string): void {
    if (!this.reactions) {
      this.reactions = [];
    }

    // Remove existing reaction from this user with same emoji
    this.reactions = this.reactions.filter(r => !(r.user_id === userId && r.emoji === emoji));

    // Add new reaction
    this.reactions.push({
      user_id: userId,
      emoji,
      created_at: new Date(),
    });
  }

  public removeReaction(userId: string, emoji: string): void {
    if (!this.reactions) {
      return;
    }
    this.reactions = this.reactions.filter(r => !(r.user_id === userId && r.emoji === emoji));
  }

  public getReactionCount(emoji?: string): number {
    if (!this.reactions) {
      return 0;
    }
    if (emoji) {
      return this.reactions.filter(r => r.emoji === emoji).length;
    }
    return this.reactions.length;
  }

  public hasUserReacted(userId: string, emoji?: string): boolean {
    if (!this.reactions) {
      return false;
    }
    if (emoji) {
      return this.reactions.some(r => r.user_id === userId && r.emoji === emoji);
    }
    return this.reactions.some(r => r.user_id === userId);
  }

  // Instance methods for read status
  public markAsRead(userId: string): void {
    if (!this.read_status) {
      this.read_status = [];
    }

    // Remove existing read status for this user
    this.read_status = this.read_status.filter(r => r.user_id !== userId);

    // Add new read status
    this.read_status.push({
      user_id: userId,
      read_at: new Date(),
    });
  }

  public isReadBy(userId: string): boolean {
    if (!this.read_status) {
      return false;
    }
    return this.read_status.some(r => r.user_id === userId);
  }

  public getReadCount(): number {
    return this.read_status?.length || 0;
  }

  public getUnreadUsers(chatParticipants: string[]): string[] {
    if (!this.read_status) {
      return chatParticipants;
    }
    const readUserIds = this.read_status.map(r => r.user_id);
    return chatParticipants.filter(userId => !readUserIds.includes(userId));
  }

  // Add static method type declaration
  public static searchMessages: (
    query: string,
    chatId?: string,
    limit?: number,
    offset?: number
  ) => Promise<Message[]>;

  // Add association methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static associate(models: Record<string, any>) {
    Message.belongsTo(models.Chat, {
      foreignKey: 'chat_id',
      as: 'Chat',
      onDelete: 'CASCADE',
    });
    Message.belongsTo(models.User, {
      foreignKey: 'sender_id',
      as: 'Sender',
    });
  }
}

Message.init(
  {
    message_id: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
    },
    chat_id: {
      type: getUuidType(),
      allowNull: false,
      references: {
        model: Chat,
        key: 'chat_id',
      },
      onDelete: 'CASCADE',
    },
    sender_id: {
      type: getUuidType(),
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
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
      type: DataTypes.ENUM(...Object.values(MessageContentFormat)),
      allowNull: false,
      defaultValue: MessageContentFormat.PLAIN,
      validate: {
        isIn: [Object.values(MessageContentFormat)],
      },
    },
    attachments: {
      type: getJsonType(),
      allowNull: false,
      // See reactions/read_status below — same reasoning. Every current
      // caller passes `data.attachments || []`, but the model should
      // default so any new code path can't regress via forgotten field.
      defaultValue: [],
      validate: {
        isValidAttachments(value: MessageAttachment[]) {
          if (!Array.isArray(value)) {
            throw new Error('Attachments must be an array');
          }
          value.forEach(attachment => {
            if (!attachment.attachment_id || !attachment.filename || !attachment.mimeType) {
              throw new Error('Invalid attachment format');
            }
          });
        },
      },
    },
    reactions: {
      type: getJsonType(),
      allowNull: false,
      // A brand new message has no reactions and no readers. Default both to
      // empty arrays at the model level so every Message.create call site
      // (service.sendMessage, seeders, tests, admin tools) doesn't have to
      // remember to pass them. Without this, Sequelize rejected every insert
      // from sendMessage with "Message.reactions cannot be null".
      defaultValue: [],
      validate: {
        isValidReactions(value: MessageReaction[]) {
          if (!Array.isArray(value)) {
            throw new Error('Reactions must be an array');
          }
          value.forEach(reaction => {
            if (!reaction.user_id || !reaction.emoji || !reaction.created_at) {
              throw new Error('Invalid reaction format');
            }
          });
        },
      },
    },
    read_status: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidReadStatus(value: MessageReadStatus[]) {
          if (!Array.isArray(value)) {
            throw new Error('Read status must be an array');
          }
          value.forEach(status => {
            if (!status.user_id || !status.read_at) {
              throw new Error('Invalid read status format');
            }
          });
        },
      },
    },
    search_vector: {
      type: getTsVectorType(),
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
        name: 'messages_chat_id_idx',
      },
      {
        fields: ['sender_id'],
        name: 'messages_sender_id_idx',
      },
      {
        fields: ['created_at'],
        name: 'messages_created_at_idx',
      },
      {
        fields: ['search_vector'],
        using: 'gin',
        name: 'messages_search_vector_gin_idx',
      },
      {
        fields: ['reactions'],
        using: 'gin',
        name: 'messages_reactions_gin_idx',
      },
      {
        fields: ['read_status'],
        using: 'gin',
        name: 'messages_read_status_gin_idx',
      },
    ],
    hooks: {
      beforeSave: async (message: Message) => {
        // Update search vector when content changes
        if (message.changed('content')) {
          const [results] = await sequelize.query("SELECT to_tsvector('english', ?) as vector", {
            replacements: [message.content],
            type: QueryTypes.SELECT,
          });
          message.search_vector = (results as { vector: TsVector }).vector;
        }
      },
    },
  }
);

// Add class method for full-text search
Message.searchMessages = async function (
  query: string,
  chatId?: string,
  limit = 50,
  offset = 0
): Promise<Message[]> {
  const whereClause: Record<string, unknown> = {
    search_vector: {
      [Op.match]: sequelize.fn('plainto_tsquery', 'english', query),
    },
  };

  if (chatId) {
    whereClause.chat_id = chatId;
  }

  const messages = await Message.findAll({
    where: whereClause,
    attributes: {
      include: [
        [
          sequelize.fn(
            'ts_rank',
            sequelize.col('search_vector'),
            sequelize.fn('plainto_tsquery', 'english', query)
          ),
          'rank',
        ],
      ],
    },
    order: [
      ['rank', 'DESC'],
      ['created_at', 'DESC'],
    ],
    limit,
    offset,
  });

  return messages;
};

export default Message;
