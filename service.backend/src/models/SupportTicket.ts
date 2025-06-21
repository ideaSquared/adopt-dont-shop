import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { JsonObject } from '../types/common';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_CUSTOMER = 'waiting_for_customer',
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

interface TicketResponse {
  responseId: string;
  responderId: string;
  responderType: 'staff' | 'customer';
  content: string;
  attachments?: Array<{
    filename: string;
    url: string;
    fileSize: number;
    mimeType: string;
  }>;
  isInternal: boolean;
  createdAt: Date;
}

interface SupportTicketAttributes {
  ticketId: string;
  customerId?: string;
  customerEmail: string;
  customerName?: string;
  assignedTo?: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  subject: string;
  description: string;
  tags?: string[];
  responses: TicketResponse[];
  attachments?: Array<{
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
  extends Optional<SupportTicketAttributes, 'ticketId' | 'createdAt' | 'updatedAt'> {}

class SupportTicket
  extends Model<SupportTicketAttributes, SupportTicketCreationAttributes>
  implements SupportTicketAttributes
{
  public ticketId!: string;
  public customerId?: string;
  public customerEmail!: string;
  public customerName?: string;
  public assignedTo?: string;
  public status!: TicketStatus;
  public priority!: TicketPriority;
  public category!: TicketCategory;
  public subject!: string;
  public description!: string;
  public tags?: string[];
  public responses!: TicketResponse[];
  public attachments?: Array<{
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

  // Instance methods
  public isOpen(): boolean {
    return [
      TicketStatus.OPEN,
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_FOR_CUSTOMER,
    ].includes(this.status);
  }

  public isClosed(): boolean {
    return [TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(this.status);
  }

  public isOverdue(): boolean {
    return this.dueDate ? new Date() > this.dueDate && this.isOpen() : false;
  }

  public getResponseCount(): number {
    return this.responses ? this.responses.length : 0;
  }

  public getCustomerResponseCount(): number {
    return this.responses ? this.responses.filter(r => r.responderType === 'customer').length : 0;
  }

  public getStaffResponseCount(): number {
    return this.responses ? this.responses.filter(r => r.responderType === 'staff').length : 0;
  }

  public addResponse(response: Omit<TicketResponse, 'responseId' | 'createdAt'>): void {
    if (!this.responses) this.responses = [];

    const newResponse: TicketResponse = {
      ...response,
      responseId: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    this.responses.push(newResponse);
    this.lastResponseAt = new Date();

    if (!this.firstResponseAt && response.responderType === 'staff') {
      this.firstResponseAt = new Date();
    }
  }

  public canBeResolved(): boolean {
    return this.isOpen() && this.status !== TicketStatus.WAITING_FOR_CUSTOMER;
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
      defaultValue: () => `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    customerId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assignedTo: {
      type: DataTypes.STRING,
      allowNull: true,
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
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    responses: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    firstResponseAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastResponseAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    escalatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    escalatedTo: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    escalationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    satisfactionRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    satisfactionFeedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    internalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estimatedResolutionTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    actualResolutionTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
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
    tableName: 'support_tickets',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['customerId'],
      },
      {
        fields: ['customerEmail'],
      },
      {
        fields: ['assignedTo'],
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
        fields: ['createdAt'],
      },
      {
        fields: ['dueDate'],
      },
      {
        fields: ['tags'],
        using: 'gin',
      },
    ],
  }
);

export default SupportTicket;
