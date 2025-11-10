import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticateOptionalToken } from '../middleware/auth';

const router = Router();
const analyticsController = new AnalyticsController();

/**
 * @swagger
 * components:
 *   schemas:
 *     PageviewData:
 *       type: object
 *       required:
 *         - path
 *         - timestamp
 *       properties:
 *         path:
 *           type: string
 *           description: The page path that was viewed
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the pageview occurred
 *         userId:
 *           type: string
 *           description: Optional user ID if authenticated
 *         sessionId:
 *           type: string
 *           description: Session identifier
 *         referrer:
 *           type: string
 *           description: Referrer URL
 *         userAgent:
 *           type: string
 *           description: User agent string
 *
 *     AnalyticsEvent:
 *       type: object
 *       required:
 *         - event
 *         - timestamp
 *       properties:
 *         event:
 *           type: string
 *           description: The event name
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the event occurred
 *         properties:
 *           type: object
 *           description: Additional event properties
 *         userId:
 *           type: string
 *           description: Optional user ID if authenticated
 *         sessionId:
 *           type: string
 *           description: Session identifier
 */

/**
 * @swagger
 * /api/v1/analytics/pageviews:
 *   post:
 *     tags: [Analytics]
 *     summary: Record a pageview
 *     description: Records a page view for analytics tracking
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PageviewData'
 *     responses:
 *       201:
 *         description: Pageview recorded successfully
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
 *                   example: Pageview recorded
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/pageviews',
  authenticateOptionalToken,
  AnalyticsController.validatePageview,
  analyticsController.recordPageview
);

/**
 * @swagger
 * /api/v1/analytics/events/batch:
 *   post:
 *     tags: [Analytics]
 *     summary: Record multiple analytics events
 *     description: Records multiple analytics events in a single batch
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - events
 *             properties:
 *               events:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/AnalyticsEvent'
 *     responses:
 *       201:
 *         description: Events recorded successfully
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
 *                   example: Events recorded
 *                 processed:
 *                   type: number
 *                   example: 5
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/events/batch',
  authenticateOptionalToken,
  AnalyticsController.validateEventsBatch,
  analyticsController.recordEventsBatch
);

/**
 * @swagger
 * /api/v1/analytics/events:
 *   post:
 *     tags: [Analytics]
 *     summary: Record a single analytics event
 *     description: Records a single analytics event
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalyticsEvent'
 *     responses:
 *       201:
 *         description: Event recorded successfully
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
 *                   example: Event recorded
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/events',
  authenticateOptionalToken,
  AnalyticsController.validateEvent,
  analyticsController.recordEvent
);

/**
 * @swagger
 * /api/v1/analytics/health:
 *   get:
 *     tags: [Analytics]
 *     summary: Analytics service health check
 *     description: Check if the analytics service is healthy
 *     responses:
 *       200:
 *         description: Analytics service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'analytics',
  });
});

export default router;
