import { Response } from 'express';
import { validationResult } from 'express-validator';
import { NotificationService } from '../services/notification.service';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

export class NotificationController {
  /**
   * Get user notifications with pagination and filtering
   */
  getUserNotifications = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const {
        page = 1,
        limit = 20,
        status,
        type,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = req.query;

      const options = {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        status: status as 'unread' | 'read',
        type: type as string,
        sortBy: (sortBy === 'readAt'
          ? 'read_at'
          : sortBy === 'createdAt'
            ? 'created_at'
            : sortBy) as 'created_at' | 'read_at',
        sortOrder: sortOrder as 'ASC' | 'DESC',
      };

      const result = await NotificationService.getUserNotifications(req.user!.userId, options);

      res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get user notifications failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notifications',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get notification by ID
   */
  getNotificationById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { notificationId } = req.params;

      const notification = await NotificationService.getNotificationById(
        notificationId,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      logger.error('Get notification by ID failed:', error);
      const statusCode =
        error instanceof Error && error.message === 'Notification not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to retrieve notification',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Create new notification (admin/system only)
   */
  createNotification = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const notificationData = {
        userId: req.body.userId,
        type: req.body.type,
        title: req.body.title,
        message: req.body.message,
        data: req.body.data,
        priority: req.body.priority || 'medium',
        category: req.body.category || 'general',
        channels: req.body.channels || ['in_app'],
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      };

      const notification = await NotificationService.createNotification(notificationData);

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: notification,
      });
    } catch (error) {
      logger.error('Create notification failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'User not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create notification',
        error: errorMessage,
      });
    }
  };

  /**
   * Mark notification as read
   */
  markNotificationAsRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { notificationId } = req.params;

      await NotificationService.markAsRead(notificationId, req.user!.userId);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      logger.error('Mark notification as read failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Notification not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      if (errorMessage.includes('already marked as read')) {
        return res.status(409).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: errorMessage,
      });
    }
  };

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await NotificationService.markAllAsRead(req.user!.userId);

      res.status(200).json({
        success: true,
        message: `Marked ${result.affectedCount} notifications as read`,
        data: result,
      });
    } catch (error) {
      logger.error('Mark all notifications as read failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Delete notification
   */
  deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { notificationId } = req.params;

      await NotificationService.deleteNotification(notificationId, req.user!.userId);

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      logger.error('Delete notification failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Notification not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: errorMessage,
      });
    }
  };

  /**
   * Get unread notification count
   */
  getUnreadCount = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await NotificationService.getUnreadCount(req.user!.userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Get unread count failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread notification count',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get user notification preferences
   */
  getNotificationPreferences = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const preferences = await NotificationService.getNotificationPreferences(req.user!.userId);

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      logger.error('Get notification preferences failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'User not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notification preferences',
        error: errorMessage,
      });
    }
  };

  /**
   * Update user notification preferences
   */
  updateNotificationPreferences = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const preferences = req.body;

      const updatedPreferences = await NotificationService.updateNotificationPreferences(
        req.user!.userId,
        preferences
      );

      res.status(200).json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: updatedPreferences,
      });
    } catch (error) {
      logger.error('Update notification preferences failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'User not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences',
        error: errorMessage,
      });
    }
  };

  /**
   * Create bulk notifications (admin only)
   */
  createBulkNotifications = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { userIds, ...notificationData } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'userIds must be a non-empty array',
        });
      }

      const result = await NotificationService.createBulkNotifications(
        userIds,
        notificationData,
        req.user!.userId
      );

      res.status(201).json({
        success: true,
        message: `Created ${result.count} notifications successfully`,
        data: result,
      });
    } catch (error) {
      logger.error('Create bulk notifications failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create bulk notifications',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Clean up expired notifications (admin only)
   */
  cleanupExpiredNotifications = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await NotificationService.cleanupExpiredNotifications();

      res.status(200).json({
        success: true,
        message: `Cleaned up ${result} expired notifications`,
        data: result,
      });
    } catch (error) {
      logger.error('Cleanup expired notifications failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup expired notifications',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
