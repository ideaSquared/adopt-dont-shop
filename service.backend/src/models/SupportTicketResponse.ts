import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

export enum ResponderType {
  STAFF = 'staff',
  USER = 'user',
}

export type Attachment = {
  filename: string;
  url: string;
  fileSize: number;
  mimeType: string;
  uploadedAt?: Date;
};

// Model attributes
export interface SupportTicketResponseAttributes {
  responseId: string;
  ticketId: string;
  responderId: string;
  responderType: ResponderType;
  content: string;
  attachments?: Attachment[];
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// Optional fields for creation
type SupportTicketResponseCreationAttributes = Optional<
  SupportTicketResponseAttributes,
  'responseId' | 'attachments' | 'isInternal' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

class SupportTicketResponse
  extends Model<SupportTicketResponseAttributes, SupportTicketResponseCreationAttributes>
  implements SupportTicketResponseAttributes
{
  declare responseId: string;
  declare ticketId: string;
  declare responderId: string;
  declare responderType: ResponderType;
  declare content: string;
  declare attachments?: Attachment[];
  declare isInternal: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date | null;

  // Instance methods
  public isFromStaff(): boolean {
    return this.responderType === ResponderType.STAFF;
  }

  public isFromUser(): boolean {
    return this.responderType === ResponderType.USER;
  }

  public hasAttachments(): boolean {
    return !!this.attachments && this.attachments.length > 0;
  }
}

SupportTicketResponse.init(
  {
    responseId: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
      field: 'response_id',
    },
    ticketId: {
      type: getUuidType(),
      allowNull: false,
      field: 'ticket_id',
      references: {
        model: 'support_tickets',
        key: 'ticket_id',
      },
      onDelete: 'CASCADE',
    },
    responderId: {
      type: getUuidType(),
      allowNull: false,
      field: 'responder_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'SET NULL',
    },
    responderType: {
      type: DataTypes.ENUM(...Object.values(ResponderType)),
      allowNull: false,
      field: 'responder_type',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 10000],
      },
    },
    attachments: {
      type: getJsonType(),
      allowNull: true,
    },
    isInternal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_internal',
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'support_ticket_responses',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    underscored: true,
    indexes: [
      {
        fields: ['ticket_id'],
      },
      {
        fields: ['responder_id'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['responder_type'],
      },
      {
        fields: ['is_internal'],
      },
      {
        // Composite index for common queries
        fields: ['ticket_id', 'created_at'],
      },
      { fields: ['deleted_at'], name: 'support_ticket_responses_deleted_at_idx' },
      ...auditIndexes('support_ticket_responses'),
    ],
  })
);

export default SupportTicketResponse;
