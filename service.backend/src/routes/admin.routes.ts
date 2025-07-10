import express from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { authLimiter, generalLimiter } from '../middleware/rate-limiter';

const router = express.Router();

// Apply authentication and admin role requirement to all admin routes
router.use(authenticateToken);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

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
router.get('/metrics', generalLimiter, AdminController.getPlatformMetrics);

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
router.get('/analytics/usage', generalLimiter, AdminController.getUsageAnalytics);

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
router.get('/system/health', generalLimiter, AdminController.getSystemHealth);

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
router.get('/system/config', generalLimiter, AdminController.getConfiguration);

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
router.patch('/system/config', authLimiter, AdminController.updateConfiguration);

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
router.get('/users', generalLimiter, AdminController.searchUsers);

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
router.get('/users/:userId', generalLimiter, AdminController.getUserDetails);

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
router.patch('/users/:userId/action', authLimiter, AdminController.performUserAction);

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
router.get('/rescues', generalLimiter, AdminController.getRescueManagement);

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
router.patch('/rescues/:rescueId/moderate', authLimiter, AdminController.moderateRescue);

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
router.get('/audit-logs', generalLimiter, AdminController.getAuditLogs);

// Data export
router.get(
  '/export/:type',
  authLimiter, // More restrictive rate limiting for data export
  AdminController.exportData
);

export default router;
