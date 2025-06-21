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
router.get('/preferences/:userId', authenticateToken, emailController.getUserPreferences);
router.put('/preferences/:userId', authenticateToken, emailController.updateUserPreferences);

// Public Unsubscribe (No authentication required)
router.get('/unsubscribe/:token', emailController.unsubscribeUser);

// Webhooks (No authentication required - handled by provider verification)
router.post('/webhook/delivery', emailController.handleDeliveryWebhook);

export default router;
