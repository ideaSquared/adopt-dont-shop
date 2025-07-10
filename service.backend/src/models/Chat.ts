import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

import { Message } from './Message';
import Rescue from './Rescue';

interface ChatAttributes {
  chat_id: string;
  application_id?: string; // Optional - links to adoption application if chat was initiated from one
  rescue_id: string; // Add rescue_id to attributes
  pet_id?: string; // Optional - links to specific pet if chat was initiated from pet page
  status: 'active' | 'locked' | 'archived';
  created_at?: Date;
  updated_at?: Date;
  Messages?: Message[];
  rescue?: Rescue | null; // Add optional rescue association
}

interface ChatCreationAttributes
  extends Optional<ChatAttributes, 'chat_id' | 'created_at' | 'updated_at' | 'Messages'> {}

export class Chat extends Model<ChatAttributes, ChatCreationAttributes> implements ChatAttributes {
  public chat_id!: string;
  public application_id?: string;
  public rescue_id!: string; // Add rescue_id to class
  public pet_id?: string; // Add pet_id to class
  public status!: 'active' | 'locked' | 'archived';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public Messages?: Message[];
  public rescue?: Rescue | null;

  // Add association methods
  public static associate(models: any) {
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
      defaultValue: sequelize.literal(`'chat_' || left(md5(random()::text), 12)`),
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
      type: DataTypes.UUID,
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
      type: DataTypes.ENUM('active', 'locked', 'archived'),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'locked', 'archived']],
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
