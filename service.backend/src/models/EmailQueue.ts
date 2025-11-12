import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { JsonObject } from '../types/common';

export enum EmailStatus {
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  UNSUBSCRIBED = 'unsubscribed',
}

export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum EmailType {
  TRANSACTIONAL = 'transactional',
  NOTIFICATION = 'notification',
  MARKETING = 'marketing',
  SYSTEM = 'system',
}

interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
  size: number;
  inline?: boolean;
  cid?: string; // Content-ID for inline images
}

interface EmailTracking {
  trackingId: string;
  opens: Array<{
    timestamp: Date;
    userAgent?: string;
    ipAddress?: string;
  }>;
  clicks: Array<{
    url: string;
    timestamp: Date;
    userAgent?: string;
    ipAddress?: string;
  }>;
  deliveredAt?: Date;
  bouncedAt?: Date;
  bounceReason?: string;
  unsubscribedAt?: Date;
}

interface EmailQueueAttributes {
  emailId: string;
  templateId?: string;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  toName?: string;
  ccEmails?: string[];
  bccEmails?: string[];
  replyToEmail?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateData?: JsonObject;
  attachments?: EmailAttachment[];
  type: EmailType;
  priority: EmailPriority;
  status: EmailStatus;
  scheduledFor?: Date;
  maxRetries: number;
  currentRetries: number;
  lastAttemptAt?: Date;
  sentAt?: Date;
  failureReason?: string;
  providerId?: string; // External email service ID
  providerMessageId?: string;
  tracking?: EmailTracking;
  metadata?: JsonObject;
  campaignId?: string;
  userId?: string;
  createdBy?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface EmailQueueCreationAttributes
  extends Optional<EmailQueueAttributes, 'emailId' | 'createdAt' | 'updatedAt'> {}

class EmailQueue
  extends Model<EmailQueueAttributes, EmailQueueCreationAttributes>
  implements EmailQueueAttributes
{
  public emailId!: string;
  public templateId?: string;
  public fromEmail!: string;
  public fromName?: string;
  public toEmail!: string;
  public toName?: string;
  public ccEmails?: string[];
  public bccEmails?: string[];
  public replyToEmail?: string;
  public subject!: string;
  public htmlContent!: string;
  public textContent?: string;
  public templateData?: JsonObject;
  public attachments?: EmailAttachment[];
  public type!: EmailType;
  public priority!: EmailPriority;
  public status!: EmailStatus;
  public scheduledFor?: Date;
  public maxRetries!: number;
  public currentRetries!: number;
  public lastAttemptAt?: Date;
  public sentAt?: Date;
  public failureReason?: string;
  public providerId?: string;
  public providerMessageId?: string;
  public tracking?: EmailTracking;
  public metadata?: JsonObject;
  public campaignId?: string;
  public userId?: string;
  public createdBy?: string;
  public tags?: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public isPending(): boolean {
    return this.status === EmailStatus.QUEUED;
  }

  public isSent(): boolean {
    return [
      EmailStatus.SENT,
      EmailStatus.DELIVERED,
      EmailStatus.OPENED,
      EmailStatus.CLICKED,
    ].includes(this.status);
  }

  public isFailed(): boolean {
    return [EmailStatus.FAILED, EmailStatus.BOUNCED].includes(this.status);
  }

  public canRetry(): boolean {
    return this.isFailed() && this.currentRetries < this.maxRetries;
  }

  public isScheduled(): boolean {
    return !!this.scheduledFor && this.scheduledFor > new Date();
  }

  public isReadyToSend(): boolean {
    return this.isPending() && (!this.scheduledFor || this.scheduledFor <= new Date());
  }

  public markAsSending(): void {
    this.status = EmailStatus.SENDING;
    this.lastAttemptAt = new Date();
  }

  public markAsSent(providerId?: string, providerMessageId?: string): void {
    this.status = EmailStatus.SENT;
    this.sentAt = new Date();
    if (providerId) {
      this.providerId = providerId;
    }
    if (providerMessageId) {
      this.providerMessageId = providerMessageId;
    }
  }

  public markAsFailed(reason: string): void {
    this.status = EmailStatus.FAILED;
    this.failureReason = reason;
    this.currentRetries += 1;
  }

  public markAsDelivered(): void {
    if (this.isSent()) {
      this.status = EmailStatus.DELIVERED;
      if (this.tracking) {
        this.tracking.deliveredAt = new Date();
      }
    }
  }

  public markAsBounced(reason?: string): void {
    this.status = EmailStatus.BOUNCED;
    if (this.tracking) {
      this.tracking.bouncedAt = new Date();
      this.tracking.bounceReason = reason;
    }
  }

  public recordOpen(userAgent?: string, ipAddress?: string): void {
    if (!this.tracking) {
      this.tracking = {
        trackingId: `track_${this.emailId}_${Date.now()}`,
        opens: [],
        clicks: [],
      };
    }

    this.tracking.opens.push({
      timestamp: new Date(),
      userAgent,
      ipAddress,
    });

    if (this.status === EmailStatus.SENT || this.status === EmailStatus.DELIVERED) {
      this.status = EmailStatus.OPENED;
    }
  }

  public recordClick(url: string, userAgent?: string, ipAddress?: string): void {
    if (!this.tracking) {
      this.tracking = {
        trackingId: `track_${this.emailId}_${Date.now()}`,
        opens: [],
        clicks: [],
      };
    }

    this.tracking.clicks.push({
      url,
      timestamp: new Date(),
      userAgent,
      ipAddress,
    });

    if ([EmailStatus.SENT, EmailStatus.DELIVERED, EmailStatus.OPENED].includes(this.status)) {
      this.status = EmailStatus.CLICKED;
    }
  }

  public getOpenCount(): number {
    return this.tracking?.opens?.length || 0;
  }

  public getClickCount(): number {
    return this.tracking?.clicks?.length || 0;
  }

  public getUniqueClickCount(): number {
    if (!this.tracking?.clicks) {
      return 0;
    }
    const uniqueUrls = new Set(this.tracking.clicks.map(click => click.url));
    return uniqueUrls.size;
  }

  public hasBeenOpened(): boolean {
    return this.getOpenCount() > 0;
  }

  public hasBeenClicked(): boolean {
    return this.getClickCount() > 0;
  }

  public getAge(): number {
    return Date.now() - new Date(this.createdAt).getTime();
  }

  public getAgeInHours(): number {
    return Math.floor(this.getAge() / (1000 * 60 * 60));
  }
}

EmailQueue.init(
  {
    emailId: {
      type: DataTypes.STRING,
      primaryKey: true,
      field: 'email_id',
      defaultValue: () => `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    templateId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'template_id',
      references: {
        model: 'email_templates',
        key: 'template_id',
      },
    },
    fromEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'from_email',
      validate: {
        isEmail: true,
      },
    },
    fromName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'from_name',
    },
    toEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'to_email',
      validate: {
        isEmail: true,
      },
    },
    toName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'to_name',
    },
    ccEmails: {
      type: getArrayType(DataTypes.STRING),
      allowNull: false,
      defaultValue: process.env.NODE_ENV === 'test' ? '[]' : [],
      field: 'cc_emails',
      get() {
        const rawValue = this.getDataValue('ccEmails');
        if (typeof rawValue === 'string') {
          try {
            return JSON.parse(rawValue);
          } catch {
            return [];
          }
        }
        return rawValue || [];
      },
      set(value: string[]) {
        if (process.env.NODE_ENV === 'test') {
          this.setDataValue('ccEmails', JSON.stringify(value || []) as unknown as string[]);
        } else {
          this.setDataValue('ccEmails', value || ([] as unknown as string[]));
        }
      },
    },
    bccEmails: {
      type: getArrayType(DataTypes.STRING),
      allowNull: false,
      defaultValue: process.env.NODE_ENV === 'test' ? '[]' : [],
      field: 'bcc_emails',
      get() {
        const rawValue = this.getDataValue('bccEmails');
        if (typeof rawValue === 'string') {
          try {
            return JSON.parse(rawValue);
          } catch {
            return [];
          }
        }
        return rawValue || [];
      },
      set(value: string[]) {
        if (process.env.NODE_ENV === 'test') {
          this.setDataValue('bccEmails', JSON.stringify(value || []) as unknown as string[]);
        } else {
          this.setDataValue('bccEmails', value || ([] as unknown as string[]));
        }
      },
    },
    replyToEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'reply_to_email',
      validate: {
        isEmail: true,
      },
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 500],
      },
    },
    htmlContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'html_content',
      validate: {
        notEmpty: true,
      },
    },
    textContent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'text_content',
    },
    templateData: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: {},
      field: 'template_data',
    },
    attachments: {
      type: getJsonType(),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(EmailType)),
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM(...Object.values(EmailPriority)),
      allowNull: false,
      defaultValue: EmailPriority.NORMAL,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(EmailStatus)),
      allowNull: false,
      defaultValue: EmailStatus.QUEUED,
    },
    scheduledFor: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'scheduled_for',
    },
    maxRetries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      field: 'max_retries',
      validate: {
        min: 0,
        max: 10,
      },
    },
    currentRetries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'current_retries',
      validate: {
        min: 0,
      },
    },
    lastAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_attempt_at',
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sent_at',
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'failure_reason',
    },
    providerId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'provider_id',
    },
    providerMessageId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'provider_message_id',
    },
    tracking: {
      type: getJsonType(),
      allowNull: true,
    },
    metadata: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: {},
    },
    campaignId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'campaign_id',
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
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    tags: {
      type: getArrayType(DataTypes.STRING),
      allowNull: false,
      defaultValue: process.env.NODE_ENV === 'test' ? '[]' : [],
      get() {
        const rawValue = this.getDataValue('tags');
        if (typeof rawValue === 'string') {
          try {
            return JSON.parse(rawValue);
          } catch {
            return [];
          }
        }
        return rawValue || [];
      },
      set(value: string[]) {
        if (process.env.NODE_ENV === 'test') {
          this.setDataValue('tags', JSON.stringify(value || []) as unknown as string[]);
        } else {
          this.setDataValue('tags', value || ([] as unknown as string[]));
        }
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
    tableName: 'email_queue',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['status'],
      },
      {
        fields: ['priority'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['to_email'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['template_id'],
      },
      {
        fields: ['campaign_id'],
      },
      {
        fields: ['scheduled_for'],
      },
      {
        fields: ['sent_at'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['tags'],
        using: 'gin',
      },
      {
        fields: ['status', 'priority', 'scheduled_for'],
        name: 'email_queue_processing_idx',
      },
    ],
  }
);

export default EmailQueue;
