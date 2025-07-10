import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import Chat from './Chat';

export type ParticipantRole = 'rescue' | 'user';

interface ChatParticipantAttributes {
  chat_participant_id: string;
  chat_id: string;
  participant_id: string;
  role: ParticipantRole;
  last_read_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface ChatParticipantCreationAttributes
  extends Optional<ChatParticipantAttributes, 'chat_participant_id' | 'last_read_at'> {}

export class ChatParticipant
  extends Model<ChatParticipantAttributes, ChatParticipantCreationAttributes>
  implements ChatParticipantAttributes
{
  public chat_participant_id!: string;
  public chat_id!: string;
  public participant_id!: string;
  public role!: ParticipantRole;
  public last_read_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Add association methods
  public static associate(models: any) {
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
      defaultValue: sequelize.literal(`'chat_participant_' || left(md5(random()::text), 12)`),
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
      type: DataTypes.ENUM('rescue', 'user'),
      allowNull: false,
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
