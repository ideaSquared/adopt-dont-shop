import { DataTypes, Model, Op, Optional, QueryTypes } from 'sequelize';
import sequelize, { getJsonType, getUuidType, getTsVectorType, TsVector } from '../sequelize';
import { MessageContentFormat } from '../types/chat';
import { ScanSeverity, MessageModerationStatus } from '../services/content-moderation.service';
import Chat from './Chat';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';
import { installGeneratedSearchVector } from './generated-search-vector';

// Reactions moved to the message_reactions table (plan 2.1) — see
// the MessageReaction model. The legacy in-memory shape is gone.
//
// Read receipts moved to the message_reads table (plan 2.1) — see the
// MessageRead model. Same reasoning: the JSONB array blocked per-user
// indexes and made unread-count queries O(messages).

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
  // reactions / read_status moved to typed tables (plan 2.1).
  search_vector?: TsVector;
  // Content moderation fields
  is_flagged?: boolean;
  flag_reason?: string | null;
  flag_severity?: ScanSeverity | null;
  moderation_status?: MessageModerationStatus | null;
  flagged_at?: Date | null;
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
    | 'is_flagged'
    | 'flag_reason'
    | 'flag_severity'
    | 'moderation_status'
    | 'flagged_at'
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
  // reactions / read_status moved to typed tables (plan 2.1) — see
  // MessageReaction and MessageRead. Read-status helpers live in
  // ChatService now.
  public search_vector?: TsVector;
  public is_flagged?: boolean;
  public flag_reason?: string | null;
  public flag_severity?: ScanSeverity | null;
  public moderation_status?: MessageModerationStatus | null;
  public flagged_at?: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public length!: number;
  public Chat?: Chat;
  public Sender?: { firstName?: string; lastName?: string };

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
    // reactions / read_status moved to typed tables (plan 2.1).
    search_vector: {
      type: getTsVectorType(),
      allowNull: true,
      // No-op setter: Postgres owns this column (GENERATED ALWAYS AS ...
      // STORED — see installGeneratedSearchVector below). Without the
      // override Sequelize would include search_vector in INSERTs and
      // Postgres would reject writes to a generated column.
      set() {
        // intentionally empty
      },
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
      type: DataTypes.ENUM(...Object.values(ScanSeverity)),
      allowNull: true,
    },
    moderation_status: {
      type: DataTypes.ENUM(...Object.values(MessageModerationStatus)),
      allowNull: true,
    },
    flagged_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'messages',
    modelName: 'Message',
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
      // Messaging pagination is always "latest N messages in this chat,
      // newest first" (plan 4.4) — composite covers the where + order
      // in one index lookup.
      {
        fields: ['chat_id', { name: 'created_at', order: 'DESC' }],
        name: 'messages_chat_created_idx',
      },
      ...auditIndexes('messages'),
    ],
    // search_vector is now a stored generated column on Postgres
    // (installGeneratedSearchVector below). The hook that recomputed it
    // on every content change has been removed — Postgres maintains the
    // column from `content` directly.
  })
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

// Install a Postgres trigger that maintains search_vector from row content
// so the DB owns the value and there's no JS hook to forget. Messages only
// have one searchable field — the content text.
installGeneratedSearchVector(Message, {
  table: 'messages',
  indexName: 'messages_search_vector_gin_idx',
  expression: "to_tsvector('english', coalesce(NEW.content, ''))",
});

export default Message;
