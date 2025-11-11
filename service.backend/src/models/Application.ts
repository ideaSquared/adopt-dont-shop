import { DataTypes, Model, Op, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { JsonObject } from '../types/common';

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
  application_id: string;
  user_id: string;
  pet_id: string;
  rescue_id: string;
  status: ApplicationStatus;
  priority: ApplicationPriority;

  // Stage-based workflow fields
  stage: ApplicationStage;
  final_outcome?: ApplicationOutcome | null;
  review_started_at?: Date | null;
  visit_scheduled_at?: Date | null;
  visit_completed_at?: Date | null;
  resolved_at?: Date | null;
  withdrawal_reason?: string | null;
  rejection_reason?: string | null;

  // Action tracking
  actioned_by?: string | null;
  actioned_at?: Date | null;
  answers: JsonObject;
  references: Array<{
    id: string;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    contacted_at?: Date;
    status: 'pending' | 'contacted' | 'verified' | 'failed';
    notes?: string;
    contacted_by?: string;
  }>;
  documents: Array<{
    document_id: string;
    document_type: string;
    file_name: string;
    file_url: string;
    uploaded_at: Date;
    verified: boolean;
  }>;
  interview_notes?: string | null;
  home_visit_notes?: string | null;
  score?: number | null;
  tags?: string[] | null;
  notes?: string | null;
  submitted_at?: Date | null;
  reviewed_at?: Date | null;
  decision_at?: Date | null;
  expires_at?: Date | null;
  follow_up_date?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface ApplicationCreationAttributes
  extends Optional<
    ApplicationAttributes,
    'application_id' | 'status' | 'priority' | 'stage' | 'created_at' | 'updated_at' | 'deleted_at'
  > {}

class Application
  extends Model<ApplicationAttributes, ApplicationCreationAttributes>
  implements ApplicationAttributes
{
  public application_id!: string;
  public user_id!: string;
  public pet_id!: string;
  public rescue_id!: string;
  public status!: ApplicationStatus;
  public priority!: ApplicationPriority;

  // Stage-based workflow fields
  public stage!: ApplicationStage;
  public final_outcome!: ApplicationOutcome | null;
  public review_started_at!: Date | null;
  public visit_scheduled_at!: Date | null;
  public visit_completed_at!: Date | null;
  public resolved_at!: Date | null;
  public withdrawal_reason!: string | null;
  public rejection_reason!: string | null;

  // Action tracking
  public actioned_by!: string | null;
  public actioned_at!: Date | null;
  public answers!: JsonObject;
  public references!: Array<{
    id: string;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    contacted_at?: Date;
    status: 'pending' | 'contacted' | 'verified' | 'failed';
    notes?: string;
    contacted_by?: string;
  }>;
  public documents!: Array<{
    document_id: string;
    document_type: string;
    file_name: string;
    file_url: string;
    uploaded_at: Date;
    verified: boolean;
  }>;
  public interview_notes!: string | null;
  public home_visit_notes!: string | null;
  public score!: number | null;
  public tags!: string[] | null;
  public notes!: string | null;
  public submitted_at!: Date | null;
  public reviewed_at!: Date | null;
  public decision_at!: Date | null;
  public expires_at!: Date | null;
  public follow_up_date!: Date | null;
  public created_at!: Date;
  public updated_at!: Date;
  public deleted_at!: Date | null;

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
    application_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      // Remove default value for SQLite compatibility
      // Application IDs will be generated in beforeCreate hook
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
    },
    pet_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'pets',
        key: 'pet_id',
      },
      onDelete: 'CASCADE',
    },
    rescue_id: {
      type: getUuidType(),
      allowNull: false,
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
    final_outcome: {
      type: DataTypes.ENUM(...Object.values(ApplicationOutcome)),
      allowNull: true,
    },
    review_started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    visit_scheduled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    visit_completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    withdrawal_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [10, 2000],
      },
    },

    // Action tracking
    actioned_by: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    actioned_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    answers: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: {},
      validate: {
        isValidAnswers: Application.prototype.isValidAnswers,
      },
    },
    references: {
      type: getJsonType(),
      allowNull: false,
      validate: {
        isValidReferences(
          value: Array<{
            id: string;
            name: string;
            relationship: string;
            phone: string;
            email?: string;
            contacted_at?: Date;
            status: 'pending' | 'contacted' | 'verified' | 'failed';
            notes?: string;
            contacted_by?: string;
          }>
        ) {
          if (!Array.isArray(value)) {
            throw new Error('References must be an array');
          }
          value.forEach(ref => {
            if (!ref.id || !ref.name || !ref.relationship || !ref.phone) {
              throw new Error('Each reference must have id, name, relationship, and phone');
            }
          });
        },
      },
    },
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
    interview_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    home_visit_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    decision_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    follow_up_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'applications',
    modelName: 'Application',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
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
    ],
    hooks: {
      beforeCreate: (application: Application) => {
        // Generate application ID if not provided
        if (!application.application_id) {
          const randomStr = Math.random().toString(36).substring(2, 14);
          application.application_id = `application_${randomStr}`;
        }
      },
      beforeValidate: (application: Application) => {
        // Auto-set submitted_at when status changes to submitted
        if (application.status === ApplicationStatus.SUBMITTED && !application.submitted_at) {
          application.submitted_at = new Date();
        }

        // Auto-set decision_at for final statuses
        if (
          [
            ApplicationStatus.APPROVED,
            ApplicationStatus.REJECTED,
            ApplicationStatus.WITHDRAWN,
          ].includes(application.status) &&
          !application.decision_at
        ) {
          application.decision_at = new Date();
        }
      },
      beforeSave: (application: Application) => {
        // Auto-set expires_at for submitted applications (30 days)
        if (application.status === ApplicationStatus.SUBMITTED && !application.expires_at) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          application.expires_at = expiryDate;
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
          expires_at: {
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
  }
);

export default Application;
