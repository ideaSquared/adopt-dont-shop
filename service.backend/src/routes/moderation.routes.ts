import express from 'express';
import { ModerationController } from '../controllers/moderation.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { generalLimiter } from '../middleware/rate-limiter';

const router = express.Router();
const moderationController = new ModerationController();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/admin/moderation/reports:
 *   get:
 *     tags: [Moderation]
 *     summary: Get all moderation reports with filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by report status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by report category
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *         description: Filter by severity level
 *       - in: query
 *         name: assignedModerator
 *         schema:
 *           type: string
 *         description: Filter by assigned moderator ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in report content
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/reports',
  requireRole(['admin', 'moderator', 'rescue_staff']),
  generalLimiter,
  moderationController.getReports.bind(moderationController)
);

/**
 * @swagger
 * /api/v1/admin/moderation/reports/{reportId}:
 *   get:
 *     tags: [Moderation]
 *     summary: Get a specific moderation report by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report retrieved successfully
 *       404:
 *         description: Report not found
 */
router.get(
  '/reports/:reportId',
  requireRole(['admin', 'moderator', 'rescue_staff']),
  generalLimiter,
  moderationController.getReportById.bind(moderationController)
);

/**
 * @swagger
 * /api/v1/admin/moderation/reports:
 *   post:
 *     tags: [Moderation]
 *     summary: Submit a new moderation report
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportedEntityType
 *               - reportedEntityId
 *               - category
 *               - title
 *               - description
 *             properties:
 *               reportedEntityType:
 *                 type: string
 *                 enum: [user, rescue, pet, application, message, conversation]
 *               reportedEntityId:
 *                 type: string
 *               reportedUserId:
 *                 type: string
 *               category:
 *                 type: string
 *               severity:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Report submitted successfully
 */
router.post(
  '/reports',
  generalLimiter,
  moderationController.submitReport.bind(moderationController)
);

/**
 * @swagger
 * /api/v1/admin/moderation/reports/{reportId}/status:
 *   patch:
 *     tags: [Moderation]
 *     summary: Update report status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *               resolutionNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch(
  '/reports/:reportId/status',
  requireRole(['admin', 'moderator']),
  generalLimiter,
  moderationController.updateReportStatus.bind(moderationController)
);

/**
 * @swagger
 * /api/v1/admin/moderation/reports/{reportId}/assign:
 *   post:
 *     tags: [Moderation]
 *     summary: Assign report to a moderator
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - moderatorId
 *             properties:
 *               moderatorId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report assigned successfully
 */
router.post(
  '/reports/:reportId/assign',
  requireRole(['admin', 'moderator']),
  generalLimiter,
  moderationController.assignReport.bind(moderationController)
);

/**
 * @swagger
 * /api/v1/admin/moderation/reports/{reportId}/escalate:
 *   post:
 *     tags: [Moderation]
 *     summary: Escalate a report
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - escalatedTo
 *               - reason
 *             properties:
 *               escalatedTo:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report escalated successfully
 */
router.post(
  '/reports/:reportId/escalate',
  requireRole(['admin', 'moderator']),
  generalLimiter,
  moderationController.escalateReport.bind(moderationController)
);

/**
 * @swagger
 * /api/v1/admin/moderation/reports/bulk-update:
 *   post:
 *     tags: [Moderation]
 *     summary: Bulk update multiple reports
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportIds
 *               - updates
 *             properties:
 *               reportIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               updates:
 *                 type: object
 *     responses:
 *       200:
 *         description: Reports updated successfully
 */
router.post(
  '/reports/bulk-update',
  requireRole(['admin', 'moderator']),
  generalLimiter,
  moderationController.bulkUpdateReports.bind(moderationController)
);

/**
 * @swagger
 * /api/v1/admin/moderation/actions:
 *   post:
 *     tags: [Moderation]
 *     summary: Take a moderation action
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetEntityType
 *               - targetEntityId
 *               - actionType
 *               - severity
 *               - reason
 *             properties:
 *               reportId:
 *                 type: string
 *               targetEntityType:
 *                 type: string
 *               targetEntityId:
 *                 type: string
 *               targetUserId:
 *                 type: string
 *               actionType:
 *                 type: string
 *               severity:
 *                 type: string
 *               reason:
 *                 type: string
 *               description:
 *                 type: string
 *               duration:
 *                 type: number
 *     responses:
 *       201:
 *         description: Moderation action taken successfully
 */
router.post(
  '/actions',
  requireRole(['admin', 'moderator']),
  generalLimiter,
  moderationController.takeModerationAction.bind(moderationController)
);

/**
 * @swagger
 * /api/v1/admin/moderation/actions/active:
 *   get:
 *     tags: [Moderation]
 *     summary: Get active moderation actions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: Active actions retrieved successfully
 */
router.get(
  '/actions/active',
  requireRole(['admin', 'moderator', 'rescue_staff']),
  generalLimiter,
  moderationController.getActiveActions.bind(moderationController)
);

/**
 * @swagger
 * /api/v1/admin/moderation/metrics:
 *   get:
 *     tags: [Moderation]
 *     summary: Get moderation metrics and statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 */
router.get(
  '/metrics',
  requireRole(['admin', 'moderator', 'rescue_staff']),
  generalLimiter,
  moderationController.getModerationMetrics.bind(moderationController)
);

export default router;
