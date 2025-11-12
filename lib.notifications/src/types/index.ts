/**
 * Configuration options for NotificationsService
 */
export interface NotificationsServiceConfig {
  /**
   * API base URL
   */
  apiUrl?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Custom headers to include with requests
   */
  headers?: Record<string, string>;
}

/**
 * Options for NotificationsService operations
 */
export interface NotificationsServiceOptions {
  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Whether to use caching
   */
  useCache?: boolean;

  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Base response interface
 */
export interface BaseResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ===== NOTIFICATION TYPES =====

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Notification delivery channels
 */
export type NotificationChannel = 'in-app' | 'email' | 'push' | 'sms';

/**
 * Notification status
 */
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Notification category types
 */
export type NotificationCategory =
  | 'adoption_update'
  | 'message_received'
  | 'application_status'
  | 'system_alert'
  | 'reminder'
  | 'welcome'
  | 'security';

/**
 * Core notification interface
 */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  status: NotificationStatus;
  data?: Record<string, unknown>;
  actionUrl?: string;
  imageUrl?: string;
  createdAt: string;
  scheduledFor?: string;
  deliveredAt?: string;
  readAt?: string;
  expiresAt?: string;
}

/**
 * Notification creation request
 */
export interface NotificationRequest {
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  data?: Record<string, unknown>;
  actionUrl?: string;
  imageUrl?: string;
  scheduledFor?: Date;
  expiresAt?: Date;
  templateId?: string;
  templateVariables?: Record<string, unknown>;
}

/**
 * Bulk notification request
 */
export interface BulkNotificationRequest {
  userIds: string[];
  title: string;
  message: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  data?: Record<string, unknown>;
  actionUrl?: string;
  imageUrl?: string;
  scheduledFor?: Date;
  expiresAt?: Date;
  templateId?: string;
  templateVariables?: Record<string, unknown>;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  userId: string;
  channels: {
    [K in NotificationChannel]: {
      enabled: boolean;
      categories: NotificationCategory[];
      quietHours?: {
        startTime: string; // HH:mm format
        endTime: string; // HH:mm format
        timezone: string;
      };
    };
  };
  doNotDisturb?: {
    enabled: boolean;
    startTime?: string;
    endTime?: string;
  };
  updatedAt: string;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  category: NotificationCategory;
  title: string;
  message: string;
  variables: string[];
  channels: NotificationChannel[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification delivery result
 */
export interface NotificationDeliveryResult {
  notificationId: string;
  channel: NotificationChannel;
  status: 'success' | 'failed' | 'pending';
  deliveredAt?: string;
  error?: string;
  externalId?: string; // ID from external service (SendGrid, FCM, etc.)
}

/**
 * Batch notification response
 */
export interface BulkNotificationResponse {
  totalRequested: number;
  successful: number;
  failed: number;
  notifications: {
    id: string;
    userId: string;
    status: 'created' | 'failed';
    error?: string;
  }[];
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  deliveryRate: number;
  readRate: number;
  byCategory: Record<
    NotificationCategory,
    {
      sent: number;
      delivered: number;
      read: number;
    }
  >;
  byChannel: Record<
    NotificationChannel,
    {
      sent: number;
      delivered: number;
      failed: number;
    }
  >;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Notification query filters
 */
export interface NotificationFilters extends PaginationOptions {
  category?: NotificationCategory;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  unreadOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}
