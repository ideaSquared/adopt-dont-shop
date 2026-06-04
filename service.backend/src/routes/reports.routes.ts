import express from 'express';
import { ReportsController } from '../controllers/reports.controller';
import { authenticateToken } from '../middleware/auth';
import { auditRoute } from '../middleware/audit-route';
import { requirePermission } from '../middleware/rbac';
import { requirePlanFeature } from '../middleware/plan-gate';
import { generalLimiter, reportLimiter } from '../middleware/rate-limiter';
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
router.get('/shared/:token', generalLimiter, ReportsController.viewSharedByToken);

// Everything else requires auth.
router.use(authenticateToken);

router.get(
  '/',
  requirePermission(PERMISSIONS.REPORTS_READ_OWN),
  requirePlanFeature('reports'),
  ReportsController.list
);
router.post(
  '/',
  requirePermission(PERMISSIONS.REPORTS_CREATE),
  requirePlanFeature('reports'),
  auditRoute({
    action: 'REPORT_CREATED',
    entity: 'Report',
    // ADS-754: BaseController.sendSuccess wraps the payload at `data`, and
    // the SavedReport PK column is `saved_report_id`.
    entityIdFrom: ctx => {
      const r = ctx.response as { data?: { saved_report_id?: string } } | undefined;
      return r?.data?.saved_report_id;
    },
    metadataFrom: ['body.name', 'body.type'],
  }),
  ReportsController.create
);

router.get(
  '/templates',
  requirePermission(PERMISSIONS.REPORTS_READ_OWN),
  requirePlanFeature('reports'),
  ReportsController.listTemplates
);

// Preview endpoint — un-saved config; cheaper than persisting then executing.
// ADS-517: pre-aggregations + large response bodies, so a tighter
// limiter than the general apiLimiter.
router.post(
  '/execute',
  reportLimiter,
  requirePermission(PERMISSIONS.REPORTS_CREATE),
  requirePlanFeature('reports'),
  ReportsController.executePreview
);

router.get('/:id', ReportsController.get); // service-side perm check
router.put(
  '/:id',
  requirePermission(PERMISSIONS.REPORTS_UPDATE),
  requirePlanFeature('reports'),
  auditRoute({
    action: 'REPORT_UPDATED',
    entity: 'Report',
    entityIdFrom: 'params.id',
  }),
  ReportsController.update
);
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.REPORTS_DELETE),
  requirePlanFeature('reports'),
  auditRoute({
    action: 'REPORT_DELETED',
    entity: 'Report',
    entityIdFrom: 'params.id',
  }),
  ReportsController.remove
);

router.post(
  '/:id/execute',
  reportLimiter,
  requirePlanFeature('reports'),
  ReportsController.executeSaved
);

router.post(
  '/:id/schedule',
  requirePermission(PERMISSIONS.REPORTS_SCHEDULE),
  requirePlanFeature('scheduled_reports'),
  auditRoute({
    action: 'REPORT_SCHEDULE_UPSERTED',
    entity: 'Report',
    entityIdFrom: 'params.id',
    metadataFrom: ['body.cron', 'body.recipients'],
  }),
  ReportsController.upsertSchedule
);
router.delete(
  '/schedules/:scheduleId',
  requirePermission(PERMISSIONS.REPORTS_SCHEDULE),
  requirePlanFeature('scheduled_reports'),
  auditRoute({
    action: 'REPORT_SCHEDULE_DELETED',
    entity: 'ReportSchedule',
    entityIdFrom: 'params.scheduleId',
  }),
  ReportsController.deleteSchedule
);

router.post(
  '/:id/share',
  requirePermission(PERMISSIONS.REPORTS_SHARE),
  auditRoute({
    action: 'REPORT_SHARED',
    entity: 'Report',
    entityIdFrom: 'params.id',
    metadataFrom: ['body.recipients', 'body.expiresAt'],
  }),
  ReportsController.createShare
);
router.delete(
  '/shares/:shareId',
  requirePermission(PERMISSIONS.REPORTS_SHARE),
  auditRoute({
    action: 'REPORT_SHARE_REVOKED',
    entity: 'ReportShare',
    entityIdFrom: 'params.shareId',
  }),
  ReportsController.revokeShare
);

export default router;
