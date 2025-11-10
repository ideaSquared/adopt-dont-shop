import DeviceToken from '../models/DeviceToken';
import User from '../models/User';
import logger from '../utils/logger';
import emailService from './email.service';
import { NotificationPreferences } from './notification.service';

interface NotificationData {
  [key: string]: string | number | boolean | null;
}

export interface ChannelDeliveryResult {
  channel: 'email' | 'push' | 'sms';
  success: boolean;
  error?: string;
  deliveryId?: string;
}

export class NotificationChannelService {
  /**
   * Determine which channels to use based on user preferences and notification type
   */
  static async getDeliveryChannels(
    userId: string,
    notificationType: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<('email' | 'push' | 'sms')[]> {
    try {
      const user = await User.findByPk(userId, {
        attributes: ['notificationPreferences', 'phoneNumber'],
      });

      if (!user) {
        return [];
      }

      const preferences = (user.notificationPreferences ||
        {}) as unknown as NotificationPreferences;
      const channels: ('email' | 'push' | 'sms')[] = [];

      // Always include in-app notification (handled separately)

      // Email notifications
      if (preferences?.email && this.shouldSendToChannel('email', notificationType, preferences)) {
        channels.push('email');
      }

      // Push notifications
      if (preferences?.push && this.shouldSendToChannel('push', notificationType, preferences)) {
        const hasActiveDevices = await this.hasActiveDeviceTokens(userId);
        if (hasActiveDevices) {
          channels.push('push');
        }
      }

      // SMS notifications - only for urgent or high priority
      if (
        preferences?.sms &&
        user.phoneNumber &&
        (priority === 'urgent' || priority === 'high') &&
        this.shouldSendToChannel('sms', notificationType, preferences)
      ) {
        channels.push('sms');
      }

      return channels;
    } catch (error) {
      logger.error('Error determining delivery channels:', error);
      return ['email']; // Fallback to email only
    }
  }

  /**
   * Check if user has active device tokens for push notifications
   */
  private static async hasActiveDeviceTokens(userId: string): Promise<boolean> {
    try {
      const count = await DeviceToken.count({
        where: {
          user_id: userId,
          status: 'active',
        },
      });
      return count > 0;
    } catch (error) {
      logger.error('Error checking device tokens:', error);
      return false;
    }
  }

  /**
   * Determine if notification should be sent to specific channel based on type and preferences
   */
  private static shouldSendToChannel(
    channel: 'email' | 'push' | 'sms',
    notificationType: string,
    preferences: NotificationPreferences
  ): boolean {
    // System and security notifications always go through enabled channels
    if (notificationType.includes('system') || notificationType.includes('security')) {
      return true;
    }

    // Application updates
    if (notificationType.includes('application') && preferences.applications !== false) {
      return true;
    }

    // Messages
    if (notificationType.includes('message') && preferences.messages !== false) {
      return true;
    }

    // Marketing (opt-in only)
    if (notificationType.includes('marketing') && preferences.marketing === true) {
      return true;
    }

    // Reminders
    if (notificationType.includes('reminder') && preferences.reminders !== false) {
      return true;
    }

    return true; // Default to send if not explicitly disabled
  }

  /**
   * Check if user is in quiet hours
   */
  static isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const timezone = preferences.timezone || 'UTC';

    try {
      const currentTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
      });

      const { quietHoursStart, quietHoursEnd } = preferences;

