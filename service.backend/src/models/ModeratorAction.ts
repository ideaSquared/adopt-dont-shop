import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType } from '../sequelize';
import { JsonObject } from '../types/common';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

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
      type: getUuidType(),
      primaryKey: true,
      field: 'action_id',
      defaultValue: () => generateUuidV7(),
    },
    moderatorId: {
      type: getUuidType(),
      allowNull: false,
      field: 'moderator_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'SET NULL',
    },
    reportId: {
      type: getUuidType(),
      allowNull: true,
      field: 'report_id',
      references: {
        model: 'reports',
        key: 'report_id',
      },
      onDelete: 'SET NULL',
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
      type: getUuidType(),
      allowNull: true,
      field: 'target_user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'SET NULL',
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
      type: getJsonType(),
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
      type: getUuidType(),
      allowNull: true,
      field: 'reversed_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'SET NULL',
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
      type: getJsonType(),
      allowNull: false,
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
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'moderator_actions',
    timestamps: true,
    underscored: true,
    // Audit-like append-only log of moderator decisions. The action row
    // itself is immutable history; reversals are new rows. No soft-delete.
    paranoid: false,
    indexes: [
      {
        name: 'moderator_actions_moderator_id_idx',
        fields: ['moderator_id'],
      },
      {
        name: 'moderator_actions_report_id_idx',
        fields: ['report_id'],
      },
      {
        fields: ['target_entity_type', 'target_entity_id'],
      },
      {
        name: 'moderator_actions_target_user_id_idx',
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
        name: 'moderator_actions_reversed_by_idx',
        fields: ['reversed_by'],
      },
      {
        fields: ['created_at'],
      },
      ...auditIndexes('moderator_actions'),
    ],
  })
);

export default ModeratorAction;
