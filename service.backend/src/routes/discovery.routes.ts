import { Router } from 'express';
import { DiscoveryController } from '../controllers/discovery.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const discoveryController = new DiscoveryController();

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
