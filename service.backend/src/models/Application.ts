import { DataTypes, Model, Op, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { JsonObject } from '../types/common';

// Application status enum for workflow management
export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  PENDING_REFERENCES = 'pending_references',
  REFERENCE_CHECK = 'reference_check',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  HOME_VISIT_SCHEDULED = 'home_visit_scheduled',
  HOME_VISIT_COMPLETED = 'home_visit_completed',
  APPROVED = 'approved',
  CONDITIONALLY_APPROVED = 'conditionally_approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  EXPIRED = 'expired',
}

// Application priority enum
export enum ApplicationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

interface ApplicationAttributes {
  application_id: string;
  user_id: string;
  pet_id: string;
  rescue_id: string;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  actioned_by?: string | null;
  actioned_at?: Date | null;
  rejection_reason?: string | null;
  conditional_requirements?: string[] | null;
  answers: JsonObject;
  references: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    contacted_at?: Date;
    status: 'pending' | 'contacted' | 'verified' | 'failed';
    notes?: string;
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
    'application_id' | 'status' | 'priority' | 'created_at' | 'updated_at' | 'deleted_at'
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
  public actioned_by!: string | null;
  public actioned_at!: Date | null;
  public rejection_reason!: string | null;
  public conditional_requirements!: string[] | null;
  public answers!: JsonObject;
  public references!: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    contacted_at?: Date;
    status: 'pending' | 'contacted' | 'verified' | 'failed';
    notes?: string;
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

  // Instance methods for workflow management
  public canTransitionTo(newStatus: ApplicationStatus): boolean {
    const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
      [ApplicationStatus.DRAFT]: [ApplicationStatus.SUBMITTED, ApplicationStatus.WITHDRAWN],
      [ApplicationStatus.SUBMITTED]: [
        ApplicationStatus.UNDER_REVIEW,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.UNDER_REVIEW]: [
        ApplicationStatus.PENDING_REFERENCES,
        ApplicationStatus.INTERVIEW_SCHEDULED,
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.PENDING_REFERENCES]: [
        ApplicationStatus.REFERENCE_CHECK,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.REFERENCE_CHECK]: [
        ApplicationStatus.INTERVIEW_SCHEDULED,
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.INTERVIEW_SCHEDULED]: [
        ApplicationStatus.INTERVIEW_COMPLETED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.INTERVIEW_COMPLETED]: [
        ApplicationStatus.HOME_VISIT_SCHEDULED,
        ApplicationStatus.APPROVED,
        ApplicationStatus.CONDITIONALLY_APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.HOME_VISIT_SCHEDULED]: [
        ApplicationStatus.HOME_VISIT_COMPLETED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.HOME_VISIT_COMPLETED]: [
        ApplicationStatus.APPROVED,
        ApplicationStatus.CONDITIONALLY_APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.CONDITIONALLY_APPROVED]: [
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.APPROVED]: [],
      [ApplicationStatus.REJECTED]: [],
      [ApplicationStatus.WITHDRAWN]: [],
      [ApplicationStatus.EXPIRED]: [],
    };

    return validTransitions[this.status]?.includes(newStatus) || false;
  }

  public isInProgress(): boolean {
    return ![
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
      ApplicationStatus.EXPIRED,
    ].includes(this.status);
  }

  public isPending(): boolean {
    return [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.PENDING_REFERENCES,
      ApplicationStatus.REFERENCE_CHECK,
    ].includes(this.status);
  }

  public requiresAction(): boolean {
    return [
      ApplicationStatus.INTERVIEW_SCHEDULED,
      ApplicationStatus.HOME_VISIT_SCHEDULED,
      ApplicationStatus.CONDITIONALLY_APPROVED,
    ].includes(this.status);
  }

  public getCompletionPercentage(): number {
    const statusWeights: Record<ApplicationStatus, number> = {
      [ApplicationStatus.DRAFT]: 10,
      [ApplicationStatus.SUBMITTED]: 20,
      [ApplicationStatus.UNDER_REVIEW]: 30,
      [ApplicationStatus.PENDING_REFERENCES]: 40,
      [ApplicationStatus.REFERENCE_CHECK]: 50,
      [ApplicationStatus.INTERVIEW_SCHEDULED]: 60,
      [ApplicationStatus.INTERVIEW_COMPLETED]: 70,
      [ApplicationStatus.HOME_VISIT_SCHEDULED]: 80,
      [ApplicationStatus.HOME_VISIT_COMPLETED]: 90,
      [ApplicationStatus.CONDITIONALLY_APPROVED]: 95,
      [ApplicationStatus.APPROVED]: 100,
      [ApplicationStatus.REJECTED]: 100,
      [ApplicationStatus.WITHDRAWN]: 100,
      [ApplicationStatus.EXPIRED]: 100,
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
      defaultValue: sequelize.literal(`'application_' || left(md5(random()::text), 12)`),
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
      type: DataTypes.STRING,
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
      defaultValue: ApplicationStatus.DRAFT,
    },
    priority: {
      type: DataTypes.ENUM(...Object.values(ApplicationPriority)),
      allowNull: false,
      defaultValue: ApplicationPriority.NORMAL,
    },
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
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [10, 2000],
      },
    },
    conditional_requirements: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    answers: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      validate: {
        isValidAnswers: Application.prototype.isValidAnswers,
      },
    },
    references: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidReferences(value: any[]) {
          if (!Array.isArray(value)) {
            throw new Error('References must be an array');
          }
          value.forEach(ref => {
            if (!ref.name || !ref.relationship || !ref.phone) {
              throw new Error('Each reference must have name, relationship, and phone');
            }
          });
        },
      },
    },
    documents: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidDocuments(value: any[]) {
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
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
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
            [Op.not]: [
              ApplicationStatus.REJECTED,
              ApplicationStatus.WITHDRAWN,
              ApplicationStatus.EXPIRED,
            ],
          },
        },
      },
    ],
    hooks: {
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
            [Op.not]: [
              ApplicationStatus.REJECTED,
              ApplicationStatus.WITHDRAWN,
              ApplicationStatus.EXPIRED,
            ],
          },
        },
      },
      pending: {
        where: {
          status: [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.UNDER_REVIEW,
            ApplicationStatus.PENDING_REFERENCES,
            ApplicationStatus.REFERENCE_CHECK,
          ],
        },
      },
      requiresAction: {
        where: {
          status: [
            ApplicationStatus.INTERVIEW_SCHEDULED,
            ApplicationStatus.HOME_VISIT_SCHEDULED,
            ApplicationStatus.CONDITIONALLY_APPROVED,
          ],
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
              ApplicationStatus.EXPIRED,
            ],
          },
        },
      },
    },
  }
);

export default Application;
