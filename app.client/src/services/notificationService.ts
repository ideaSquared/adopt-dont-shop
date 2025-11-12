import { api } from '@/services';

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  applications: boolean;
  messages: boolean;
  system: boolean;
  marketing: boolean;
  reminders: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export interface Notification {
  notification_id: string;
  title: string;
  message: string;
  type: string; // Should match NotificationType from types/notifications.ts
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read_at?: string;
  created_at: string;
  data?: Record<string, unknown>;
  related_entity_type?: string;
  related_entity_id?: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// API response format from backend - flexible to handle different formats
interface ApiNotificationResponse {
  success?: boolean;
  data?: Notification[];
  notifications?: Notification[]; // Alternative format
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  status?: 'unread' | 'read';
  type?: string;
  sortBy?: 'created_at' | 'read_at';
  sortOrder?: 'ASC' | 'DESC';
}

class NotificationService {
  private static instance: NotificationService;
  private unreadCountCallbacks: ((count: number) => void)[] = [];
  private notificationCallbacks: ((notification: Notification) => void)[] = [];
  private pollingInterval: NodeJS.Timeout | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Get user notifications with filtering and pagination
   */
  async getNotifications(filters: NotificationFilters = {}): Promise<NotificationResponse> {
    try {
      const response = await api.get<ApiNotificationResponse>('/api/v1/notifications', filters);

      // Handle multiple possible response formats
      const notifications = response.data || response.notifications || [];
      const pagination = response.pagination || {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total: notifications.length,
        pages: Math.ceil(notifications.length / (filters.limit || 20)),
      };

      return {
        notifications,
        pagination,
      };
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await api.get<any>('/api/v1/notifications/unread/count');

      // Handle nested response structure: {"success":true,"data":{"count":15}}
      // The API wrapper might return different structures depending on configuration
      let count = 0;

      // Check if it's a nested structure with success/data
      if (response.data?.success && response.data?.data?.count !== undefined) {
        count = response.data.data.count;
      }
      // Check if it's already unwrapped to just the data part
      else if (response.data?.count !== undefined) {
        count = response.data.count;
      }
      // Check if the count is at the root level
      else if (response?.count !== undefined) {
        count = response.count;
      }

      // Notify subscribers
      this.unreadCountCallbacks.forEach(callback => callback(count));

      return count;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await api.patch(`/api/v1/notifications/${notificationId}/read`);
      // Refresh unread count and wait for it to complete
      await this.getUnreadCount();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await api.post('/api/v1/notifications/read-all');
      // Notify subscribers of count change
      this.unreadCountCallbacks.forEach(callback => callback(0));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await api.delete(`/api/v1/notifications/${notificationId}`);
      // Refresh unread count
      this.getUnreadCount();
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await api.get<any>('/api/v1/notifications/preferences');

      // Handle nested response structure like other methods
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      } else if (response.data) {
        return response.data;
      }

      // Fallback defaults
      return {
        email: true,
        push: false,
        sms: false,
        applications: true,
        messages: true,
        system: true,
        marketing: false,
        reminders: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      await api.put('/api/v1/notifications/preferences', preferences);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  /**
   * Subscribe to unread count changes
   */
  onUnreadCountChange(callback: (count: number) => void): () => void {
    this.unreadCountCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.unreadCountCallbacks.indexOf(callback);
      if (index > -1) {
        this.unreadCountCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to new notifications
   */
  onNewNotification(callback: (notification: Notification) => void): () => void {
    this.notificationCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.notificationCallbacks.indexOf(callback);
      if (index > -1) {
        this.notificationCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Simulate receiving a new notification (for real-time updates)
   */
  simulateNewNotification(notification: Notification): void {
    this.notificationCallbacks.forEach(callback => callback(notification));
    this.getUnreadCount(); // Refresh count
  }

  /**
   * Request push notification permission
   */
  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Show browser notification
   */
  showBrowserNotification(title: string, message: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        ...options,
      });
    }
  }

  /**
   * Register device for push notifications
   */
  async registerDeviceToken(token: string): Promise<void> {
    try {
      await api.post('/api/v1/device-tokens', { token });
    } catch (error) {
      console.error('Failed to register device token:', error);
      throw error;
    }
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken(token: string): Promise<void> {
    try {
      await api.delete(`/api/v1/device-tokens/${token}`);
    } catch (error) {
      console.error('Failed to unregister device token:', error);
      throw error;
    }
  }

  /**
   * Start periodic polling for notifications (fallback if websockets not available)
   */
  startPolling(intervalMs: number = 30000): () => void {
    // Clear any existing polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(() => {
      this.getUnreadCount();
    }, intervalMs);

    return () => {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    };
  }

  /**
   * Clear all notification state (call on logout)
   */
  clearState(): void {
    // Stop any active polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Reset unread count to 0 and notify all subscribers
    this.unreadCountCallbacks.forEach(callback => callback(0));

    // Clear all callbacks to prevent memory leaks and cross-user data
    this.unreadCountCallbacks = [];
    this.notificationCallbacks = [];

    // Note: We don't reset the singleton instance itself since it may be reused
    // when the same or different user logs in. The subscription system will
    // handle re-registering callbacks when new components mount.
  }

  /**
   * Initialize notifications for a newly authenticated user
   */
  async initializeForUser(): Promise<void> {
    try {
      // Fetch initial unread count
      await this.getUnreadCount();
    } catch (error) {
      console.error('Failed to initialize notifications for user:', error);
    }
  }
}

export default NotificationService.getInstance();
