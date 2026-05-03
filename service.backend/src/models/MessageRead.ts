import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

// Plan 2.1 — Message.read_status[] JSONB extracted to a typed table.
// One row per (message, reader). The legacy in-memory shape lived as
// JSONB on every message row, which made unread-count queries
// O(messages) and prevented per-user reads from being indexed. With a
// dedicated table the hot paths (count unread for a user in a chat,
// did user X read message Y) are simple SQL keyed on indexes.

interface MessageReadAttributes {
  read_id: string;
  message_id: string;
  user_id: string;
  read_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface MessageReadCreationAttributes extends Optional<
  MessageReadAttributes,
  'read_id' | 'read_at' | 'created_at' | 'updated_at'
> {}

export class MessageRead
  extends Model<MessageReadAttributes, MessageReadCreationAttributes>
  implements MessageReadAttributes
{
  public read_id!: string;
  public message_id!: string;
  public user_id!: string;
  public read_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MessageRead.init(
  {
    read_id: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
    },
    message_id: {
      type: getUuidType(),
      allowNull: false,
      references: {
        model: 'messages',
        key: 'message_id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    user_id: {
      type: getUuidType(),
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      // Reads are forensic per-user — preserve the row even if the
      // reader is removed (matches the AuditLog pattern). The chat
      // unread count just stops surfacing a non-existent user.
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    modelName: 'MessageRead',
    tableName: 'message_reads',
    timestamps: true,
    underscored: true,
    indexes: [
      // One row per (message, user). Enforces the "a user reads a
      // message at most once" invariant — duplicate marks of the same
      // message just hit findOrCreate's upsert path.
      {
        fields: ['message_id', 'user_id'],
        name: 'message_reads_message_user_unique',
        unique: true,
      },
      // "How many of this chat's messages has this user read?" — the
      // unread-count query needs to filter by user_id efficiently.
      {
        fields: ['user_id'],
        name: 'message_reads_user_id_idx',
      },
      ...auditIndexes('message_reads'),
    ],
  })
);

export default MessageRead;
