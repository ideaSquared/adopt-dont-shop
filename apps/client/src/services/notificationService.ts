import { api } from '@/services';

export type NotificationPreferences = {
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
};

class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
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
}

export default NotificationService.getInstance();
