import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { JsonObject } from '../types/common';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_USER = 'waiting_for_user',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  ESCALATED = 'escalated',
}

export enum TicketPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical',
}

export enum TicketCategory {
  TECHNICAL_ISSUE = 'technical_issue',
  ACCOUNT_PROBLEM = 'account_problem',
  ADOPTION_INQUIRY = 'adoption_inquiry',
  PAYMENT_ISSUE = 'payment_issue',
  FEATURE_REQUEST = 'feature_request',
  REPORT_BUG = 'report_bug',
  GENERAL_QUESTION = 'general_question',
  COMPLIANCE_CONCERN = 'compliance_concern',
  DATA_REQUEST = 'data_request',
  OTHER = 'other',
}

interface SupportTicketAttributes {
  ticketId: string;
  userId?: string;
  userEmail: string;
  userName?: string;
  assignedTo?: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  subject: string;
  description: string;
  tags?: string[];
  attachments: Array<{
    filename: string;
    url: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
  }>;
  metadata?: JsonObject;
  firstResponseAt?: Date;
  lastResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  escalatedAt?: Date;
  escalatedTo?: string;
  escalationReason?: string;
  satisfactionRating?: number;
  satisfactionFeedback?: string;
  internalNotes?: string;
  dueDate?: Date;
  estimatedResolutionTime?: number; // in hours
  actualResolutionTime?: number; // in hours
  createdAt: Date;
  updatedAt: Date;
}

interface SupportTicketCreationAttributes
  extends Optional<
    SupportTicketAttributes,
    'ticketId' | 'attachments' | 'createdAt' | 'updatedAt'
  > {}

class SupportTicket
  extends Model<SupportTicketAttributes, SupportTicketCreationAttributes>
  implements SupportTicketAttributes
{
  public ticketId!: string;
  public userId?: string;
  public userEmail!: string;
  public userName?: string;
  public assignedTo?: string;
  public status!: TicketStatus;
  public priority!: TicketPriority;
  public category!: TicketCategory;
  public subject!: string;
  public description!: string;
  public tags?: string[];
  public attachments!: Array<{
    filename: string;
    url: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
  }>;
  public metadata?: JsonObject;
  public firstResponseAt?: Date;
  public lastResponseAt?: Date;
  public resolvedAt?: Date;
  public closedAt?: Date;
  public escalatedAt?: Date;
  public escalatedTo?: string;
  public escalationReason?: string;
  public satisfactionRating?: number;
  public satisfactionFeedback?: string;
  public internalNotes?: string;
  public dueDate?: Date;
  public estimatedResolutionTime?: number;
  public actualResolutionTime?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations (defined in models/index.ts)
  public responses?: Array<import('./SupportTicketResponse').default>;
  public Responses?: Array<import('./SupportTicketResponse').default>;

  // Instance methods
  public isOpen(): boolean {
    return [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_USER].includes(
      this.status
    );
  }

  public isClosed(): boolean {
    return [TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(this.status);
  }

  public isOverdue(): boolean {
    return this.dueDate ? new Date() > this.dueDate && this.isOpen() : false;
  }

  public canBeResolved(): boolean {
    return this.isOpen() && this.status !== TicketStatus.WAITING_FOR_USER;
  }

  public getAge(): number {
    const now = new Date();
    const created = new Date(this.createdAt);
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60)); // Age in hours
  }
}

SupportTicket.init(
  {
    ticketId: {
      type: DataTypes.STRING,
      primaryKey: true,
      field: 'ticket_id',
      defaultValue: () => `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    userEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'user_email',
      validate: {
        isEmail: true,
      },
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'user_name',
    },
    assignedTo: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'assigned_to',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TicketStatus)),
      allowNull: false,
      defaultValue: TicketStatus.OPEN,
    },
    priority: {
      type: DataTypes.ENUM(...Object.values(TicketPriority)),
      allowNull: false,
      defaultValue: TicketPriority.NORMAL,
    },
    category: {
      type: DataTypes.ENUM(...Object.values(TicketCategory)),
      allowNull: false,
    },
    subject: {
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
        len: [10, 10000],
      },
    },
    tags: {
      type: getArrayType(DataTypes.STRING),
      allowNull: false,
    },
    attachments: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: [],
    },
    metadata: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: {},
    },
    firstResponseAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'first_response_at',
    },
    lastResponseAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_response_at',
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at',
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'closed_at',
    },
    escalatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'escalated_at',
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
    escalationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'escalation_reason',
    },
    satisfactionRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'satisfaction_rating',
      validate: {
        min: 1,
        max: 5,
      },
    },
    satisfactionFeedback: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'satisfaction_feedback',
    },
    internalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'internal_notes',
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'due_date',
    },
    estimatedResolutionTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'estimated_resolution_time',
      validate: {
        min: 1,
      },
    },
    actualResolutionTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'actual_resolution_time',
      validate: {
        min: 1,
      },
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
  },
  {
    sequelize,
    tableName: 'support_tickets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['user_email'],
      },
      {
        fields: ['assigned_to'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['priority'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['due_date'],
      },
      {
        fields: ['tags'],
        using: 'gin',
      },
    ],
  }
);

export default SupportTicket;
