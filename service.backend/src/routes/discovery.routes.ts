import { Router } from 'express';
import { QueryTypes } from 'sequelize';
import { DiscoveryController } from '../controllers/discovery.controller';
import { authenticateToken } from '../middleware/auth';
import sequelize from '../sequelize';

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

// Database connectivity test

/**
 * @swagger
 * /api/v1/db-test:
 *   get:
 *     tags: [Discovery Service]
 *     summary: GET /api/v1/db-test
 *     description: Handle GET request for /api/v1/db-test
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/db-test successful
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
 * /api/v1/db-test:
 *   get:
 *     tags: [Discovery Service]
 *     summary: GET /api/v1/db-test
 *     description: Handle GET request for /api/v1/db-test
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/db-test successful
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
 * /api/v1/db-test:
 *   get:
 *     tags: [Discovery Service]
 *     summary: GET /api/v1/db-test
 *     description: Handle GET request for /api/v1/db-test
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/db-test successful
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
 * /api/v1/db-test:
 *   get:
 *     tags: [Discovery Service]
 *     summary: GET /api/v1/db-test
 *     description: Handle GET request for /api/v1/db-test
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/db-test successful
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
router.get('/db-test', async (req, res) => {
  try {
    // Test database connection by counting pets
    type CountResult = { count: string | number };
    const result = await sequelize.query<CountResult>('SELECT COUNT(*) as count FROM pets', {
      type: QueryTypes.SELECT,
    });

    res.json({
      success: true,
      message: 'Database connection successful',
      data: {
        petCount: result[0]?.count || 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
});

// Simple test endpoint that doesn't use database

/**
 * @swagger
 * /api/v1/test:
 *   get:
 *     tags: [Discovery Service]
 *     summary: GET /api/v1/test
 *     description: Handle GET request for /api/v1/test
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/test successful
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
 * /api/v1/test:
 *   get:
 *     tags: [Discovery Service]
 *     summary: GET /api/v1/test
 *     description: Handle GET request for /api/v1/test
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/test successful
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
 * /api/v1/test:
 *   get:
 *     tags: [Discovery Service]
 *     summary: GET /api/v1/test
 *     description: Handle GET request for /api/v1/test
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/test successful
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
 * /api/v1/test:
 *   get:
 *     tags: [Discovery Service]
 *     summary: GET /api/v1/test
 *     description: Handle GET request for /api/v1/test
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/test successful
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
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Discovery test endpoint',
    data: {
      pets: [
        {
          petId: 'test-pet-1',
          name: 'Test Pet',
          type: 'DOG',
          breed: 'Test Breed',
          ageGroup: 'ADULT',
          size: 'MEDIUM',
          gender: 'MALE',
          images: [],
          rescueName: 'Test Rescue',
          isSponsored: false,
          compatibilityScore: 85,
        },
      ],
      sessionId: 'test-session',
      hasMore: false,
    },
    timestamp: new Date().toISOString(),
  });
});

// Discovery routes
router.get(
  '/pets',
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
router.post('/queue', discoveryController.addToQueue);

// Swipe action routes
router.post(
  '/swipe/action',
  DiscoveryController.validateSwipeAction,
  discoveryController.recordSwipeAction
);

router.get(
  '/swipe/stats/:userId',
  authenticateToken,
  DiscoveryController.validateUserId,
  discoveryController.getSwipeStats
);

router.get(
  '/swipe/session/:sessionId',
  DiscoveryController.validateSessionId,
  discoveryController.getSessionStats
);

export default router;
