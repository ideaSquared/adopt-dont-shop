import { DataTypes, Model, Op, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { JsonObject } from '../types/common';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

// Simple application status enum for small charities
export enum ApplicationStatus {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

// Application priority enum
export enum ApplicationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Simplified stage enum for workflow tracking
export enum ApplicationStage {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  VISITING = 'visiting',
  DECIDING = 'deciding',
  RESOLVED = 'resolved',
  WITHDRAWN = 'withdrawn',
}

// Final outcome enum for resolved applications
export enum ApplicationOutcome {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

interface ApplicationAttributes {
  applicationId: string;
  userId: string;
  petId: string;
  rescueId: string;
  status: ApplicationStatus;
  priority: ApplicationPriority;

  // Stage-based workflow fields
  stage: ApplicationStage;
  finalOutcome?: ApplicationOutcome | null;
  reviewStartedAt?: Date | null;
  visitScheduledAt?: Date | null;
  visitCompletedAt?: Date | null;
  resolvedAt?: Date | null;
  withdrawalReason?: string | null;
  rejectionReason?: string | null;

  // Action tracking
  actionedBy?: string | null;
  actionedAt?: Date | null;
  answers: JsonObject;
  // references moved to the application_references table (plan 2.1) —
  // see ApplicationReference. Application.hasMany(ApplicationReference).
  documents: Array<{
    documentId: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: Date;
    verified: boolean;
  }>;
  interviewNotes?: string | null;
  homeVisitNotes?: string | null;
  score?: number | null;
  tags?: string[] | null;
  notes?: string | null;
  submittedAt?: Date | null;
  reviewedAt?: Date | null;
  decisionAt?: Date | null;
  expiresAt?: Date | null;
  followUpDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

interface ApplicationCreationAttributes
  extends Optional<
    ApplicationAttributes,
    'applicationId' | 'status' | 'priority' | 'stage' | 'createdAt' | 'updatedAt' | 'deletedAt'
  > {}

class Application
  extends Model<ApplicationAttributes, ApplicationCreationAttributes>
  implements ApplicationAttributes
{
  public applicationId!: string;
  public userId!: string;
  public petId!: string;
  public rescueId!: string;
  public status!: ApplicationStatus;
  public priority!: ApplicationPriority;

  // Stage-based workflow fields
  public stage!: ApplicationStage;
  public finalOutcome!: ApplicationOutcome | null;
  public reviewStartedAt!: Date | null;
  public visitScheduledAt!: Date | null;
  public visitCompletedAt!: Date | null;
  public resolvedAt!: Date | null;
  public withdrawalReason!: string | null;
  public rejectionReason!: string | null;

  // Action tracking
  public actionedBy!: string | null;
  public actionedAt!: Date | null;
  public answers!: JsonObject;
  // references moved to application_references (plan 2.1).
  public documents!: Array<{
    documentId: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: Date;
    verified: boolean;
  }>;
  public interviewNotes!: string | null;
  public homeVisitNotes!: string | null;
  public score!: number | null;
  public tags!: string[] | null;
  public notes!: string | null;
  public submittedAt!: Date | null;
  public reviewedAt!: Date | null;
  public decisionAt!: Date | null;
  public expiresAt!: Date | null;
  public followUpDate!: Date | null;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;

  // Workflow management methods for small charities
  public canTransitionTo(newStatus: ApplicationStatus): boolean {
    // Simple workflow: applications start SUBMITTED and can go to any final state
    const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
      [ApplicationStatus.SUBMITTED]: [
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.APPROVED]: [],
      [ApplicationStatus.REJECTED]: [],
      [ApplicationStatus.WITHDRAWN]: [],
    };

    return validTransitions[this.status]?.includes(newStatus) || false;
  }

  public isInProgress(): boolean {
    return ![
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
    ].includes(this.status);
  }

  public isPending(): boolean {
    return [ApplicationStatus.SUBMITTED].includes(this.status);
  }

  public requiresAction(): boolean {
    // Submitted applications need action from rescue staff
    return [ApplicationStatus.SUBMITTED].includes(this.status);
  }

  public getCompletionPercentage(): number {
    const statusWeights: Record<ApplicationStatus, number> = {
      [ApplicationStatus.SUBMITTED]: 25,
      [ApplicationStatus.APPROVED]: 100,
      [ApplicationStatus.REJECTED]: 100,
      [ApplicationStatus.WITHDRAWN]: 100,
    };

    return statusWeights[this.status] || 0;
  }

  isValidAnswers(value: JsonObject) {
    if (typeof value !== 'object' || value === null) {
      throw new Error('Answers must be a valid object');
    }
  }
}

Application.init(
  {
    applicationId: {
      type: getUuidType(),
      primaryKey: true,
      field: 'application_id',
      defaultValue: () => generateUuidV7(),
    },
    userId: {
      type: getUuidType(),
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
    },
    petId: {
      type: getUuidType(),
      allowNull: false,
      field: 'pet_id',
      references: {
        model: 'pets',
        key: 'pet_id',
      },
      onDelete: 'CASCADE',
    },
    rescueId: {
      type: getUuidType(),
      allowNull: false,
      field: 'rescue_id',
      references: {
        model: 'rescues',
        key: 'rescue_id',
      },
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ApplicationStatus)),
      allowNull: false,
      defaultValue: ApplicationStatus.SUBMITTED,
    },
    priority: {
      type: DataTypes.ENUM(...Object.values(ApplicationPriority)),
      allowNull: false,
      defaultValue: ApplicationPriority.NORMAL,
    },

    // Stage-based workflow tracking
    stage: {
      type: DataTypes.ENUM(...Object.values(ApplicationStage)),
      allowNull: false,
      defaultValue: ApplicationStage.PENDING,
    },
    finalOutcome: {
      type: DataTypes.ENUM(...Object.values(ApplicationOutcome)),
      allowNull: true,
      field: 'final_outcome',
    },
    reviewStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'review_started_at',
    },
    visitScheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'visit_scheduled_at',
    },
    visitCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'visit_completed_at',
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at',
    },
    withdrawalReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'withdrawal_reason',
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason',
      validate: {
        len: [10, 2000],
      },
    },

    // Action tracking
    actionedBy: {
      type: getUuidType(),
      allowNull: true,
      field: 'actioned_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'SET NULL',
    },
    actionedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'actioned_at',
    },
    answers: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: {},
      validate: {
        isValidAnswers: Application.prototype.isValidAnswers,
      },
    },
    // references moved to the application_references table (plan 2.1).
    documents: {
      type: getJsonType(),
      allowNull: false,
      validate: {
        isValidDocuments(
          value: Array<{
            document_id: string;
            document_type: string;
            file_name: string;
            file_url: string;
            uploaded_at: Date;
            verified: boolean;
          }>
        ) {
          if (!Array.isArray(value)) {
            throw new Error('Documents must be an array');
          }
          value.forEach(doc => {
            if (!doc.document_id || !doc.document_type || !doc.file_name || !doc.file_url) {
              throw new Error('Each document must have required fields');
            }
          });
        },
      },
    },
    interviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'interview_notes',
    },
    homeVisitNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'home_visit_notes',
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    tags: {
      type: getArrayType(DataTypes.STRING),
      allowNull: true,
      // Remove defaultValue for SQLite compatibility (TEXT type can't have array default)
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'submitted_at',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reviewed_at',
    },
    decisionAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'decision_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
    },
    followUpDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'follow_up_date',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
      defaultValue: DataTypes.NOW,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'applications',
    modelName: 'Application',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
        name: 'applications_user_id_idx',
      },
      {
        fields: ['pet_id'],
        name: 'applications_pet_id_idx',
      },
      {
        fields: ['rescue_id'],
        name: 'applications_rescue_id_idx',
      },
      {
        fields: ['actioned_by'],
        name: 'applications_actioned_by_idx',
      },
      {
        fields: ['status'],
        name: 'applications_status_idx',
      },
      {
        fields: ['priority'],
        name: 'applications_priority_idx',
      },
      {
        fields: ['created_at'],
        name: 'applications_created_at_idx',
      },
      {
        fields: ['submitted_at'],
        name: 'applications_submitted_at_idx',
      },
      {
        fields: ['expires_at'],
        name: 'applications_expires_at_idx',
      },
      {
        fields: ['follow_up_date'],
        name: 'applications_follow_up_idx',
      },
      {
        fields: ['user_id', 'pet_id'],
        unique: true,
        name: 'applications_user_pet_unique',
        where: {
          deleted_at: null,
          status: {
            [Op.not]: [ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN],
          },
        },
      },
      // Rescue dashboard's primary query: open applications for a rescue,
      // newest first (plan 4.4). Covering shape — status + rescue_id let
      // Postgres skip the heap for the filter, then created_at gives the
      // ORDER BY a presorted scan.
      {
        fields: ['rescue_id', 'status', { name: 'created_at', order: 'DESC' }],
        name: 'applications_rescue_status_created_idx',
      },
      { fields: ['deleted_at'], name: 'applications_deleted_at_idx' },
      ...auditIndexes('applications'),
    ],
    hooks: {
      beforeValidate: (application: Application) => {
        // Auto-set submittedAt when status changes to submitted
        if (application.status === ApplicationStatus.SUBMITTED && !application.submittedAt) {
          application.submittedAt = new Date();
        }

        // Auto-set decisionAt for final statuses
        if (
          [
            ApplicationStatus.APPROVED,
            ApplicationStatus.REJECTED,
            ApplicationStatus.WITHDRAWN,
          ].includes(application.status) &&
          !application.decisionAt
        ) {
          application.decisionAt = new Date();
        }
      },
      beforeSave: (application: Application) => {
        // Auto-set expiresAt for submitted applications (30 days)
        if (application.status === ApplicationStatus.SUBMITTED && !application.expiresAt) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          application.expiresAt = expiryDate;
        }
      },
    },
    scopes: {
      active: {
        where: {
          status: {
            [Op.not]: [ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN],
          },
        },
      },
      pending: {
        where: {
          status: [ApplicationStatus.SUBMITTED],
        },
      },
      requiresAction: {
        where: {
          status: [ApplicationStatus.SUBMITTED],
        },
      },
      expiringSoon: {
        where: {
          expiresAt: {
            [Op.between]: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)],
          },
          status: {
            [Op.not]: [
              ApplicationStatus.APPROVED,
              ApplicationStatus.REJECTED,
              ApplicationStatus.WITHDRAWN,
            ],
          },
        },
      },
    },
  })
);

export default Application;
