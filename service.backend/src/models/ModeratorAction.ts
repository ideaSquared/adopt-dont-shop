import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { JsonObject } from '../types/common';

export enum ActionType {
  WARNING_ISSUED = 'warning_issued',
  CONTENT_REMOVED = 'content_removed',
  USER_SUSPENDED = 'user_suspended',
  USER_BANNED = 'user_banned',
  ACCOUNT_RESTRICTED = 'account_restricted',
  CONTENT_FLAGGED = 'content_flagged',
  REPORT_DISMISSED = 'report_dismissed',
  ESCALATION = 'escalation',
  APPEAL_REVIEWED = 'appeal_reviewed',
  NO_ACTION = 'no_action',
}

export enum ActionSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

interface ModeratorActionAttributes {
  actionId: string;
  moderatorId: string;
  reportId?: string;
  targetEntityType: 'user' | 'rescue' | 'pet' | 'application' | 'message' | 'conversation';
  targetEntityId: string;
  targetUserId?: string;
  actionType: ActionType;
  severity: ActionSeverity;
  reason: string;
  description?: string;
  metadata?: JsonObject;
  duration?: number; // Duration in hours for temporary actions
  expiresAt?: Date;
  isActive: boolean;
  reversedBy?: string;
  reversedAt?: Date;
  reversalReason?: string;
  evidence?: Array<{
    type: 'screenshot' | 'url' | 'text' | 'file';
    content: string;
    description?: string;
  }>;
  notificationSent: boolean;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ModeratorActionCreationAttributes
  extends Optional<ModeratorActionAttributes, 'actionId' | 'createdAt' | 'updatedAt'> {}

class ModeratorAction
  extends Model<ModeratorActionAttributes, ModeratorActionCreationAttributes>
  implements ModeratorActionAttributes
{
  public actionId!: string;
  public moderatorId!: string;
  public reportId?: string;
  public targetEntityType!: 'user' | 'rescue' | 'pet' | 'application' | 'message' | 'conversation';
  public targetEntityId!: string;
  public targetUserId?: string;
  public actionType!: ActionType;
  public severity!: ActionSeverity;
  public reason!: string;
  public description?: string;
  public metadata?: JsonObject;
  public duration?: number;
  public expiresAt?: Date;
  public isActive!: boolean;
  public reversedBy?: string;
  public reversedAt?: Date;
  public reversalReason?: string;
  public evidence?: Array<{
    type: 'screenshot' | 'url' | 'text' | 'file';
    content: string;
    description?: string;
  }>;
  public notificationSent!: boolean;
  public internalNotes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public isTemporary(): boolean {
    return !!this.expiresAt;
  }

  public isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  public canBeReversed(): boolean {
    return this.isActive && !this.reversedAt;
  }

  public isPermanent(): boolean {
    return (
      !this.expiresAt &&
      [ActionType.USER_BANNED, ActionType.CONTENT_REMOVED].includes(this.actionType)
    );
  }

  public getRemainingDuration(): number | null {
    if (!this.expiresAt) {
      return null;
    }
    const now = new Date();
    const remaining = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(remaining / (1000 * 60 * 60))); // Return hours
  }
}

ModeratorAction.init(
  {
    actionId: {
      type: DataTypes.STRING,
      primaryKey: true,
      field: 'action_id',
      defaultValue: () => `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    moderatorId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'moderator_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    reportId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'report_id',
      references: {
        model: 'reports',
        key: 'report_id',
      },
    },
    targetEntityType: {
      type: DataTypes.ENUM('user', 'rescue', 'pet', 'application', 'message', 'conversation'),
      allowNull: false,
      field: 'target_entity_type',
    },
    targetEntityId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'target_entity_id',
    },
    targetUserId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'target_user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    actionType: {
      type: DataTypes.ENUM(...Object.values(ActionType)),
      allowNull: false,
      field: 'action_type',
    },
    severity: {
      type: DataTypes.ENUM(...Object.values(ActionSeverity)),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 500],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 8760, // Max 1 year in hours
      },
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    reversedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'reversed_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    reversedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reversed_at',
    },
    reversalReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'reversal_reason',
    },
    evidence: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    notificationSent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'notification_sent',
    },
    internalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'internal_notes',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'moderator_actions',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['moderator_id'],
      },
      {
        fields: ['report_id'],
      },
      {
        fields: ['target_entity_type', 'target_entity_id'],
      },
      {
        fields: ['target_user_id'],
      },
      {
        fields: ['action_type'],
      },
      {
        fields: ['severity'],
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['expires_at'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

export default ModeratorAction;
