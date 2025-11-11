import { DataTypes, Model, Op, Optional } from 'sequelize';
import sequelize, { getJsonType } from '../sequelize';
import { JsonObject } from '../types/common';

// Notification type enum
export enum NotificationType {
  APPLICATION_STATUS = 'application_status',
  MESSAGE_RECEIVED = 'message_received',
  PET_AVAILABLE = 'pet_available',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  HOME_VISIT_SCHEDULED = 'home_visit_scheduled',
  ADOPTION_APPROVED = 'adoption_approved',
  ADOPTION_REJECTED = 'adoption_rejected',
  REFERENCE_REQUEST = 'reference_request',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  ACCOUNT_SECURITY = 'account_security',
  REMINDER = 'reminder',
  MARKETING = 'marketing',
  RESCUE_INVITATION = 'rescue_invitation',
  STAFF_ASSIGNMENT = 'staff_assignment',
  PET_UPDATE = 'pet_update',
  FOLLOW_UP = 'follow_up',
}

// Notification channel enum
export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
}

// Notification priority enum
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Notification status enum
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

interface NotificationAttributes {
  notification_id: string;
  user_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  data?: JsonObject;
  template_id?: string | null;
  template_variables?: JsonObject;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  scheduled_for?: Date | null;
  sent_at?: Date | null;
  delivered_at?: Date | null;
  read_at?: Date | null;
  clicked_at?: Date | null;
  expires_at?: Date | null;
  retry_count: number;
  max_retries: number;
  error_message?: string | null;
  external_id?: string | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface NotificationCreationAttributes
  extends Optional<
    NotificationAttributes,
    | 'notification_id'
    | 'status'
    | 'priority'
    | 'retry_count'
    | 'max_retries'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at'
  > {}

class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  public notification_id!: string;
  public user_id!: string;
  public type!: NotificationType;
  public channel!: NotificationChannel;
  public priority!: NotificationPriority;
  public status!: NotificationStatus;
  public title!: string;
  public message!: string;
  public data!: JsonObject;
  public template_id!: string | null;
  public template_variables!: JsonObject;
  public related_entity_type!: string | null;
  public related_entity_id!: string | null;
  public scheduled_for!: Date | null;
  public sent_at!: Date | null;
  public delivered_at!: Date | null;
  public read_at!: Date | null;
  public clicked_at!: Date | null;
  public expires_at!: Date | null;
  public retry_count!: number;
  public max_retries!: number;
  public error_message!: string | null;
  public external_id!: string | null;
  public created_at!: Date;
  public updated_at!: Date;
  public deleted_at!: Date | null;

  // Instance methods
  public isExpired(): boolean {
    return this.expires_at ? new Date() > this.expires_at : false;
  }

  public canRetry(): boolean {
    return (
      this.status === NotificationStatus.FAILED &&
      this.retry_count < this.max_retries &&
      !this.isExpired()
    );
  }

  public markAsRead(): void {
    if (!this.read_at) {
      this.read_at = new Date();
      this.status = NotificationStatus.READ;
    }
  }

  public markAsClicked(): void {
    if (!this.clicked_at) {
      this.clicked_at = new Date();
      if (!this.read_at) {
        this.read_at = new Date();
      }
      this.status = NotificationStatus.READ;
    }
  }

  public shouldSend(): boolean {
    if (this.isExpired()) {
      return false;
    }
    if (this.scheduled_for && new Date() < this.scheduled_for) {
      return false;
    }
    return [NotificationStatus.PENDING, NotificationStatus.FAILED].includes(this.status);
  }

  public incrementRetry(errorMessage?: string): void {
    this.retry_count += 1;
    this.error_message = errorMessage || null;
    this.status = this.canRetry() ? NotificationStatus.PENDING : NotificationStatus.FAILED;
  }
}

