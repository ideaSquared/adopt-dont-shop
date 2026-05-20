import type { NextFunction, RequestHandler, Response } from 'express';
import { meetsMinPlan, planHasFeature, type RescuePlan, type PlanFeature } from '../config/plans';
import Rescue from '../models/Rescue';
import { UserType } from '../models/User';
import type { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

const loadRescuePlan = async (req: AuthenticatedRequest): Promise<RescuePlan | null> => {
  const rescueId = req.user?.rescueId;
  if (!rescueId) return null;
  const rescue = await Rescue.findByPk(rescueId, { attributes: ['plan'] });
  return rescue?.plan ?? null;
};

/**
 * Require the requesting rescue's plan to meet or exceed `minTier`.
 * Platform admins bypass the check unconditionally.
 * Non-rescue users (no rescueId on the authenticated user) are denied.
 */
export const requirePlan =
  (minTier: RescuePlan): RequestHandler =>
  async (rawReq, res: Response, next: NextFunction): Promise<void> => {
    const req = rawReq as AuthenticatedRequest;
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      if (req.user.userType === UserType.ADMIN) {
        next();
        return;
      }
      const plan = await loadRescuePlan(req);
      if (!plan) {
        res.status(403).json({ error: 'No rescue affiliation', code: 'NO_RESCUE' });
        return;
      }
      if (!meetsMinPlan(plan, minTier)) {
        logger.warn('Plan gate denied', {
          userId: req.user.userId,
          rescueId: req.user.rescueId,
          currentPlan: plan,
          requiredPlan: minTier,
        });
        res.status(403).json({
          error: 'Plan upgrade required',
          code: 'PLAN_UPGRADE_REQUIRED',
          currentPlan: plan,
          requiredPlan: minTier,
        });
        return;
      }
      next();
    } catch (error) {
      logger.error('Plan gate error', { error });
      res.status(500).json({ error: 'Plan check failed' });
    }
  };

/**
 * Require the requesting rescue's plan to include the named `feature`.
 * Platform admins bypass the check unconditionally.
 */
export const requirePlanFeature =
  (feature: PlanFeature): RequestHandler =>
  async (rawReq, res: Response, next: NextFunction): Promise<void> => {
    const req = rawReq as AuthenticatedRequest;
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      if (req.user.userType === UserType.ADMIN) {
        next();
        return;
      }
      const plan = await loadRescuePlan(req);
      if (!plan) {
        res.status(403).json({ error: 'No rescue affiliation', code: 'NO_RESCUE' });
        return;
      }
      if (!planHasFeature(plan, feature)) {
        logger.warn('Plan feature gate denied', {
          userId: req.user.userId,
          rescueId: req.user.rescueId,
          currentPlan: plan,
          requiredFeature: feature,
        });
        res.status(403).json({
          error: 'Feature not available on current plan',
          code: 'FEATURE_NOT_AVAILABLE',
          currentPlan: plan,
          requiredFeature: feature,
        });
        return;
      }
      next();
    } catch (error) {
      logger.error('Plan feature gate error', { error });
      res.status(500).json({ error: 'Plan check failed' });
    }
  };
