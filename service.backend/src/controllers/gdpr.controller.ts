import { Response } from 'express';
import { body } from 'express-validator';
import { z } from 'zod';
import GdprService from '../services/gdpr.service';
import { ConsentPurpose } from '../models/UserConsent';
import { AuthenticatedRequest } from '../types';
import { UserType } from '../models/User';
import { isAdminRole } from '../utils/is-admin-role';
import { logger } from '../utils/logger';
import { validateBody } from '../middleware/zod-validate';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_OPTIONS,
} from './auth.controller';

const RecordConsentSchema = z.object({
  purpose: z.nativeEnum(ConsentPurpose),
  granted: z.boolean(),
  policyVersion: z.string().min(1).max(32),
  source: z.string().max(64).optional(),
});

export const gdprValidation = {
  recordConsent: validateBody(RecordConsentSchema),
  anonymize: [body('reason').optional().isString().isLength({ max: 500 })],
};

const isAdmin = (req: AuthenticatedRequest): boolean => isAdminRole(req.user?.userType);

export class GdprController {
  /**
   * GDPR Art. 15 / 20 — self-export. The authenticated user can fetch
   * their own data; admins can fetch any user's data via the explicit
   * /admin route.
   */
  async exportSelf(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const data = await GdprService.exportUserData(userId);
    res.setHeader('Content-Disposition', `attachment; filename="user-${userId}.json"`);
    res.json(data);
  }

  async exportByAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!isAdmin(req)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const { userId } = req.params;
    const data = await GdprService.exportUserData(userId);
    res.json(data);
  }

  /**
   * GDPR Art. 17 — self-erasure (phase 1). Soft-deletes the caller's
   * account and schedules anonymization after the grace window.
   */
  async eraseSelf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { reason } = req.body as { reason?: string };
      await GdprService.requestErasure(userId, { reason, actorUserId: userId });
      // Clear auth cookies with the same options used to set them so the
      // browser actually removes them (path/secure/sameSite must match).
      res.clearCookie(ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE_OPTIONS);
      res.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE_OPTIONS);
      res.json({ success: true, message: 'Account scheduled for deletion' });
    } catch (error) {
      logger.error('GDPR self-erase failed', { error });
      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to schedule account deletion' });
    }
  }

  async eraseByAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!isAdmin(req)) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
      const { userId } = req.params;
      const { reason } = req.body as { reason?: string };
      await GdprService.requestErasure(userId, { reason, actorUserId: req.user!.userId });
      res.json({ success: true, message: 'User scheduled for deletion' });
    } catch (error) {
      logger.error('GDPR admin erase failed', { error });
      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to schedule user deletion' });
    }
  }

  /**
   * Admin off-ramp for an in-grace phase-1 erasure. Clears the pending
   * anonymization marker and undeletes the user row. Fails once phase
   * 2 (PII scrub) has run — there's nothing meaningful to restore at
   * that point.
   */
  async cancelErasure(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!isAdmin(req)) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
      const { userId } = req.params;
      await GdprService.cancelErasure(userId, { userId: req.user!.userId });
      res.json({ success: true, message: 'User erasure cancelled' });
    } catch (error) {
      logger.error('GDPR cancel-erasure failed', { error });
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          res.status(404).json({ error: 'User not found' });
          return;
        }
        if (error.message === 'User already anonymized — cannot cancel erasure') {
          res.status(409).json({ error: error.message });
          return;
        }
      }
      res.status(500).json({ error: 'Failed to cancel user erasure' });
    }
  }

  async getConsents(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const consents = await GdprService.getCurrentConsents(userId);
    res.json({ consents });
  }

  /**
   * GDPR Art. 17 — rescue erasure (ADS-87). Gated: platform admin OR
   * rescue admin / staff acting on their own rescue. Mirrors the same
   * controller-side auth pattern as eraseByAdmin so failures funnel
   * through one audited path.
   */
  async eraseRescue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { rescueId } = req.params;
      const actor = req.user!;
      const isPlatformAdmin = isAdmin(req);
      const isOwnRescue = actor.userType === UserType.RESCUE_STAFF && actor.rescueId === rescueId;

      if (!isPlatformAdmin && !isOwnRescue) {
        res.status(403).json({ error: 'You do not have permission to erase this rescue' });
        return;
      }

      const { reason } = req.body as { reason?: string };
      const result = await GdprService.eraseRescue(rescueId, {
        reason,
        actorUserId: actor.userId,
      });
      res.json({
        success: true,
        message: 'Rescue anonymised',
        summary: {
          petsArchived: result.petsArchived,
          applicationsRejected: result.applicationsRejected,
          staffDowngraded: result.staffDowngraded,
          alreadyArchived: result.alreadyArchived,
        },
      });
    } catch (error) {
      logger.error('GDPR rescue erase failed', { error });
      if (error instanceof Error && error.message === 'Rescue not found') {
        res.status(404).json({ error: 'Rescue not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to erase rescue' });
    }
  }

  async recordConsent(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { purpose, granted, policyVersion, source } = req.body as {
      purpose: ConsentPurpose;
      granted: boolean;
      policyVersion: string;
      source?: string;
    };
    const consent = await GdprService.recordConsent({
      userId,
      purpose,
      granted,
      policyVersion,
      source: source ?? null,
      ipAddress: req.ip ?? null,
    });
    res.status(201).json({ consent });
  }
}

export default new GdprController();
