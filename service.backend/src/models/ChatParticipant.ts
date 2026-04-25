import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { ParticipantRole } from '../types/chat';
import { generateUuidV7 } from '../utils/uuid';
import Chat from './Chat';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

interface ChatParticipantAttributes {
  chat_participant_id: string;
  chat_id: string;
  participant_id: string;
  role: ParticipantRole;
  /** For rescue-role participants, the rescue this participant represents. */
  rescue_id?: string | null;
  last_read_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface ChatParticipantCreationAttributes
  extends Optional<
    ChatParticipantAttributes,
    'chat_participant_id' | 'last_read_at' | 'rescue_id'
  > {}

export class ChatParticipant
  extends Model<ChatParticipantAttributes, ChatParticipantCreationAttributes>
  implements ChatParticipantAttributes
{
  public chat_participant_id!: string;
  public chat_id!: string;
  public participant_id!: string;
  public role!: ParticipantRole;
  public rescue_id!: string | null;
  public last_read_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Add association methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static associate(models: Record<string, any>) {
    ChatParticipant.belongsTo(models.Chat, {
      foreignKey: 'chat_id',
      as: 'chat',
      onDelete: 'CASCADE',
    });
    ChatParticipant.belongsTo(models.User, {
      foreignKey: 'participant_id',
      as: 'User',
    });
  }
}

ChatParticipant.init(
  {
    chat_participant_id: {
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
    participant_id: {
      type: getUuidType(),
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
    },
    role: {
      type: DataTypes.ENUM(...Object.values(ParticipantRole)),
      allowNull: false,
    },
    rescue_id: {
      type: getUuidType(),
      allowNull: true,
    },
    last_read_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'chat_participants',
    modelName: 'ChatParticipant',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        fields: ['chat_id', 'participant_id'],
        unique: true,
        name: 'chat_participants_chat_id_participant_id_unique',
      },
      {
        fields: ['participant_id'],
        name: 'chat_participants_participant_id_idx',
      },
      {
        fields: ['role'],
      },
      ...auditIndexes('chat_participants'),
    ],
  })
);

export default ChatParticipant;
