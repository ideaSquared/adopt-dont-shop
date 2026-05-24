import { Router, type Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { FosterPlacementStatus } from '../models/FosterPlacement';
import { UserType } from '../models/User';
import { FosterController } from '../controllers/foster.controller';
import type { AuthenticatedRequest } from '../types/auth';

const router = Router();

router.use(authenticateToken);

const FOSTER_ROUTE_USER_TYPES = [UserType.ADMIN, UserType.SUPER_ADMIN, UserType.RESCUE_STAFF];

router.post(
  '/placements',
  requireRole(...FOSTER_ROUTE_USER_TYPES),
  [
    body('petId').isUUID(),
    body('fosterUserId').isUUID(),
    body('rescueId').isUUID(),
    body('startDate').isISO8601(),
    body('notes').optional().isString().isLength({ max: 2000 }),
  ],
  (req: AuthenticatedRequest, res: Response) => FosterController.createPlacement(req, res)
);

router.get(
  '/placements',
  requireRole(...FOSTER_ROUTE_USER_TYPES),
  [
    query('rescueId').optional().isUUID(),
    query('fosterUserId').optional().isUUID(),
    query('status').optional().isIn(Object.values(FosterPlacementStatus)),
  ],
  (req: AuthenticatedRequest, res: Response) => FosterController.listPlacements(req, res)
);

router.get(
  '/placements/:id',
  requireRole(...FOSTER_ROUTE_USER_TYPES),
  [param('id').isUUID()],
  (req: AuthenticatedRequest, res: Response) => FosterController.getPlacement(req, res)
);

router.post(
  '/placements/:id/end',
  requireRole(...FOSTER_ROUTE_USER_TYPES),
  [
    param('id').isUUID(),
    body('outcome').isIn(['return_to_rescue', 'adopted_by_foster', 'cancelled']),
    body('endDate').optional().isISO8601(),
    body('notes').optional().isString().isLength({ max: 2000 }),
  ],
  (req: AuthenticatedRequest, res: Response) => FosterController.endPlacement(req, res)
);

export default router;
