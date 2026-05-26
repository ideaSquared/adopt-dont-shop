import express from 'express';
import { InboxController } from '../controllers/inbox.controller';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { generalLimiter } from '../middleware/rate-limiter';

const router = express.Router();

// All inbox routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

router.get(
  '/',
  generalLimiter,
  InboxController.getItems
);

router.post(
  '/assign',
  generalLimiter,
  InboxController.assign
);

export default router;
