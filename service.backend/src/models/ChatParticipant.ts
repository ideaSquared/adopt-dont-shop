import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { ParticipantRole } from '../types/chat';
import { generateReadableId, getReadableIdSqlLiteral } from '../utils/readable-id';
import Chat from './Chat';

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
      type: DataTypes.STRING,
      primaryKey: true,
      // Server-generated readable ID, same pattern as chat_id/message_id.
      // Without this, ChatService.createChat()'s participant inserts hit
      // a PG not-null violation because the service passes only
      // chat_id/participant_id/role.
      defaultValue:
        process.env.NODE_ENV === 'test'
          ? () => generateReadableId('participant')
          : sequelize.literal(getReadableIdSqlLiteral('participant')),
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
    participant_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    role: {
      type: DataTypes.ENUM(...Object.values(ParticipantRole)),
      allowNull: false,
    },
    rescue_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_read_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
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
      },
      {
        fields: ['participant_id'],
      },
      {
        fields: ['role'],
      },
    ],
  }
);

export default ChatParticipant;
