import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { JsonObject } from '../types/common';

// Swipe session attributes
export interface SwipeSessionAttributes {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  totalSwipes: number;
  likes: number;
  passes: number;
  superLikes: number;
  filters: JsonObject;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Optional attributes for creation
export interface SwipeSessionCreationAttributes
  extends Optional<
    SwipeSessionAttributes,
    | 'sessionId'
    | 'totalSwipes'
    | 'likes'
    | 'passes'
    | 'superLikes'
    | 'isActive'
    | 'createdAt'
    | 'updatedAt'
  > {}

// Device type enum
export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  UNKNOWN = 'unknown',
}

// SwipeSession model class
export class SwipeSession
  extends Model<SwipeSessionAttributes, SwipeSessionCreationAttributes>
  implements SwipeSessionAttributes
{
  public sessionId!: string;
  public userId?: string;
  public startTime!: Date;
  public endTime?: Date;
  public totalSwipes!: number;
  public likes!: number;
  public passes!: number;
  public superLikes!: number;
  public filters!: JsonObject;
  public ipAddress?: string;
  public userAgent?: string;
  public deviceType?: string;
  public isActive!: boolean;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper methods
  public getDuration(): number | null {
    if (!this.endTime) {
      return null;
    }
    return this.endTime.getTime() - this.startTime.getTime();
  }

  public getLikeToSwipeRatio(): number {
    if (this.totalSwipes === 0) {
      return 0;
    }
    return this.likes / this.totalSwipes;
  }

  public markAsCompleted(): void {
    this.endTime = new Date();
    this.isActive = false;
  }

  // Static methods
  static async findActiveSession(sessionId: string): Promise<SwipeSession | null> {
    return await SwipeSession.findOne({
      where: {
        sessionId,
        isActive: true,
      },
    });
  }

  static async getUserActiveSessions(userId: string): Promise<SwipeSession[]> {
    return await SwipeSession.findAll({
      where: {
        userId,
        isActive: true,
      },
      order: [['startTime', 'DESC']],
    });
  }

  static async getSessionStats(sessionId: string): Promise<SwipeSession | null> {
    return await SwipeSession.findOne({
      where: { sessionId },
      include: [
        {
          association: 'SwipeActions',
          attributes: ['action', 'timestamp'],
        },
      ],
    });
  }
}

// Initialize the model
SwipeSession.init(
  {
    sessionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id',
      },
      comment: 'Optional user ID for authenticated sessions',
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When the swipe session started',
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the swipe session ended',
    },
    totalSwipes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: 'Total number of swipes in this session',
    },
    likes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: 'Number of like actions',
    },
    passes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: 'Number of pass actions',
    },
    superLikes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: 'Number of super like actions',
    },
    filters: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Applied filters as JSON object',
    },
    ipAddress: {
      type: DataTypes.INET,
      allowNull: true,
      comment: 'Client IP address for analytics',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Client user agent string',
    },
    deviceType: {
      type: DataTypes.ENUM(...Object.values(DeviceType)),
      allowNull: true,
      defaultValue: DeviceType.UNKNOWN,
      comment: 'Type of device used',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether the session is currently active',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'swipe_sessions',
    modelName: 'SwipeSession',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id', 'is_active'],
        name: 'idx_swipe_sessions_user_active',
      },
      {
        fields: ['start_time'],
        name: 'idx_swipe_sessions_start_time',
      },
      {
        fields: ['session_id'],
        unique: true,
        name: 'idx_swipe_sessions_session_id',
      },
    ],
    comment: 'Tracks user swipe sessions for analytics and state management',
  }
);

export default SwipeSession;
