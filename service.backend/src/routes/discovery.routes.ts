import { Router } from 'express';
import { DiscoveryController } from '../controllers/discovery.controller';
import { anonSwipeLimit } from '../middleware/anon-swipe-limit';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { idempotency } from '../middleware/idempotency';

const router = Router();
const discoveryController = new DiscoveryController();

// Health check for discovery service

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     tags: [Discovery Service]
 *     summary: GET /api/v1/health
 *     description: Handle GET request for /api/v1/health
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/health successful
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
 * /api/v1/health:
 *   get:
 *     tags: [Discovery Service]
 *     summary: GET /api/v1/health
 *     description: Handle GET request for /api/v1/health
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/health successful
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
 * /api/v1/health:
 *   get:
 *     tags: [Discovery Service]
 *     summary: GET /api/v1/health
 *     description: Handle GET request for /api/v1/health
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/health successful
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
 * /api/v1/health:
 *   get:
 *     tags: [Discovery Service]
 *     summary: GET /api/v1/health
 *     description: Handle GET request for /api/v1/health
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/health successful
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
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Discovery service is running',
    timestamp: new Date().toISOString(),
    service: 'discovery',
  });
});

// Discovery routes
router.get(
  '/pets',
  optionalAuth,
  DiscoveryController.validateDiscoveryQuery,
  discoveryController.getDiscoveryQueue
);

router.post(
  '/pets/more',
  DiscoveryController.validateLoadMorePets,
  discoveryController.loadMorePets
);

/**
 * @swagger
 * /api/v1/discovery/queue:
 *   post:
 *     tags: [Discovery Service]
 *     summary: Add pet to discovery queue
 *     description: Add a pet to the user's discovery queue for swiping
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
 *               userId:
 *                 type: string
 *                 description: User ID
 *               preferences:
 *                 type: object
 *                 description: User preferences for discovery
 *     responses:
 *       200:
 *         description: Successfully added to queue
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
 *                   example: Added to discovery queue
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Optional auth so the personalised match path engages when a cookie is
// present, while anonymous browse still works.
router.post(
  '/queue',
  optionalAuth,
  DiscoveryController.validateAddToQueue,
  discoveryController.addToQueue
);

// Swipe action routes.
// optionalAuth attaches `req.user` when a token is present so the controller
// can attribute the swipe to the authenticated caller (and the anon swipe
// paywall middleware can exempt authenticated callers).
router.post(
  '/swipe/action',
  optionalAuth,
  anonSwipeLimit,
  idempotency,
  DiscoveryController.validateSwipeAction,
  discoveryController.recordSwipeAction
);

router.get(
  '/swipe/stats/:userId',
  authenticateToken,
  DiscoveryController.validateUserId,
  discoveryController.getSwipeStats
);

// TODO: per-session ownership enforcement is a follow-up; for now any
// authenticated user can read stats for a known session id, but ids are
// random enough to make enumeration impractical.
router.get(
  '/swipe/session/:sessionId',
  authenticateToken,
  DiscoveryController.validateSessionId,
  discoveryController.getSessionStats
);

export default router;
