import { Router, type Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import fosterService from '../services/foster.service';
import { FosterPlacementStatus } from '../models/FosterPlacement';
import { UserType } from '../models/User';
import type { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

const router = Router();

router.use(authenticateToken);

const ADMIN_USER_TYPES = [UserType.ADMIN, UserType.SUPER_ADMIN];
const FOSTER_ROUTE_USER_TYPES = [...ADMIN_USER_TYPES, UserType.RESCUE_STAFF];

const isAdmin = (req: AuthenticatedRequest): boolean => {
  const role = req.user?.userType as UserType | undefined;
  return role !== undefined && ADMIN_USER_TYPES.includes(role);
};

// Per-record scoping check. Distinct from the route-level `requireRole`
// guard: that filters out roles entirely, this one decides whether an
// already-authorised caller may operate on a *specific* placement based
// on its rescueId.
const rescueScopeOrAdmin = (req: AuthenticatedRequest, rescueId: string): boolean => {
  if (isAdmin(req)) {
    return true;
  }
  return req.user?.rescueId === rescueId;
};

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
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!rescueScopeOrAdmin(req, req.body.rescueId)) {
      return res.status(403).json({ error: 'Cannot create placements for this rescue' });
    }
    try {
      const placement = await fosterService.createPlacement(
        {
          petId: req.body.petId,
          fosterUserId: req.body.fosterUserId,
          rescueId: req.body.rescueId,
          startDate: new Date(req.body.startDate),
          notes: req.body.notes,
        },
        req.user.userId
      );
      return res.status(201).json({ data: placement });
    } catch (error) {
      logger.error('Failed to create foster placement', { error });
      return res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Failed to create placement' });
    }
  }
);

router.get(
  '/placements',
  requireRole(...FOSTER_ROUTE_USER_TYPES),
  [
    query('rescueId').optional().isUUID(),
    query('fosterUserId').optional().isUUID(),
    query('status').optional().isIn(Object.values(FosterPlacementStatus)),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // Non-admins must resolve to a concrete rescue scope. Falling through
    // to `undefined` would skip the rescueId filter in the service and
    // leak placements across every rescue (ADS-606).
    if (!isAdmin(req) && !req.user.rescueId) {
      return res.status(403).json({ error: 'No rescue scope' });
    }
    // Non-admins are scoped to their own rescue.
    const scopedRescueId = isAdmin(req)
      ? (req.query.rescueId as string | undefined)
      : (req.user.rescueId ?? undefined);

    try {
      const placements = await fosterService.list({
        rescueId: scopedRescueId,
        fosterUserId: req.query.fosterUserId as string | undefined,
        status: req.query.status as FosterPlacementStatus | undefined,
      });
      return res.json({ data: placements });
    } catch (error) {
      logger.error('Failed to list foster placements', { error });
      return res.status(500).json({ error: 'Failed to list placements' });
    }
  }
);

router.get(
  '/placements/:id',
  requireRole(...FOSTER_ROUTE_USER_TYPES),
  [param('id').isUUID()],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const placement = await fosterService.getById(req.params.id);
    if (!placement) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (!rescueScopeOrAdmin(req, placement.rescueId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json({ data: placement });
  }
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
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const existing = await fosterService.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (!rescueScopeOrAdmin(req, existing.rescueId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const placement = await fosterService.endPlacement(
        req.params.id,
        {
          outcome: req.body.outcome,
          endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
          notes: req.body.notes,
        },
        req.user.userId
      );
      return res.json({ data: placement });
    } catch (error) {
      logger.error('Failed to end foster placement', { error });
      return res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Failed to end placement' });
    }
  }
);

export default router;
