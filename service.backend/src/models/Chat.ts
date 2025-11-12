import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { ChatStatus } from '../types/chat';

import { ChatParticipant } from './ChatParticipant';
import { Message } from './Message';
import Rescue from './Rescue';

interface ChatAttributes {
  chat_id: string;
  application_id?: string; // Optional - links to adoption application if chat was initiated from one
  rescue_id: string; // Add rescue_id to attributes
  pet_id?: string; // Optional - links to specific pet if chat was initiated from pet page
  status: ChatStatus;
  created_at?: Date;
  updated_at?: Date;
  Messages?: Message[];
  Participants?: ChatParticipant[];
  rescue?: Rescue | null; // Add optional rescue association
}

interface ChatCreationAttributes
  extends Optional<ChatAttributes, 'chat_id' | 'created_at' | 'updated_at' | 'Messages'> {}

export class Chat extends Model<ChatAttributes, ChatCreationAttributes> implements ChatAttributes {
  public chat_id!: string;
  public application_id?: string;
  public rescue_id!: string; // Add rescue_id to class
  public pet_id?: string; // Add pet_id to class
  public status!: ChatStatus;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public Messages?: Message[];
  public Participants?: ChatParticipant[];
  public rescue?: Rescue | null;

  // Add association methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static associate(models: Record<string, any>) {
    Chat.hasMany(models.Message, {
      foreignKey: 'chat_id',
      as: 'Messages',
      onDelete: 'CASCADE',
    });
    Chat.hasMany(models.ChatParticipant, {
      foreignKey: 'chat_id',
      as: 'Participants',
      onDelete: 'CASCADE',
    });
    Chat.belongsTo(models.Application, {
      foreignKey: 'application_id',
      as: 'application',
    });
    Chat.belongsTo(models.Rescue, {
      foreignKey: 'rescue_id',
      as: 'rescue',
    });
  }
}

Chat.init(
  {
    chat_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    application_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'applications',
        key: 'application_id',
      },
    },
    rescue_id: {
      // Add rescue_id field
      type: getUuidType(),
      allowNull: false,
      references: {
        model: 'rescues',
        key: 'rescue_id',
      },
    },
    pet_id: {
      // Add pet_id field
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'pets',
        key: 'pet_id',
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ChatStatus)),
      allowNull: false,
      defaultValue: ChatStatus.ACTIVE,
      validate: {
        isIn: [Object.values(ChatStatus)],
      },
    },
  },
  {
    sequelize,
    tableName: 'chats',
    modelName: 'Chat',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      {
        fields: ['application_id'],
      },
      {
        fields: ['rescue_id'], // Add index for rescue_id
      },
      {
        fields: ['status'],
      },
    ],
  }
);

export default Chat;
