import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();
const notificationController = new NotificationController();

// Validation middleware
const validateNotificationId = param('notificationId')
  .isUUID()
  .withMessage('Invalid notification ID format');

const validateCreateNotification = [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be 1-1000 characters'),
  body('type')
    .isIn(['application_update', 'message', 'system', 'adoption', 'reminder', 'marketing'])
    .withMessage('Invalid notification type'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  body('data').optional().isObject().withMessage('Data must be an object'),
  body('channels').isArray().withMessage('Channels must be an array'),
  body('channels.*')
    .isIn(['in_app', 'email', 'push', 'sms'])
    .withMessage('Invalid notification channel'),
  body('scheduledFor')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be valid ISO8601 format'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be valid ISO8601 format'),
];

const validateBulkNotification = [
  body('userIds').isArray({ min: 1 }).withMessage('User IDs must be a non-empty array'),
  body('userIds.*').isUUID().withMessage('Each user ID must be valid UUID'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be 1-1000 characters'),
  body('type')
    .isIn(['application_update', 'message', 'system', 'adoption', 'reminder', 'marketing'])
    .withMessage('Invalid notification type'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  body('data').optional().isObject().withMessage('Data must be an object'),
  body('channels').isArray().withMessage('Channels must be an array'),
  body('channels.*')
    .isIn(['in_app', 'email', 'push', 'sms'])
    .withMessage('Invalid notification channel'),
];

const validateNotificationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status').optional().isIn(['unread', 'read']).withMessage('Status must be unread or read'),
  query('type')
    .optional()
    .isIn(['application_update', 'message', 'system', 'adoption', 'reminder', 'marketing'])
    .withMessage('Invalid notification type'),
  query('sortBy').optional().isIn(['createdAt', 'readAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC'),
];

const validatePreferences = [
  body('email').optional().isBoolean().withMessage('Email preference must be boolean'),
  body('push').optional().isBoolean().withMessage('Push preference must be boolean'),
  body('sms').optional().isBoolean().withMessage('SMS preference must be boolean'),
  body('applications')
    .optional()
    .isBoolean()
    .withMessage('Applications preference must be boolean'),
  body('messages').optional().isBoolean().withMessage('Messages preference must be boolean'),
  body('system').optional().isBoolean().withMessage('System preference must be boolean'),
  body('marketing').optional().isBoolean().withMessage('Marketing preference must be boolean'),
  body('reminders').optional().isBoolean().withMessage('Reminders preference must be boolean'),
  body('quietHoursStart')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Quiet hours start must be in HH:MM format'),
  body('quietHoursEnd')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Quiet hours end must be in HH:MM format'),
  body('timezone')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Timezone must be 1-50 characters'),
];

// All routes require authentication
router.use(authenticateToken);

// User notification routes

/**
 * @swagger
 * /api/v1/:
 *   get:
 *     tags: [Notifications]
 *     summary: GET /api/v1/
 *     description: Handle GET request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/', validateNotificationQuery, notificationController.getUserNotifications);

/**
 * @swagger
 * /api/v1/unread/count:
 *   get:
 *     tags: [Notifications]
 *     summary: GET /api/v1/unread/count
 *     description: Handle GET request for /api/v1/unread/count
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/unread/count successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/unread/count', notificationController.getUnreadCount);

/**
 * @swagger
 * /api/v1/preferences:
 *   get:
 *     tags: [Notifications]
 *     summary: GET /api/v1/preferences
 *     description: Handle GET request for /api/v1/preferences
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/preferences successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/preferences', notificationController.getNotificationPreferences);
router.put(
  '/preferences',
  validatePreferences,
  notificationController.updateNotificationPreferences
);

/**
 * @swagger
 * /api/v1/read-all:
 *   post:
 *     tags: [Notifications]
 *     summary: POST /api/v1/read-all
 *     description: Handle POST request for /api/v1/read-all
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/read-all successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/read-all successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/read-all', notificationController.markAllNotificationsAsRead);


/**
 * @swagger
 * /api/v1/{notificationId}:
 *   get:
 *     tags: [Notifications]
 *     summary: GET /api/v1/{notificationId}
 *     description: Handle GET request for /api/v1/{notificationId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{notificationId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:notificationId', validateNotificationId, notificationController.getNotificationById);
router.patch(
  '/:notificationId/read',
  validateNotificationId,
  notificationController.markNotificationAsRead
);
router.delete(
  '/:notificationId',
  validateNotificationId,
  notificationController.deleteNotification
);

// Admin/System routes for creating notifications
router.post(
  '/',
  validateCreateNotification,
  requirePermission('NOTIFICATION_MANAGEMENT'),
  notificationController.createNotification
);

router.post(
  '/bulk',
  validateBulkNotification,
  requirePermission('ADMIN_NOTIFICATION_MANAGEMENT'),
  notificationController.createBulkNotifications
);

router.post(
  '/cleanup',
  requirePermission('ADMIN_NOTIFICATION_MANAGEMENT'),
  notificationController.cleanupExpiredNotifications
);

export default router;
