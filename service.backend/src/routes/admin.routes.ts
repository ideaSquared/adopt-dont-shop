import express from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { authLimiter, generalLimiter } from '../middleware/rate-limiter';
import { handleValidationErrors } from '../middleware/validation';
import { PERMISSIONS } from '../types/rbac';
import { adminValidation } from '../validation/admin.validation';

const router = express.Router();

// Apply authentication to all admin routes
router.use(authenticateToken);

// Platform metrics and dashboard

/**
 * @swagger
 * /api/v1/metrics:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/metrics
 *     description: Handle GET request for /api/v1/metrics
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/metrics successful
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

/**
 * @swagger
 * /api/v1/metrics:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/metrics
 *     description: Handle GET request for /api/v1/metrics
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/metrics successful
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

/**
 * @swagger
 * /api/v1/metrics:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/metrics
 *     description: Handle GET request for /api/v1/metrics
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/metrics successful
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

/**
 * @swagger
 * /api/v1/metrics:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/metrics
 *     description: Handle GET request for /api/v1/metrics
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/metrics successful
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
router.get(
  '/metrics',
  requirePermission(PERMISSIONS.ADMIN_METRICS_READ),
  generalLimiter,
  AdminController.getPlatformMetrics
);

/**
 * @swagger
 * /api/v1/analytics/usage:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/analytics/usage
 *     description: Handle GET request for /api/v1/analytics/usage
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/analytics/usage successful
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

/**
 * @swagger
 * /api/v1/analytics/usage:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/analytics/usage
 *     description: Handle GET request for /api/v1/analytics/usage
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/analytics/usage successful
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

/**
 * @swagger
 * /api/v1/analytics/usage:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/analytics/usage
 *     description: Handle GET request for /api/v1/analytics/usage
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/analytics/usage successful
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

/**
 * @swagger
 * /api/v1/analytics/usage:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/analytics/usage
 *     description: Handle GET request for /api/v1/analytics/usage
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/analytics/usage successful
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
router.get(
  '/analytics/usage',
  requirePermission(PERMISSIONS.ADMIN_ANALYTICS_READ),
  generalLimiter,
  AdminController.getUsageAnalytics
);

// System health and monitoring

/**
 * @swagger
 * /api/v1/system/health:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/system/health
 *     description: Handle GET request for /api/v1/system/health
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/system/health successful
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

/**
 * @swagger
 * /api/v1/system/health:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/system/health
 *     description: Handle GET request for /api/v1/system/health
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/system/health successful
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

/**
 * @swagger
 * /api/v1/system/health:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/system/health
 *     description: Handle GET request for /api/v1/system/health
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/system/health successful
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

/**
 * @swagger
 * /api/v1/system/health:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/system/health
 *     description: Handle GET request for /api/v1/system/health
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/system/health successful
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
router.get(
  '/system/health',
  requirePermission(PERMISSIONS.ADMIN_SYSTEM_HEALTH_READ),
  generalLimiter,
  AdminController.getSystemHealth
);

/**
 * @swagger
 * /api/v1/system/config:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/system/config
 *     description: Handle GET request for /api/v1/system/config
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/system/config successful
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

/**
 * @swagger
 * /api/v1/system/config:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/system/config
 *     description: Handle GET request for /api/v1/system/config
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/system/config successful
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

/**
 * @swagger
 * /api/v1/system/config:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/system/config
 *     description: Handle GET request for /api/v1/system/config
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/system/config successful
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

/**
 * @swagger
 * /api/v1/system/config:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/system/config
 *     description: Handle GET request for /api/v1/system/config
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/system/config successful
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
router.get(
  '/system/config',
  requirePermission(PERMISSIONS.ADMIN_CONFIG_READ),
  generalLimiter,
  AdminController.getConfiguration
);

/**
 * @swagger
 * /api/v1/system/config:
 *   patch:
 *     tags: [Admin Management]
 *     summary: PATCH /api/v1/system/config
 *     description: Handle PATCH request for /api/v1/system/config
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
 *       200:
 *         description: PATCH /api/v1/system/config successful
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
 *                   example: "PATCH /api/v1/system/config successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/system/config:
 *   patch:
 *     tags: [Admin Management]
 *     summary: PATCH /api/v1/system/config
 *     description: Handle PATCH request for /api/v1/system/config
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
 *       200:
 *         description: PATCH /api/v1/system/config successful
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
 *                   example: "PATCH /api/v1/system/config successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/system/config:
 *   patch:
 *     tags: [Admin Management]
 *     summary: PATCH /api/v1/system/config
 *     description: Handle PATCH request for /api/v1/system/config
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
 *       200:
 *         description: PATCH /api/v1/system/config successful
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
 *                   example: "PATCH /api/v1/system/config successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/system/config:
 *   patch:
 *     tags: [Admin Management]
 *     summary: PATCH /api/v1/system/config
 *     description: Handle PATCH request for /api/v1/system/config
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
 *       200:
 *         description: PATCH /api/v1/system/config successful
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
 *                   example: "PATCH /api/v1/system/config successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch(
  '/system/config',
  requirePermission(PERMISSIONS.ADMIN_CONFIG_UPDATE),
  authLimiter,
  AdminController.updateConfiguration
);

// User management

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/users
 *     description: Handle GET request for /api/v1/users
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/users successful
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

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/users
 *     description: Handle GET request for /api/v1/users
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/users successful
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

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/users
 *     description: Handle GET request for /api/v1/users
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/users successful
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

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/users
 *     description: Handle GET request for /api/v1/users
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/users successful
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
router.get(
  '/users',
  requirePermission(PERMISSIONS.ADMIN_USER_SEARCH),
  generalLimiter,
  adminValidation.searchUsers,
  handleValidationErrors,
  AdminController.searchUsers
);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/users/{userId}
 *     description: Handle GET request for /api/v1/users/{userId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/users/{userId} successful
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

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/users/{userId}
 *     description: Handle GET request for /api/v1/users/{userId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/users/{userId} successful
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

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/users/{userId}
 *     description: Handle GET request for /api/v1/users/{userId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/users/{userId} successful
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

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/users/{userId}
 *     description: Handle GET request for /api/v1/users/{userId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/users/{userId} successful
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
router.get(
  '/users/:userId',
  requirePermission(PERMISSIONS.ADMIN_USER_READ),
  generalLimiter,
  adminValidation.getUserDetails,
  handleValidationErrors,
  AdminController.getUserDetails
);

/**
 * @swagger
 * /api/v1/users/{userId}/action:
 *   patch:
 *     tags: [Admin Management]
 *     summary: PATCH /api/v1/users/{userId}/action
 *     description: Handle PATCH request for /api/v1/users/{userId}/action
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
 *       200:
 *         description: PATCH /api/v1/users/{userId}/action successful
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
 *                   example: "PATCH /api/v1/users/{userId}/action successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/users/{userId}/action:
 *   patch:
 *     tags: [Admin Management]
 *     summary: PATCH /api/v1/users/{userId}/action
 *     description: Handle PATCH request for /api/v1/users/{userId}/action
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
 *       200:
 *         description: PATCH /api/v1/users/{userId}/action successful
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
 *                   example: "PATCH /api/v1/users/{userId}/action successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/users/{userId}/action:
 *   patch:
 *     tags: [Admin Management]
 *     summary: PATCH /api/v1/users/{userId}/action
 *     description: Handle PATCH request for /api/v1/users/{userId}/action
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
 *       200:
 *         description: PATCH /api/v1/users/{userId}/action successful
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
 *                   example: "PATCH /api/v1/users/{userId}/action successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/users/{userId}/action:
 *   patch:
 *     tags: [Admin Management]
 *     summary: PATCH /api/v1/users/{userId}/action
 *     description: Handle PATCH request for /api/v1/users/{userId}/action
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
 *       200:
 *         description: PATCH /api/v1/users/{userId}/action successful
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
 *                   example: "PATCH /api/v1/users/{userId}/action successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch(
  '/users/:userId/action',
  requirePermission(PERMISSIONS.ADMIN_USER_UPDATE),
  authLimiter,
  adminValidation.performUserAction,
  handleValidationErrors,
  AdminController.performUserAction
);
router.patch(
  '/users/:userId',
  requirePermission(PERMISSIONS.ADMIN_USER_UPDATE),
  authLimiter,
  adminValidation.updateUserProfile,
  handleValidationErrors,
  AdminController.updateUserProfile
);

// Rescue organization management

/**
 * @swagger
 * /api/v1/rescues:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/rescues
 *     description: Handle GET request for /api/v1/rescues
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/rescues successful
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

/**
 * @swagger
 * /api/v1/rescues:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/rescues
 *     description: Handle GET request for /api/v1/rescues
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/rescues successful
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

/**
 * @swagger
 * /api/v1/rescues:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/rescues
 *     description: Handle GET request for /api/v1/rescues
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/rescues successful
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

/**
 * @swagger
 * /api/v1/rescues:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/rescues
 *     description: Handle GET request for /api/v1/rescues
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/rescues successful
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
router.get(
  '/rescues',
  requirePermission(PERMISSIONS.ADMIN_RESCUE_MANAGEMENT),
  generalLimiter,
  adminValidation.getRescues,
  handleValidationErrors,
  AdminController.getRescueManagement
);

/**
 * @swagger
 * /api/v1/rescues/{rescueId}/moderate:
 *   patch:
 *     tags: [Admin Management]
 *     summary: PATCH /api/v1/rescues/{rescueId}/moderate
 *     description: Handle PATCH request for /api/v1/rescues/{rescueId}/moderate
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
 *       200:
 *         description: PATCH /api/v1/rescues/{rescueId}/moderate successful
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
 *                   example: "PATCH /api/v1/rescues/{rescueId}/moderate successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/rescues/{rescueId}/moderate:
 *   patch:
 *     tags: [Admin Management]
 *     summary: PATCH /api/v1/rescues/{rescueId}/moderate
 *     description: Handle PATCH request for /api/v1/rescues/{rescueId}/moderate
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
 *       200:
 *         description: PATCH /api/v1/rescues/{rescueId}/moderate successful
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
 *                   example: "PATCH /api/v1/rescues/{rescueId}/moderate successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/rescues/{rescueId}/moderate:
 *   patch:
 *     tags: [Admin Management]
 *     summary: PATCH /api/v1/rescues/{rescueId}/moderate
 *     description: Handle PATCH request for /api/v1/rescues/{rescueId}/moderate
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
 *       200:
 *         description: PATCH /api/v1/rescues/{rescueId}/moderate successful
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
 *                   example: "PATCH /api/v1/rescues/{rescueId}/moderate successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/rescues/{rescueId}/moderate:
 *   patch:
 *     tags: [Admin Management]
 *     summary: PATCH /api/v1/rescues/{rescueId}/moderate
 *     description: Handle PATCH request for /api/v1/rescues/{rescueId}/moderate
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
 *       200:
 *         description: PATCH /api/v1/rescues/{rescueId}/moderate successful
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
 *                   example: "PATCH /api/v1/rescues/{rescueId}/moderate successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch(
  '/rescues/:rescueId/moderate',
  requirePermission(PERMISSIONS.ADMIN_RESCUE_MANAGEMENT),
  authLimiter,
  adminValidation.moderateRescue,
  handleValidationErrors,
  AdminController.moderateRescue
);

// Audit logs and monitoring

/**
 * @swagger
 * /api/v1/audit-logs:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/audit-logs
 *     description: Handle GET request for /api/v1/audit-logs
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/audit-logs successful
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

/**
 * @swagger
 * /api/v1/audit-logs:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/audit-logs
 *     description: Handle GET request for /api/v1/audit-logs
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/audit-logs successful
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

/**
 * @swagger
 * /api/v1/audit-logs:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/audit-logs
 *     description: Handle GET request for /api/v1/audit-logs
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/audit-logs successful
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

/**
 * @swagger
 * /api/v1/audit-logs:
 *   get:
 *     tags: [Admin Management]
 *     summary: GET /api/v1/audit-logs
 *     description: Handle GET request for /api/v1/audit-logs
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/audit-logs successful
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
router.get(
  '/audit-logs',
  requirePermission(PERMISSIONS.ADMIN_AUDIT_LOGS_READ),
  generalLimiter,
  adminValidation.getAuditLogs,
  handleValidationErrors,
  AdminController.getAuditLogs
);

// Data export
router.get(
  '/export/:type',
  requirePermission(PERMISSIONS.ADMIN_DATA_EXPORT),
  authLimiter, // More restrictive rate limiting for data export
  adminValidation.exportData,
  handleValidationErrors,
  AdminController.exportData
);

export default router;
