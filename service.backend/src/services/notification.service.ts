import { Op, Order, WhereOptions } from 'sequelize';
import DeviceToken from '../models/DeviceToken';
import Notification, {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from '../models/Notification';
import User from '../models/User';
import { JsonObject, WhereClause } from '../types/common';
import logger, { loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';
import { NotificationChannelService } from './notificationChannelService';

export interface NotificationSearchOptions {
  page?: number;
  limit?: number;
  status?: 'unread' | 'read';
  type?: string;
  sortBy?: 'created_at' | 'read_at';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  channel?: NotificationChannel;
  title: string;
  message: string;
  data?: JsonObject;
  priority?: NotificationPriority;
  scheduledFor?: Date;
  expiresAt?: Date;
}

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

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class NotificationService {
  /**
   * Get user notifications with pagination and filtering
   */
  static async getUserNotifications(
    userId: string,
    options: NotificationSearchOptions = {}
  ): Promise<NotificationResponse> {
    const startTime = Date.now();

    try {
      const {
        page = 1,
        limit = 20,
        status,
        type,
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = options;

      const offset = (page - 1) * limit;
      const whereClause: WhereClause = { user_id: userId };

      // Filter by read status
      if (status === 'read') {
        whereClause.read_at = { [Op.ne]: undefined };
      } else if (status === 'unread') {
        whereClause.read_at = null;
      }

      // Filter by notification type
      if (type) {
        whereClause.type = type;
      }

      // Only show active (non-expired) notifications
      const whereWithOr: WhereOptions = {
        ...whereClause,
        [Op.or]: [{ expires_at: { [Op.is]: null } }, { expires_at: { [Op.gt]: new Date() } }],
      };

      const orderClause = [[sortBy, sortOrder]];

      const { count, rows: notifications } = await Notification.findAndCountAll({
        where: whereWithOr,
        order: orderClause as Order,
        limit,
        offset,
      });

      loggerHelpers.logPerformance('User Notifications', {
        duration: Date.now() - startTime,
        userId,
        resultCount: notifications.length,
        total: count,
        page,
        limit,
        status,
        type,
        sortBy,
        sortOrder,
      });

      return {
        notifications: notifications.map(notification => notification.toJSON()),
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting user notifications:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      throw new Error('Failed to retrieve notifications');
    }
  }

  /**
   * Get notification by ID
   */
  static async getNotificationById(
    notificationId: string,
    userId?: string
  ): Promise<Notification | null> {
    const startTime = Date.now();

    try {
      const whereClause: WhereClause = { notification_id: notificationId };

      if (userId) {
        whereClause.user_id = userId;
      }

      const notification = await Notification.findOne({
        where: whereClause,
      });

      loggerHelpers.logDatabase('READ', {
        notificationId,
        duration: Date.now() - startTime,
        found: !!notification,
      });

      return notification;
    } catch (error) {
      logger.error('Error getting notification by ID:', {
        error: error instanceof Error ? error.message : String(error),
        notificationId,
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Create a new notification
   */
  static async createNotification(data: CreateNotificationRequest): Promise<Notification> {
    const startTime = Date.now();

    try {
      const notification = await Notification.create({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        priority: data.priority ?? NotificationPriority.NORMAL,
        channel: data.channel ?? NotificationChannel.IN_APP,
        created_at: new Date(),
      });

      // Log the action
      await AuditLogService.log({
        userId: data.userId,
        action: 'NOTIFICATION_CREATED',
        entity: 'Notification',
        entityId: notification.notification_id,
        details: {
          type: data.type,
          notificationId: notification.notification_id,
        },
      });

      loggerHelpers.logBusiness('Notification Created', {
        notificationId: notification.notification_id,
        type: data.type,
        userId: data.userId,
        duration: Date.now() - startTime,
      });

      // Attempt to deliver through appropriate channels based on user preferences
      const channels = await NotificationChannelService.getDeliveryChannels(
        data.userId,
        data.type,
        data.priority
      );

      if (channels.length > 0) {
        this.deliverThroughChannels(notification, channels).catch((error: Error) => {
          logger.error('Error delivering notification:', error);
        });
      } else if (data.channel) {
        // Fallback to specified channel if no preferences found
        this.deliverNotification(notification, [data.channel]).catch(error => {
          logger.error('Error delivering notification:', error);
        });
      }

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', {
        error: error instanceof Error ? error.message : String(error),
        notificationData: JSON.parse(JSON.stringify(data)),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const [affectedRows] = await Notification.update(
        { read_at: new Date() },
        {
          where: {
            notification_id: notificationId,
            user_id: userId,
          },
        }
      );

      if (affectedRows === 0) {
        throw new Error('Notification not found or access denied');
      }

      // Log the action
      await AuditLogService.log({
        userId: userId,
        action: 'NOTIFICATION_READ',
        entity: 'Notification',
        entityId: notificationId,
        details: { notificationId },
      });

      loggerHelpers.logBusiness('Notification Marked as Read', {
        notificationId,
        userId,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logger.error('Error marking notification as read:', {
        error: error instanceof Error ? error.message : String(error),
        notificationId,
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    const startTime = Date.now();

    try {
      const [affectedRows] = await Notification.update(
        { read_at: new Date() },
        {
          where: {
            user_id: userId,
            read_at: null,
          },
        }
      );

      await AuditLogService.log({
        action: 'MARK_ALL_READ',
        entity: 'Notification',
        entityId: 'multiple',
        details: {
          userId,
          updatedCount: affectedRows,
        },
        userId,
      });

      loggerHelpers.logBusiness('All Notifications Marked as Read', {
        userId,
        updatedCount: affectedRows,
        duration: Date.now() - startTime,
      });

      return { affectedCount: affectedRows };
    } catch (error) {
      logger.error('Error marking all notifications as read:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const [affectedRows] = await Notification.update(
        { deleted_at: new Date() },
        {
          where: {
            notification_id: notificationId,
            user_id: userId,
          },
        }
      );

      if (affectedRows === 0) {
        throw new Error('Notification not found or access denied');
      }

      // Log the action
      await AuditLogService.log({
        userId: userId,
        action: 'NOTIFICATION_DELETED',
        entity: 'Notification',
        entityId: notificationId,
        details: { notificationId },
      });

      loggerHelpers.logBusiness('Notification Deleted', {
        notificationId,
        userId,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logger.error('Error deleting notification:', {
        error: error instanceof Error ? error.message : String(error),
        notificationId,
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get unread notifications count
   */
  static async getUnreadCount(userId: string) {
    const startTime = Date.now();

    try {
      const count = await Notification.count({
        where: {
          user_id: userId,
          read_at: null,
          deleted_at: null,
          [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
        },
      });

      loggerHelpers.logDatabase('READ', {
        userId,
        duration: Date.now() - startTime,
        unreadCount: count,
      });

      return { count };
    } catch (error) {
      logger.error('Error getting unread count:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  static async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const startTime = Date.now();

    try {
      const user = await User.findByPk(userId, {
        attributes: ['notificationPreferences'],
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Return default preferences if none set
      const defaultPreferences: NotificationPreferences = {
        email: true,
        push: true,
        sms: false,
        applications: true,
        messages: true,
        system: true,
        marketing: false,
        reminders: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'UTC',
      };

      loggerHelpers.logDatabase('READ', {
        userId,
        duration: Date.now() - startTime,
        found: !!user.notificationPreferences,
      });

      return { ...defaultPreferences, ...(user.notificationPreferences || {}) };
    } catch (error) {
      logger.error('Error getting notification preferences:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      if (error instanceof Error && error.message === 'User not found') {
        throw error;
      }
      throw new Error('Failed to retrieve notification preferences');
    }
  }

  /**
   * Update user notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ) {
    const startTime = Date.now();

    const transaction = await User.sequelize!.transaction();

    try {
      const user = await User.findByPk(userId, { transaction });

      if (!user) {
        throw new Error('User not found');
      }

      const currentPreferences = user.notificationPreferences || {};
      const updatedPreferences = { ...currentPreferences, ...preferences };

      await user.update({ notificationPreferences: updatedPreferences }, { transaction });

      // Log the action
      await AuditLogService.log({
        userId,
        action: 'UPDATE_NOTIFICATION_PREFERENCES',
        entity: 'NotificationPreferences',
        entityId: userId,
        details: {
          updatedPreferences: preferences,
        },
      });

      loggerHelpers.logBusiness(
        'Notification Preferences Updated',
        {
          userId,
          updatedFields: Object.keys(preferences),
          duration: Date.now() - startTime,
        },
        userId
      );

      await transaction.commit();

      logger.info(`Updated notification preferences for user: ${userId}`);
      return updatedPreferences;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating notification preferences:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        duration: Date.now() - startTime,
      });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update notification preferences');
    }
  }

  /**
   * Create bulk notifications
   */
  static async createBulkNotifications(
    userIds: string[],
    notificationData: Omit<CreateNotificationRequest, 'userId'>,
    createdBy: string
  ) {
    const startTime = Date.now();

    try {
      const notifications = await Promise.all(
        userIds.map(userId =>
          Notification.create({
            user_id: userId,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            data: notificationData.data,
            priority: notificationData.priority || NotificationPriority.NORMAL,
            channel: notificationData.channel || NotificationChannel.IN_APP,
            created_at: new Date(),
          })
        )
      );

      // Log the bulk creation
      await AuditLogService.log({
        userId: createdBy,
        action: 'BULK_NOTIFICATIONS_CREATED',
        entity: 'Notification',
        entityId: 'bulk',
        details: { userIds, count: notifications.length },
      });

      loggerHelpers.logBusiness('Bulk Notifications Created', {
        count: notifications.length,
        types: [...new Set(notifications.map(n => n.type))],
        duration: Date.now() - startTime,
      });

      // Deliver notifications
      for (const notification of notifications) {
        await this.deliverNotification(notification, [notification.channel]);
      }

      return { notifications, count: notifications.length };
    } catch (error) {
      logger.error('Error creating bulk notifications:', {
        error: error instanceof Error ? error.message : String(error),
        count: userIds.length,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Deliver notification through specified channels
   */
  private static async deliverNotification(
    notification: Notification,
    channels: ('in_app' | 'email' | 'push' | 'sms')[]
  ) {
    const startTime = Date.now();

    try {
      logger.info(
        `Delivering notification ${notification.notification_id} via channels: ${channels.join(', ')}`
      );

      const deliveryPromises = channels.map(async channel => {
        try {
          switch (channel) {
            case 'email':
              await this.sendEmailNotification(notification);
              break;
            case 'push':
              await this.sendPushNotification(notification);
              break;
            case 'sms':
              await this.sendSMSNotification(notification);
              break;
            case 'in_app':
              // Already handled by database storage
              break;
          }
        } catch (channelError) {
          logger.error(`Failed to deliver notification via ${channel}:`, channelError);
          // Don't throw - allow other channels to continue
        }
      });

      await Promise.allSettled(deliveryPromises);

      loggerHelpers.logExternalService('Notification Delivery', 'Completed', {
        notificationId: notification.notification_id,
        userId: notification.user_id,
        channels: channels.length,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logger.error('Error delivering notification:', {
        error: error instanceof Error ? error.message : String(error),
        notificationId: notification.notification_id,
        userId: notification.user_id,
        duration: Date.now() - startTime,
      });
      // Don't throw error as notification is already created
    }
  }

  /**
   * Deliver notification through multiple channels using the channel service
   */
  private static async deliverThroughChannels(
    notification: Notification,
    channels: ('email' | 'push' | 'sms')[]
  ): Promise<void> {
    try {
      const results = await NotificationChannelService.deliverToChannels(
        {
          userId: notification.user_id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          data: notification.data as Record<string, string | number | boolean | null>,
          priority: notification.priority as 'low' | 'normal' | 'high' | 'urgent',
        },
        channels
      );

      // Log delivery results
      results.forEach(result => {
        if (result.success) {
          logger.info(`Notification delivered via ${result.channel}`, {
            notificationId: notification.notification_id,
            channel: result.channel,
            deliveryId: result.deliveryId,
          });
        } else {
          logger.error(`Failed to deliver notification via ${result.channel}`, {
            notificationId: notification.notification_id,
            channel: result.channel,
            error: result.error,
          });
        }
      });
    } catch (error) {
      logger.error('Error in deliverThroughChannels:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(notification: Notification): Promise<void> {
    const startTime = Date.now();

    try {
      const EmailService = (await import('./email.service')).default;

      await EmailService.sendEmail({
        toEmail: notification.user_id, // This would need to be resolved to email
        subject: notification.title,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            ${notification.data?.actionUrl ? `<a href="${notification.data.actionUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a>` : ''}
          </div>
        `,
        type: 'notification',
        userId: notification.user_id,
        templateData: {
          title: notification.title,
          message: notification.message,
          ...notification.data,
        },
      });

      loggerHelpers.logExternalService('Email Notification', 'Delivered', {
        notificationId: notification.notification_id,
        userId: notification.user_id,
        email: notification.user_id,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logger.error('Error sending email notification:', {
        error: error instanceof Error ? error.message : String(error),
        notificationId: notification.notification_id,
        userId: notification.user_id,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(notification: Notification): Promise<void> {
    const startTime = Date.now();

    try {
      // Get user's device tokens
      const deviceTokens = await DeviceToken.findAll({
        where: {
          user_id: notification.user_id,
          status: 'active',
        },
      });

      if (deviceTokens.length === 0) {
        logger.info(`No active device tokens found for user ${notification.user_id}`);
        return;
      }

      // Send to each device
      const pushPromises = deviceTokens.map(async deviceToken => {
        try {
          // This would integrate with FCM, APNS, or other push service
          const payload = {
            notification: {
              title: notification.title,
              body: notification.message,
              icon: '/icon-192x192.png',
              badge: '/badge-icon.png',
              data: notification.data,
            },
            token: deviceToken.device_token,
          };

          // Mock push notification sending
          loggerHelpers.logExternalService('Push Notification', 'Delivered', {
            notificationId: notification.notification_id,
            deviceToken: deviceToken.token_id,
            userId: notification.user_id,
            payload: payload.notification.title, // Include payload info in logs
          });

          // Update last used timestamp
          deviceToken.last_used_at = new Date();
          await deviceToken.save();
        } catch (deviceError) {
          logger.error(`Failed to send push to device ${deviceToken.token_id}:`, deviceError);

          // Mark token as invalid after failures
          deviceToken.markAsInvalid();
          await deviceToken.save();
        }
      });

      await Promise.allSettled(pushPromises);
      loggerHelpers.logExternalService('Push Notification', 'Completed', {
        notificationId: notification.notification_id,
        userId: notification.user_id,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logger.error('Error sending push notification:', {
        error: error instanceof Error ? error.message : String(error),
        notificationId: notification.notification_id,
        userId: notification.user_id,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  private static async sendSMSNotification(notification: Notification): Promise<void> {
    const startTime = Date.now();

    try {
      // Get user's phone number
      const user = await User.findByPk(notification.user_id, {
        attributes: ['phoneNumber'],
      });

      if (!user?.phoneNumber) {
        logger.info(`No phone number found for user ${notification.user_id}`);
        return;
      }

      // This would integrate with Twilio, AWS SNS, or other SMS service
      const smsMessage = `${notification.title}: ${notification.message}`;

      // Mock SMS sending
      loggerHelpers.logExternalService('SMS Notification', 'Delivered', {
        notificationId: notification.notification_id,
        userId: notification.user_id,
        phoneNumber: user.phoneNumber,
        message: smsMessage, // Include message content in logs
      });

      // In real implementation:
      // await smsService.send({
      //   to: user.phone_number,
      //   message: smsMessage
      // });
    } catch (error) {
      logger.error('Error sending SMS notification:', {
        error: error instanceof Error ? error.message : String(error),
        notificationId: notification.notification_id,
        userId: notification.user_id,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications(daysToKeep: number = 30): Promise<number> {
    const startTime = Date.now();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedCount = await Notification.destroy({
        where: {
          created_at: {
            [Op.lt]: cutoffDate,
          },
        },
      });

      loggerHelpers.logBusiness('Expired Notifications Cleaned Up', {
        deletedCount,
        daysToKeep,
        duration: Date.now() - startTime,
      });

      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up expired notifications:', {
        error: error instanceof Error ? error.message : String(error),
        daysToKeep,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }
}
