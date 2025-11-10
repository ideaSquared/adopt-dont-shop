import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

// Swipe action attributes
export interface SwipeActionAttributes {
  swipeActionId: string;
  sessionId: string;
  petId: string;
  userId?: string;
  action: SwipeActionType;
  timestamp: Date;
  responseTime?: number;
  deviceType?: string;
  coordinates?: {
    x: number;
    y: number;
  };
  gestureData?: {
    distance: number;
    velocity: number;
    direction: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Optional attributes for creation
export interface SwipeActionCreationAttributes
  extends Optional<SwipeActionAttributes, 'swipeActionId' | 'createdAt' | 'updatedAt'> {}

// Swipe action type enum
export enum SwipeActionType {
  LIKE = 'like',
  PASS = 'pass',
  SUPER_LIKE = 'super_like',
  INFO = 'info',
}

// Result type for count operations
interface SwipeActionCountResult {
  action: SwipeActionType;
  count: string;
}

// SwipeAction model class
export class SwipeAction
  extends Model<SwipeActionAttributes, SwipeActionCreationAttributes>
  implements SwipeActionAttributes
{
  public swipeActionId!: string;
  public sessionId!: string;
  public petId!: string;
  public userId?: string;
  public action!: SwipeActionType;
  public timestamp!: Date;
  public responseTime?: number;
  public deviceType?: string;
  public coordinates?: {
    x: number;
    y: number;
  };
  public gestureData?: {
    distance: number;
    velocity: number;
    direction: string;
  };

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Static methods for analytics
  static async getUserActionCounts(userId: string): Promise<{
    totalSwipes: number;
    likes: number;
    passes: number;
    superLikes: number;
    infos: number;
  }> {
    const results = (await SwipeAction.findAll({
      where: { userId },
      attributes: ['action', [sequelize.fn('COUNT', sequelize.col('action')), 'count']],
      group: ['action'],
      raw: true,
    })) as unknown as SwipeActionCountResult[];

    const counts = {
      totalSwipes: 0,
      likes: 0,
      passes: 0,
      superLikes: 0,
      infos: 0,
    };

    results.forEach((result: SwipeActionCountResult) => {
      const count = parseInt(result.count);
      counts.totalSwipes += count;

      switch (result.action) {
        case SwipeActionType.LIKE:
          counts.likes = count;
          break;
        case SwipeActionType.PASS:
          counts.passes = count;
          break;
        case SwipeActionType.SUPER_LIKE:
          counts.superLikes = count;
          break;
        case SwipeActionType.INFO:
          counts.infos = count;
          break;
      }
    });

    return counts;
  }

  static async getSessionActions(sessionId: string): Promise<SwipeAction[]> {
    return await SwipeAction.findAll({
      where: { sessionId },
      order: [['timestamp', 'ASC']],
      include: [
        {
          association: 'Pet',
          attributes: ['pet_id', 'name', 'breed', 'type'],
        },
      ],
    });
  }

  static async getPetActionStats(petId: string): Promise<{
    likes: number;
    passes: number;
    superLikes: number;
    infos: number;
    likeRatio: number;
  }> {
    const results = (await SwipeAction.findAll({
      where: { petId },
      attributes: ['action', [sequelize.fn('COUNT', sequelize.col('action')), 'count']],
      group: ['action'],
      raw: true,
    })) as unknown as SwipeActionCountResult[];

    const stats = {
      likes: 0,
      passes: 0,
      superLikes: 0,
      infos: 0,
      likeRatio: 0,
    };

    let totalActions = 0;

    results.forEach((result: SwipeActionCountResult) => {
      const count = parseInt(result.count);
      totalActions += count;

      switch (result.action) {
        case SwipeActionType.LIKE:
          stats.likes = count;
          break;
        case SwipeActionType.PASS:
          stats.passes = count;
          break;
        case SwipeActionType.SUPER_LIKE:
          stats.superLikes = count;
          break;
        case SwipeActionType.INFO:
          stats.infos = count;
          break;
      }
    });

    if (totalActions > 0) {
      stats.likeRatio = (stats.likes + stats.superLikes) / totalActions;
    }

    return stats;
  }

  static async getUserPreferences(userId: string): Promise<{
    favoriteBreeds: string[];
    preferredAgeGroups: string[];
    preferredSizes: string[];
    averageResponseTime: number;
  }> {
    // This would require joining with Pet table to get breed, age, size info
    // For now, return a placeholder structure
    return {
      favoriteBreeds: [],
      preferredAgeGroups: [],
      preferredSizes: [],
      averageResponseTime: 0,
    };
  }
}

// Initialize the model
SwipeAction.init(
  {
    swipeActionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'swipe_sessions',
        key: 'session_id',
      },
      comment: 'Reference to the swipe session',
    },
    petId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'pets',
        key: 'pet_id',
      },
      comment: 'Reference to the pet that was swiped',
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id',
      },
      comment: 'Optional user ID for authenticated actions',
    },
    action: {
      type: DataTypes.ENUM(...Object.values(SwipeActionType)),
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When the action was performed',
    },
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Time taken to make decision in milliseconds',
    },
    deviceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Type of device used for the action',
    },
    coordinates: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Screen coordinates where action occurred',
    },
    gestureData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Gesture metadata for analytics',
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
    tableName: 'swipe_actions',
    modelName: 'SwipeAction',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['session_id'],
        name: 'idx_swipe_actions_session',
      },
      {
        fields: ['pet_id'],
        name: 'idx_swipe_actions_pet',
      },
      {
        fields: ['user_id', 'action'],
        name: 'idx_swipe_actions_user_action',
      },
      {
        fields: ['timestamp'],
        name: 'idx_swipe_actions_timestamp',
      },
      {
        fields: ['action', 'timestamp'],
        name: 'idx_swipe_actions_action_time',
      },
    ],
    comment: 'Individual swipe actions for analytics and behavior tracking',
  }
);

export default SwipeAction;
