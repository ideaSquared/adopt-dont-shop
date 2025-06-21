import { Router } from 'express';
import emailController from '../controllers/email.controller';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserType } from '../models/User';

const router = Router();

router.get(
  '/templates',
  authenticateToken,
  requireRole([UserType.ADMIN]),
  emailController.getTemplates
);

router.post(
  '/templates',
  authenticateToken,
  requireRole([UserType.ADMIN]),
  emailController.createTemplate
);

router.put(
  '/templates/:templateId',
  authenticateToken,
  requireRole([UserType.ADMIN]),
  emailController.updateTemplate
);

router.delete(
  '/templates/:templateId',
  authenticateToken,
  requireRole([UserType.ADMIN]),
  emailController.deleteTemplate
);

router.post(
  '/templates/:templateId/activate',
  authenticateToken,
  requireRole([UserType.ADMIN]),
  emailController.activateTemplate
);

router.post(
  '/templates/:templateId/deactivate',
  authenticateToken,
  requireRole([UserType.ADMIN]),
  emailController.deactivateTemplate
);

router.post(
  '/templates/:templateId/test',
  authenticateToken,
  requireRole([UserType.ADMIN]),
  emailController.testTemplate
);

router.post('/send', authenticateToken, requireRole([UserType.ADMIN]), emailController.sendEmail);

router.post(
  '/send/bulk',
  authenticateToken,
  requireRole([UserType.ADMIN]),
  emailController.sendBulkEmail
);

router.get(
  '/queue',
  authenticateToken,
  requireRole([UserType.ADMIN]),
  emailController.getQueueStatus
);

router.post(
  '/queue/:emailId/retry',
  authenticateToken,
  requireRole([UserType.ADMIN]),
  emailController.retryEmail
);

// User preference endpoints
router.get(
  '/preferences',
  authenticateToken,
  requireRole([UserType.ADMIN]),
  emailController.getUserPreferences
);

router.put(
  '/preferences',
  authenticateToken,
  requireRole([UserType.ADMIN]),
  emailController.updateUserPreferences
);

// Analytics endpoints
router.get(
  '/analytics',
  authenticateToken,
  requireRole([UserType.ADMIN]),
  emailController.getEmailAnalytics
);

export default router;
