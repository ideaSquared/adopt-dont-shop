import { Response } from 'express';
import { validationResult } from 'express-validator';
import { DEFAULT_PAGE_SIZE } from '../constants/pagination';
import { NotificationService } from '../services/notification.service';
import { RichTextProcessingService } from '../services/rich-text-processing.service';
import { AuthenticatedRequest } from '../types/auth';
import { parsePaginationLimit } from '../utils/pagination';

/**
 * Hard cap mirroring the route-level express-validator (max 100). Acts as
 * defense-in-depth so the service layer always receives a bounded `limit`
 * even if that validator is later removed or misconfigured.
 */
const NOTIFICATION_MAX_LIMIT = 100;

export class NotificationController {
  /**
   * Get user notifications with pagination and filtering
   */
  getUserNotifications = async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { page = 1, status, type, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

    const options = {
      page: parseInt(page as string) || 1,
      limit: parsePaginationLimit(req.query.limit as string | undefined, {
        default: DEFAULT_PAGE_SIZE,
        max: NOTIFICATION_MAX_LIMIT,
      }),
      status: status as 'unread' | 'read',
      type: type as string,
      sortBy: (sortBy === 'readAt' ? 'read_at' : sortBy === 'createdAt' ? 'created_at' : sortBy) as
        | 'created_at'
        | 'read_at',
      sortOrder: sortOrder as 'ASC' | 'DESC',
    };

    const result = await NotificationService.getUserNotifications(req.user!.userId, options);

    res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
    });
  };

  /**
   * Get notification by ID
   */
  getNotificationById = async (req: AuthenticatedRequest, res: Response) => {
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
  };

  /**
   * Create new notification (admin/system only)
   */
  createNotification = async (req: AuthenticatedRequest, res: Response) => {
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
      message:
        typeof req.body.message === 'string'
          ? RichTextProcessingService.sanitize(req.body.message)
          : req.body.message,
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
  };

  /**
   * Mark notification as read
   */
  markNotificationAsRead = async (req: AuthenticatedRequest, res: Response) => {
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
  };

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response) => {
    const result = await NotificationService.markAllAsRead(req.user!.userId);

    res.status(200).json({
      success: true,
      message: `Marked ${result.affectedCount} notifications as read`,
      data: result,
    });
  };

  /**
   * Delete notification
   */
  deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
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
  };

  /**
   * Get unread notification count
   */
  getUnreadCount = async (req: AuthenticatedRequest, res: Response) => {
    const result = await NotificationService.getUnreadCount(req.user!.userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  };

  /**
   * Get user notification preferences
   */
  getNotificationPreferences = async (req: AuthenticatedRequest, res: Response) => {
    const preferences = await NotificationService.getNotificationPreferences(req.user!.userId);

    res.status(200).json({
      success: true,
      data: preferences,
    });
  };

  /**
   * Update user notification preferences
   */
  updateNotificationPreferences = async (req: AuthenticatedRequest, res: Response) => {
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
  };

  /**
   * Create bulk notifications (admin only)
   */
  createBulkNotifications = async (req: AuthenticatedRequest, res: Response) => {
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

    if (typeof notificationData.message === 'string') {
      notificationData.message = RichTextProcessingService.sanitize(notificationData.message);
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
  };

  /**
   * Clean up expired notifications (admin only)
   */
  cleanupExpiredNotifications = async (req: AuthenticatedRequest, res: Response) => {
    const result = await NotificationService.cleanupExpiredNotifications();

    res.status(200).json({
      success: true,
      message: `Cleaned up ${result} expired notifications`,
      data: result,
    });
  };
}
