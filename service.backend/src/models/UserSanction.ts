import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType } from '../sequelize';
import { JsonObject } from '../types/common';
import { generateReadableId, getReadableIdSqlLiteral } from '../utils/readable-ids';

export enum SanctionType {
  WARNING = 'warning',
  RESTRICTION = 'restriction',
  TEMPORARY_BAN = 'temporary_ban',
  PERMANENT_BAN = 'permanent_ban',
  MESSAGING_RESTRICTION = 'messaging_restriction',
  POSTING_RESTRICTION = 'posting_restriction',
  APPLICATION_RESTRICTION = 'application_restriction',
}

export enum SanctionReason {
  HARASSMENT = 'harassment',
  SPAM = 'spam',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  TERMS_VIOLATION = 'terms_violation',
  SCAM_ATTEMPT = 'scam_attempt',
  FALSE_INFORMATION = 'false_information',
  ANIMAL_WELFARE_CONCERN = 'animal_welfare_concern',
  REPEATED_VIOLATIONS = 'repeated_violations',
  OTHER = 'other',
}

interface UserSanctionAttributes {
  sanctionId: string;
  userId: string;
  sanctionType: SanctionType;
  reason: SanctionReason;
  description: string;
  isActive: boolean;
  startDate: Date;
  endDate?: Date; // null for permanent sanctions
  duration?: number; // Duration in hours for temporary sanctions
  issuedBy: string; // moderator/admin userId
  issuedByRole: 'ADMIN' | 'MODERATOR' | 'SUPER_ADMIN';
  reportId?: string; // Link to the report that triggered this sanction
  moderatorActionId?: string; // Link to the moderator action
  metadata?: JsonObject;
  appealedAt?: Date;
  appealReason?: string;
  appealStatus?: 'pending' | 'approved' | 'rejected';
  appealResolvedBy?: string;
  appealResolvedAt?: Date;
  appealResolution?: string;
  revokedBy?: string;
  revokedAt?: Date;
  revocationReason?: string;
  notificationSent: boolean;
  internalNotes?: string;
  warningCount?: number; // Track number of warnings for escalation
  createdAt: Date;
  updatedAt: Date;
}

interface UserSanctionCreationAttributes
  extends Optional<UserSanctionAttributes, 'sanctionId' | 'createdAt' | 'updatedAt'> {}

class UserSanction
  extends Model<UserSanctionAttributes, UserSanctionCreationAttributes>
  implements UserSanctionAttributes
{
  public sanctionId!: string;
  public userId!: string;
  public sanctionType!: SanctionType;
  public reason!: SanctionReason;
  public description!: string;
  public isActive!: boolean;
  public startDate!: Date;
  public endDate?: Date;
  public duration?: number;
  public issuedBy!: string;
  public issuedByRole!: 'ADMIN' | 'MODERATOR' | 'SUPER_ADMIN';
  public reportId?: string;
  public moderatorActionId?: string;
  public metadata?: JsonObject;
  public appealedAt?: Date;
  public appealReason?: string;
  public appealStatus?: 'pending' | 'approved' | 'rejected';
  public appealResolvedBy?: string;
  public appealResolvedAt?: Date;
  public appealResolution?: string;
  public revokedBy?: string;
  public revokedAt?: Date;
  public revocationReason?: string;
  public notificationSent!: boolean;
  public internalNotes?: string;
  public warningCount?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public isTemporary(): boolean {
    return !!this.endDate && this.sanctionType !== SanctionType.PERMANENT_BAN;
  }

  public isPermanent(): boolean {
    return this.sanctionType === SanctionType.PERMANENT_BAN || !this.endDate;
  }

  public isExpired(): boolean {
    if (!this.endDate) {
      return false;
    }
    return new Date() > this.endDate;
  }

  public canBeAppealed(): boolean {
    return this.isActive && !this.appealedAt && !this.revokedAt;
  }

  public canBeRevoked(): boolean {
    return this.isActive && !this.revokedAt;
  }

  public hasActiveAppeal(): boolean {
    return !!this.appealedAt && this.appealStatus === 'pending';
  }

  public getRemainingDuration(): number | null {
    if (!this.endDate) {
      return null;
    }
    const now = new Date();
    const remaining = this.endDate.getTime() - now.getTime();
    return Math.max(0, Math.floor(remaining / (1000 * 60 * 60))); // Return hours
  }

  public getDurationInDays(): number | null {
    if (!this.endDate) {
      return null;
    }
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  public getSeverityLevel(): 'low' | 'medium' | 'high' | 'critical' {
    switch (this.sanctionType) {
      case SanctionType.WARNING:
        return 'low';
      case SanctionType.RESTRICTION:
      case SanctionType.MESSAGING_RESTRICTION:
      case SanctionType.POSTING_RESTRICTION:
      case SanctionType.APPLICATION_RESTRICTION:
        return 'medium';
      case SanctionType.TEMPORARY_BAN:
        return 'high';
      case SanctionType.PERMANENT_BAN:
        return 'critical';
      default:
        return 'medium';
    }
  }
}

UserSanction.init(
  {
    sanctionId: {
      type: DataTypes.STRING,
      primaryKey: true,
      field: 'sanction_id',
      defaultValue:
        process.env.NODE_ENV === 'test'
          ? () => generateReadableId('sanction')
          : sequelize.literal(getReadableIdSqlLiteral('sanction')),
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
    },
    sanctionType: {
      type: DataTypes.ENUM(...Object.values(SanctionType)),
      allowNull: false,
      field: 'sanction_type',
    },
    reason: {
      type: DataTypes.ENUM(...Object.values(SanctionReason)),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 2000],
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'start_date',
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'end_date',
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 8760, // Max 1 year in hours
      },
    },
    issuedBy: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'issued_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    issuedByRole: {
      type: DataTypes.ENUM('ADMIN', 'MODERATOR', 'SUPER_ADMIN'),
      allowNull: false,
      field: 'issued_by_role',
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
    moderatorActionId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'moderator_action_id',
      references: {
        model: 'moderator_actions',
        key: 'action_id',
      },
    },
    metadata: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: {},
    },
    appealedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'appealed_at',
    },
    appealReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'appeal_reason',
    },
    appealStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: true,
      field: 'appeal_status',
    },
    appealResolvedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'appeal_resolved_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    appealResolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'appeal_resolved_at',
    },
    appealResolution: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'appeal_resolution',
    },
    revokedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'revoked_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at',
    },
    revocationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'revocation_reason',
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
    warningCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'warning_count',
      validate: {
        min: 0,
      },
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
    tableName: 'user_sanctions',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['sanction_type'],
      },
      {
        fields: ['reason'],
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['start_date'],
      },
      {
        fields: ['end_date'],
      },
      {
        fields: ['issued_by'],
      },
      {
        fields: ['report_id'],
      },
      {
        fields: ['moderator_action_id'],
      },
      {
        fields: ['appeal_status'],
      },
      {
        fields: ['created_at'],
      },
      {
        // Composite index for finding active sanctions for a user
        fields: ['user_id', 'is_active', 'end_date'],
      },
    ],
  }
);

export default UserSanction;
