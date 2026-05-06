import express from 'express';
import { ReportsController } from '../controllers/reports.controller';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { generalLimiter } from '../middleware/rate-limiter';
import { PERMISSIONS } from '../types/rbac';

/**
 * ADS-105: Custom analytics report endpoints.
 *
 * Mounted at `/api/v1/reports` from `routes/index.ts`.
 *
 * Most routes require auth + a permission check. The single
 * exception is `GET /reports/shared/:token` — token-share access
 * is intentionally session-less (signed JWT in the URL path is the
 * sole credential).
 */

const router = express.Router();

// Token share is session-less and must NOT pass through authenticateToken.
router.get(
  '/shared/:token',
  generalLimiter,
  ReportsController.viewSharedByToken
);

// Everything else requires auth.
router.use(authenticateToken);

router.get('/', requirePermission(PERMISSIONS.REPORTS_READ_OWN), ReportsController.list);
router.post('/', requirePermission(PERMISSIONS.REPORTS_CREATE), ReportsController.create);

router.get('/templates', requirePermission(PERMISSIONS.REPORTS_READ_OWN), ReportsController.listTemplates);

// Preview endpoint — un-saved config; cheaper than persisting then executing.
router.post(
  '/execute',
  requirePermission(PERMISSIONS.REPORTS_CREATE),
  ReportsController.executePreview
);

router.get('/:id', ReportsController.get); // service-side perm check
router.put('/:id', requirePermission(PERMISSIONS.REPORTS_UPDATE), ReportsController.update);
router.delete('/:id', requirePermission(PERMISSIONS.REPORTS_DELETE), ReportsController.remove);

router.post('/:id/execute', ReportsController.executeSaved);

router.post(
  '/:id/schedule',
  requirePermission(PERMISSIONS.REPORTS_SCHEDULE),
  ReportsController.upsertSchedule
);
router.delete(
  '/schedules/:scheduleId',
  requirePermission(PERMISSIONS.REPORTS_SCHEDULE),
  ReportsController.deleteSchedule
);

router.post(
  '/:id/share',
  requirePermission(PERMISSIONS.REPORTS_SHARE),
  ReportsController.createShare
);
router.delete(
  '/shares/:shareId',
  requirePermission(PERMISSIONS.REPORTS_SHARE),
  ReportsController.revokeShare
);

export default router;