      // Handle overnight quiet hours (e.g., 22:00 to 06:00)
      if (quietHoursStart > quietHoursEnd) {
        return currentTime >= quietHoursStart || currentTime <= quietHoursEnd;
      } else {
        return currentTime >= quietHoursStart && currentTime <= quietHoursEnd;
      }
    } catch (error) {
      logger.error('Error checking quiet hours:', error);
      return false;
    }
  }

  /**
   * Send notification through multiple channels
   */
  static async deliverToChannels(
    notification: {
      userId: string;
      title: string;
      message: string;
      type: string;
      data?: NotificationData;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    },
    channels: ('email' | 'push' | 'sms')[]
  ): Promise<ChannelDeliveryResult[]> {
    const results: ChannelDeliveryResult[] = [];
    const deliveryPromises = channels.map(channel => this.deliverToChannel(notification, channel));

    const channelResults = await Promise.allSettled(deliveryPromises);

    channelResults.forEach((result, index) => {
      const channel = channels[index];
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          channel,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        });
      }
    });

    return results;
  }

  /**
   * Send notification to a specific channel
   */
  private static async deliverToChannel(
    notification: {
      userId: string;
      title: string;
      message: string;
      type: string;
      data?: NotificationData;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    },
    channel: 'email' | 'push' | 'sms'
  ): Promise<ChannelDeliveryResult> {
    try {
      switch (channel) {
        case 'email':
          return await this.sendEmailNotification(notification);
        case 'push':
          return await this.sendPushNotification(notification);
        case 'sms':
          return await this.sendSMSNotification(notification);
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }
    } catch (error) {
      logger.error(`Error sending ${channel} notification:`, error);
      return {
        channel,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(notification: {
    userId: string;
    title: string;
    message: string;
    type: string;
    data?: NotificationData;
  }): Promise<ChannelDeliveryResult> {
    try {
      // Get user email address
      const user = await User.findByPk(notification.userId, {
        attributes: ['email', 'firstName', 'lastName'],
      });

      if (!user?.email) {
        return {
          channel: 'email',
          success: false,
          error: 'No email address available',
        };
      }

      const userName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || undefined;

      // Use existing email service
      const emailId = await emailService.sendEmail({
        toEmail: user.email,
        toName: userName,
        subject: notification.title,
        htmlContent: `<p>${notification.message}</p>`,
        textContent: notification.message,
        type: 'notification',
        userId: notification.userId,
        metadata: notification.data || {},
      });

      return {
        channel: 'email',
        success: true,
        deliveryId: emailId,
      };
    } catch (error) {
      return {
        channel: 'email',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(notification: {
    userId: string;
    title: string;
    message: string;
    data?: NotificationData;
  }): Promise<ChannelDeliveryResult> {
    try {
      const deviceTokens = await DeviceToken.findAll({
        where: {
          user_id: notification.userId,
          status: 'active',
        },
      });

      if (deviceTokens.length === 0) {
        return {
          channel: 'push',
          success: false,
          error: 'No active device tokens',
        };
      }

      // Mock push notification - in production, integrate with FCM/APNS
      await Promise.all(
        deviceTokens.map(async token => {
          // Simulate push notification sending
          logger.info('Mock push notification sent', {
            token: token.device_token.substring(0, 10) + '...',
            title: notification.title,
            message: notification.message,
          });
          return { success: true, token: token.device_token };
        })
      );

      return {
        channel: 'push',
        success: true,
        deliveryId: `push_${Date.now()}`,
      };
    } catch (error) {
      return {
        channel: 'push',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send push notification',
      };
    }
  }

  /**
   * Send SMS notification
   */
  private static async sendSMSNotification(notification: {
    userId: string;
    title: string;
    message: string;
  }): Promise<ChannelDeliveryResult> {
    try {
      const user = await User.findByPk(notification.userId, {
        attributes: ['phoneNumber'],
      });

      if (!user?.phoneNumber) {
        return {
          channel: 'sms',
          success: false,
          error: 'No phone number available',
        };
      }

      // Mock SMS sending - in production, integrate with Twilio/AWS SNS
      const smsContent = `${notification.title}: ${notification.message}`;

      logger.info('Mock SMS notification sent', {
        phone: user.phoneNumber,
        content: smsContent.substring(0, 50) + '...',
      });

      return {
        channel: 'sms',
        success: true,
        deliveryId: `sms_${Date.now()}`,
      };
    } catch (error) {
      return {
        channel: 'sms',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS',
      };
    }
  }
}