Notification.init(
  {
    notification_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(`'notification_' || left(md5(random()::text), 12)`),
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
    type: {
      type: DataTypes.ENUM(...Object.values(NotificationType)),
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM(...Object.values(NotificationChannel)),
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM(...Object.values(NotificationPriority)),
      allowNull: false,
      defaultValue: NotificationPriority.NORMAL,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(NotificationStatus)),
      allowNull: false,
      defaultValue: NotificationStatus.PENDING,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 5000],
      },
    },
    data: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: {},
    },
    template_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    template_variables: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: {},
    },
    related_entity_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [
          [
            'application',
            'pet',
            'message',
            'user',
            'rescue',
            'conversation',
            'interview',
            'home_visit',
            'reminder',
            'announcement',
            'adoption',
            'event',
            'reference',
            'security',
          ],
        ],
      },
    },
    related_entity_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    scheduled_for: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    clicked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10,
      },
    },
    max_retries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 0,
        max: 10,
      },
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    external_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'External service ID for tracking delivery status',
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
    tableName: 'notifications',
    modelName: 'Notification',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      {
        fields: ['user_id'],
        name: 'notifications_user_id_idx',
      },
      {
        fields: ['type'],
        name: 'notifications_type_idx',
      },
      {
        fields: ['channel'],
        name: 'notifications_channel_idx',
      },
      {
        fields: ['status'],
        name: 'notifications_status_idx',
      },
      {
        fields: ['priority'],
        name: 'notifications_priority_idx',
      },
      {
        fields: ['scheduled_for'],
        name: 'notifications_scheduled_for_idx',
      },
      {
        fields: ['created_at'],
        name: 'notifications_created_at_idx',
      },
      {
        fields: ['expires_at'],
        name: 'notifications_expires_at_idx',
      },
      {
        fields: ['user_id', 'read_at'],
        name: 'notifications_user_read_idx',
      },
      {
        fields: ['related_entity_type', 'related_entity_id'],
        name: 'notifications_related_entity_idx',
      },
      {
        fields: ['external_id'],
        name: 'notifications_external_id_idx',
        where: {
          external_id: { [Op.ne]: null },
        },
      },
    ],
    hooks: {
      beforeValidate: (notification: Notification) => {
        // Auto-set expires_at based on priority if not set
        if (!notification.expires_at) {
          const now = new Date();
          const expiryHours = {
            [NotificationPriority.URGENT]: 1,
            [NotificationPriority.HIGH]: 24,
            [NotificationPriority.NORMAL]: 168, // 7 days
            [NotificationPriority.LOW]: 720, // 30 days
          };
          const hours = expiryHours[notification.priority];
          notification.expires_at = new Date(now.getTime() + hours * 60 * 60 * 1000);
        }
      },
      beforeSave: (notification: Notification) => {
        // Auto-update timestamps based on status changes
        if (notification.changed('status')) {
          const now = new Date();
          switch (notification.status) {
            case NotificationStatus.SENT:
              if (!notification.sent_at) {
                notification.sent_at = now;
              }
              break;
            case NotificationStatus.DELIVERED:
              if (!notification.delivered_at) {
                notification.delivered_at = now;
              }
              break;
            case NotificationStatus.READ:
              if (!notification.read_at) {
                notification.read_at = now;
              }
              break;
          }
        }
      },
    },
    scopes: {
      unread: {
        where: {
          read_at: null,
          status: {
            [Op.not]: [NotificationStatus.FAILED, NotificationStatus.CANCELLED],
          },
        },
      },
      pending: {
        where: {
          status: NotificationStatus.PENDING,
          expires_at: { [Op.gt]: new Date() },
        },
      },
      failed: {
        where: {
          status: NotificationStatus.FAILED,
        },
      },
      retryable: {
        where: {
          status: NotificationStatus.FAILED,
          retry_count: { [Op.lt]: sequelize.col('max_retries') },
          expires_at: { [Op.gt]: new Date() },
        },
      },
      expired: {
        where: {
          expires_at: { [Op.lte]: new Date() },
          status: {
            [Op.not]: [NotificationStatus.READ, NotificationStatus.CANCELLED],
          },
        },
      },
      urgent: {
        where: {
          priority: NotificationPriority.URGENT,
        },
      },
      byType: (type: NotificationType) => ({
        where: { type },
      }),
      byChannel: (channel: NotificationChannel) => ({
        where: { channel },
      }),
    },
  }
);

export default Notification;
