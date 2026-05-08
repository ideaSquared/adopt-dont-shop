import { Router } from 'express';
import GdprController, { gdprValidation } from '../controllers/gdpr.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Self-service routes (any authenticated user, acting on their own data)
router.get('/me/export', GdprController.exportSelf.bind(GdprController));
router.post('/me/erase', gdprValidation.anonymize, GdprController.eraseSelf.bind(GdprController));
router.get('/me/consents', GdprController.getConsents.bind(GdprController));
router.post(
  '/me/consents',
  gdprValidation.recordConsent,
  GdprController.recordConsent.bind(GdprController)
);

// Admin routes — controller checks the userType. The auth middleware
// already populates req.user; admin gating is intentionally inside the
// controller (not requirePermission) so failures hit a single audited
// path.
router.get('/users/:userId/export', GdprController.exportByAdmin.bind(GdprController));
router.post(
  '/users/:userId/erase',
  gdprValidation.anonymize,
  GdprController.eraseByAdmin.bind(GdprController)
);

export default router;
