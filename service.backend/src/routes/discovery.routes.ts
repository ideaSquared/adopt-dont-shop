import { Router } from 'express';
import { QueryTypes } from 'sequelize';
import { DiscoveryController } from '../controllers/discovery.controller';
import { authenticateToken } from '../middleware/auth';
import sequelize from '../sequelize';

const router = Router();
const discoveryController = new DiscoveryController();

// Health check for discovery service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Discovery service is running',
    timestamp: new Date().toISOString(),
    service: 'discovery',
  });
});

// Database connectivity test
router.get('/db-test', async (req, res) => {
  try {
    // Test database connection by counting pets
    const result = await sequelize.query('SELECT COUNT(*) as count FROM pets', {
      type: QueryTypes.SELECT,
    });

    res.json({
      success: true,
      message: 'Database connection successful',
      data: {
        petCount: (result[0] as any).count,
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
