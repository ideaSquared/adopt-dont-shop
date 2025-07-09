import { Router } from 'express';
import * as emailController from '../controllers/email.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Email Template Management (Admin only)
router.get(
  '/templates',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.getTemplates
);
router.post(
  '/templates',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.createTemplate
);
router.get(
  '/templates/:templateId',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.getTemplate
);
router.put(
  '/templates/:templateId',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.updateTemplate
);
router.delete(
  '/templates/:templateId',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.deleteTemplate
);

// Template Preview and Testing (Admin only)
router.post(
  '/templates/:templateId/preview',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.previewTemplate
);
router.post(
  '/templates/:templateId/test',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.sendTestEmail
);

// Email Sending (Admin and System only)
router.post(
  '/send',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'RESCUE_STAFF']),
  emailController.sendEmail
);
router.post(
  '/send/bulk',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.sendBulkEmail
);

// Queue Management (Admin only)
router.get(
  '/queue',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.getQueueStatus
);
router.post(
  '/queue/process',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.processQueue
);
router.post(
  '/queue/retry',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.retryFailedEmails
);

// Analytics (Admin only)
router.get(
  '/analytics',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.getEmailAnalytics
);
router.get(
  '/analytics/:templateId',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  emailController.getTemplateAnalytics
);

// User Email Preferences (User can access their own, Admin can access any)

/**
 * @swagger
 * /api/v1/preferences/{userId}:
 *   get:
 *     tags: [Email Management]
 *     summary: GET /api/v1/preferences/{userId}
 *     description: Handle GET request for /api/v1/preferences/{userId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/preferences/{userId} successful
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
router.get('/preferences/:userId', authenticateToken, emailController.getUserPreferences);

/**
 * @swagger
 * /api/v1/preferences/{userId}:
 *   put:
 *     tags: [Email Management]
 *     summary: PUT /api/v1/preferences/{userId}
 *     description: Handle PUT request for /api/v1/preferences/{userId}
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
 *         description: PUT /api/v1/preferences/{userId} successful
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
 *                   example: "PUT /api/v1/preferences/{userId} successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/preferences/:userId', authenticateToken, emailController.updateUserPreferences);

// Public Unsubscribe (No authentication required)

/**
 * @swagger
 * /api/v1/unsubscribe/{token}:
 *   get:
 *     tags: [Email Management]
 *     summary: GET /api/v1/unsubscribe/{token}
 *     description: Handle GET request for /api/v1/unsubscribe/{token}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/unsubscribe/{token} successful
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
router.get('/unsubscribe/:token', emailController.unsubscribeUser);

// Webhooks (No authentication required - handled by provider verification)

/**
 * @swagger
 * /api/v1/webhook/delivery:
 *   post:
 *     tags: [Email Management]
 *     summary: POST /api/v1/webhook/delivery
 *     description: Handle POST request for /api/v1/webhook/delivery
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
 *         description: POST /api/v1/webhook/delivery successful
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
 *                   example: "POST /api/v1/webhook/delivery successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/webhook/delivery', emailController.handleDeliveryWebhook);

export default router;
