import { ApiService } from '@adopt-dont-shop/lib-api';
import {
  NotificationsServiceConfig,
  Notification,
  NotificationRequest,
  BulkNotificationRequest,
  BulkNotificationResponse,
  NotificationPreferences,
  NotificationTemplate,
  NotificationStats,
  NotificationFilters,
  PaginatedResponse,
  BaseResponse,
} from '../types';

/**
 * NotificationsService - Handles notification operations
 * Production-ready service for multi-channel notification delivery
 */
export class NotificationsService {
  private config: NotificationsServiceConfig;
  private apiService: ApiService;

  constructor(config: Partial<NotificationsServiceConfig> = {}, apiService?: ApiService) {
    this.config = {
      debug: false,
      ...config,
    };

    this.apiService = apiService || new ApiService();

    if (this.config.debug) {
      console.log(`${NotificationsService.name} initialized with config:`, this.config);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): NotificationsServiceConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  public updateConfig(updates: Partial<NotificationsServiceConfig>): void {
    this.config = { ...this.config, ...updates };

    if (this.config.debug) {
      console.log(`${NotificationsService.name} config updated:`, this.config);
    }
  }

  // ===== NOTIFICATION DELIVERY =====

  /**
   * Send a single notification
   */
  public async sendNotification(
    notification: NotificationRequest
  ): Promise<BaseResponse<Notification>> {
    try {
      const response = await this.apiService.post<BaseResponse<Notification>>(
        '/api/v1/notifications',
        notification
      );

      if (this.config.debug) {
        console.log(`${NotificationsService.name} notification sent to user:`, notification.userId);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} sendNotification failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Send notifications to multiple users
   */
  public async sendBulkNotifications(
    notification: BulkNotificationRequest
  ): Promise<BaseResponse<BulkNotificationResponse>> {
    try {
      const response = await this.apiService.post<BaseResponse<BulkNotificationResponse>>(
        '/api/v1/notifications/bulk',
        notification
      );

      if (this.config.debug) {
        console.log(
          `${NotificationsService.name} bulk notification sent to ${notification.userIds.length} users`
        );
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} sendBulkNotifications failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Schedule a notification for future delivery
   */
  public async scheduleNotification(
    notification: NotificationRequest,
    scheduledFor: Date
  ): Promise<BaseResponse<Notification>> {
    try {
      const scheduledNotification = {
        ...notification,
        scheduledFor,
      };

      const response = await this.apiService.post<BaseResponse<Notification>>(
        '/api/v1/notifications/schedule',
        scheduledNotification
      );

      if (this.config.debug) {
        console.log(`${NotificationsService.name} notification scheduled for:`, scheduledFor);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} scheduleNotification failed:`, error);
      }
      throw error;
    }
  }

  // ===== NOTIFICATION MANAGEMENT =====

  /**
   * Get user notifications with pagination and filtering
   */
  public async getUserNotifications(
    userId: string,
    filters?: NotificationFilters
  ): Promise<PaginatedResponse<Notification>> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
      }

      const queryString = params.toString();
      const url = `/api/v1/notifications/user/${userId}${queryString ? `?${queryString}` : ''}`;

      const response = await this.apiService.get<PaginatedResponse<Notification>>(url);

      if (this.config.debug) {
        console.log(`${NotificationsService.name} retrieved notifications for user:`, userId);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} getUserNotifications failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Get a specific notification by ID
   */
  public async getNotification(notificationId: string): Promise<BaseResponse<Notification>> {
    try {
      const response = await this.apiService.get<BaseResponse<Notification>>(
        `/api/v1/notifications/${notificationId}`
      );

      if (this.config.debug) {
        console.log(`${NotificationsService.name} retrieved notification:`, notificationId);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} getNotification failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Mark notifications as read
   */
  public async markAsRead(notificationIds: string[]): Promise<BaseResponse<{ updated: number }>> {
    try {
      const response = await this.apiService.patch<BaseResponse<{ updated: number }>>(
        '/api/v1/notifications/mark-read',
        {
          notificationIds,
        }
      );

      if (this.config.debug) {
        console.log(
          `${NotificationsService.name} marked ${notificationIds.length} notifications as read`
        );
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} markAsRead failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  public async markAllAsRead(userId: string): Promise<BaseResponse<{ updated: number }>> {
    try {
      const response = await this.apiService.patch<BaseResponse<{ updated: number }>>(
        `/api/v1/notifications/user/${userId}/mark-all-read`
      );

      if (this.config.debug) {
        console.log(
          `${NotificationsService.name} marked all notifications as read for user:`,
          userId
        );
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} markAllAsRead failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  public async deleteNotification(
    notificationId: string
  ): Promise<BaseResponse<{ deleted: boolean }>> {
    try {
      const response = await this.apiService.delete<BaseResponse<{ deleted: boolean }>>(
        `/api/v1/notifications/${notificationId}`
      );

      if (this.config.debug) {
        console.log(`${NotificationsService.name} deleted notification:`, notificationId);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} deleteNotification failed:`, error);
      }
      throw error;
    }
  }

  // ===== PREFERENCE MANAGEMENT =====

  /**
   * Get user notification preferences
   */
  public async getUserPreferences(userId: string): Promise<BaseResponse<NotificationPreferences>> {
    try {
      const response = await this.apiService.get<BaseResponse<NotificationPreferences>>(
        `/api/v1/notifications/preferences/${userId}`
      );

      if (this.config.debug) {
        console.log(`${NotificationsService.name} retrieved preferences for user:`, userId);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} getUserPreferences failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  public async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<BaseResponse<NotificationPreferences>> {
    try {
      const response = await this.apiService.patch<BaseResponse<NotificationPreferences>>(
        `/api/v1/notifications/preferences/${userId}`,
        preferences
      );

      if (this.config.debug) {
        console.log(`${NotificationsService.name} updated preferences for user:`, userId);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} updatePreferences failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Set do not disturb period
   */
  public async setDoNotDisturb(
    userId: string,
    startTime: string,
    endTime: string
  ): Promise<BaseResponse<NotificationPreferences>> {
    try {
      const response = await this.apiService.patch<BaseResponse<NotificationPreferences>>(
        `/api/v1/notifications/preferences/${userId}/dnd`,
        {
          doNotDisturb: {
            enabled: true,
            startTime,
            endTime,
          },
        }
      );

      if (this.config.debug) {
        console.log(
          `${NotificationsService.name} set DND for user ${userId}: ${startTime} - ${endTime}`
        );
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} setDoNotDisturb failed:`, error);
      }
      throw error;
    }
  }

  // ===== TEMPLATE OPERATIONS =====

  /**
   * Get all notification templates
   */
  public async getTemplates(): Promise<BaseResponse<NotificationTemplate[]>> {
    try {
      const response = await this.apiService.get<BaseResponse<NotificationTemplate[]>>(
        '/api/v1/notifications/templates'
      );

      if (this.config.debug) {
        console.log(`${NotificationsService.name} retrieved notification templates`);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} getTemplates failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Process a template with variables
   */
  public async processTemplate(
    templateId: string,
    variables: Record<string, unknown>
  ): Promise<BaseResponse<{ title: string; message: string }>> {
    try {
      const response = await this.apiService.post<BaseResponse<{ title: string; message: string }>>(
        `/api/v1/notifications/templates/${templateId}/process`,
        {
          variables,
        }
      );

      if (this.config.debug) {
        console.log(`${NotificationsService.name} processed template:`, templateId);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} processTemplate failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Preview a template with sample data
   */
  public async previewTemplate(
    templateId: string,
    sampleData: Record<string, unknown>
  ): Promise<BaseResponse<{ title: string; message: string; html?: string }>> {
    try {
      const response = await this.apiService.post<
        BaseResponse<{ title: string; message: string; html?: string }>
      >(`/api/v1/notifications/templates/${templateId}/preview`, {
        sampleData,
      });

      if (this.config.debug) {
        console.log(`${NotificationsService.name} previewed template:`, templateId);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} previewTemplate failed:`, error);
      }
      throw error;
    }
  }

  // ===== ANALYTICS & STATS =====

  /**
   * Get notification statistics
   */
  public async getStats(userId?: string): Promise<BaseResponse<NotificationStats>> {
    try {
      const url = userId
        ? `/api/v1/notifications/stats?userId=${userId}`
        : '/api/v1/notifications/stats';

      const response = await this.apiService.get<BaseResponse<NotificationStats>>(url);

      if (this.config.debug) {
        console.log(`${NotificationsService.name} retrieved notification stats`);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} getStats failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  public async getUnreadCount(userId: string): Promise<BaseResponse<{ count: number }>> {
    try {
      const response = await this.apiService.get<BaseResponse<{ count: number }>>(
        `/api/v1/notifications/user/${userId}/unread-count`
      );

      if (this.config.debug) {
        console.log(`${NotificationsService.name} retrieved unread count for user:`, userId);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} getUnreadCount failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.apiService.get('/api/v1/health');
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${NotificationsService.name} health check failed:`, error);
      }
      return false;
    }
  }
}

