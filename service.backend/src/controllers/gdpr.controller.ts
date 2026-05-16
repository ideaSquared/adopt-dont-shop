import { Response } from 'express';
import { body } from 'express-validator';
import { z } from 'zod';
import GdprService from '../services/gdpr.service';
import { ConsentPurpose } from '../models/UserConsent';
import { AuthenticatedRequest } from '../types';
import { UserType } from '../models/User';
import { logger } from '../utils/logger';
import { validateBody } from '../middleware/zod-validate';

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

const isAdmin = (req: AuthenticatedRequest): boolean => req.user?.userType === UserType.ADMIN;

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
   * GDPR Art. 17 — self-erasure. Anonymises the caller's account.
   */
  async eraseSelf(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { reason } = req.body as { reason?: string };
      await GdprService.anonymizeUser(userId, { reason, actorUserId: userId });
      res.clearCookie('authToken');
      res.json({ success: true, message: 'Account anonymised' });
    } catch (error) {
      logger.error('GDPR self-erase failed', { error });
      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to anonymise account' });
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
      await GdprService.anonymizeUser(userId, { reason, actorUserId: req.user!.userId });
      res.json({ success: true, message: 'User anonymised' });
    } catch (error) {
      logger.error('GDPR admin erase failed', { error });
      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to anonymise user' });
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
