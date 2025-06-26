import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { JsonObject } from '../types/common';

export enum ReportCategory {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  FALSE_INFORMATION = 'false_information',
  SCAM = 'scam',
  ANIMAL_WELFARE = 'animal_welfare',
  IDENTITY_THEFT = 'identity_theft',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  ESCALATED = 'escalated',
}

export enum ReportSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

interface ReportAttributes {
  reportId: string;
  reporterId: string;
  reportedEntityType: 'user' | 'rescue' | 'pet' | 'application' | 'message' | 'conversation';
  reportedEntityId: string;
  reportedUserId?: string;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  title: string;
  description: string;
  evidence?: Array<{
    type: 'screenshot' | 'url' | 'text' | 'file';
    content: string;
    description?: string;
    uploadedAt: Date;
  }>;
  metadata?: JsonObject;
  assignedModerator?: string;
  assignedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
  resolutionNotes?: string;
  escalatedTo?: string;
  escalatedAt?: Date;
  escalationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReportCreationAttributes
  extends Optional<ReportAttributes, 'reportId' | 'createdAt' | 'updatedAt'> {}

class Report extends Model<ReportAttributes, ReportCreationAttributes> implements ReportAttributes {
  public reportId!: string;
  public reporterId!: string;
  public reportedEntityType!:
    | 'user'
    | 'rescue'
    | 'pet'
    | 'application'
    | 'message'
    | 'conversation';
  public reportedEntityId!: string;
  public reportedUserId?: string;
  public category!: ReportCategory;
  public severity!: ReportSeverity;
  public status!: ReportStatus;
  public title!: string;
  public description!: string;
  public evidence?: Array<{
    type: 'screenshot' | 'url' | 'text' | 'file';
    content: string;
    description?: string;
    uploadedAt: Date;
  }>;
  public metadata?: JsonObject;
  public assignedModerator?: string;
  public assignedAt?: Date;
  public resolvedBy?: string;
  public resolvedAt?: Date;
  public resolution?: string;
  public resolutionNotes?: string;
  public escalatedTo?: string;
  public escalatedAt?: Date;
  public escalationReason?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public isAssigned(): boolean {
    return !!this.assignedModerator;
  }

  public isResolved(): boolean {
    return this.status === ReportStatus.RESOLVED;
  }

  public isDismissed(): boolean {
    return this.status === ReportStatus.DISMISSED;
  }

  public isEscalated(): boolean {
    return this.status === ReportStatus.ESCALATED;
  }

  public canBeAssigned(): boolean {
    return this.status === ReportStatus.PENDING && !this.assignedModerator;
  }

  public canBeResolved(): boolean {
    return [ReportStatus.UNDER_REVIEW, ReportStatus.ESCALATED].includes(this.status);
  }
}

Report.init(
  {
    reportId: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: () => `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    reporterId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'reporter_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    reportedEntityType: {
      type: DataTypes.ENUM('user', 'rescue', 'pet', 'application', 'message', 'conversation'),
      allowNull: false,
      field: 'reported_entity_type',
    },
    reportedEntityId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'reported_entity_id',
    },
    reportedUserId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'reported_user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    category: {
      type: DataTypes.ENUM(...Object.values(ReportCategory)),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM(...Object.values(ReportSeverity)),
      allowNull: false,
      defaultValue: ReportSeverity.MEDIUM,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ReportStatus)),
      allowNull: false,
      defaultValue: ReportStatus.PENDING,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 5000],
      },
    },
    evidence: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    assignedModerator: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'assigned_moderator',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'assigned_at',
    },
    resolvedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'resolved_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at',
    },
    resolution: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isIn: [
          [
            'no_action',
            'warning_issued',
            'content_removed',
            'user_suspended',
            'user_banned',
            'escalated',
          ],
        ],
      },
    },
    resolutionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'resolution_notes',
    },
    escalatedTo: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'escalated_to',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    escalatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'escalated_at',
    },
    escalationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'escalation_reason',
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
    tableName: 'reports',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['reporter_id'],
      },
      {
        fields: ['reported_entity_type', 'reported_entity_id'],
      },
      {
        fields: ['reported_user_id'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['severity'],
      },
      {
        fields: ['assigned_moderator'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

export default Report;
