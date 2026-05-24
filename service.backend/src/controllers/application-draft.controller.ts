import { type Response } from 'express';
import { validationResult } from 'express-validator';
import { ApplicationDraftUpsertRequestSchema } from '@adopt-dont-shop/lib.validation';
import { ApiError } from '../middleware/error-handler';
import applicationDraftService from '../services/application-draft.service';
import type { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

export class ApplicationDraftController {
  static async getDraft(req: AuthenticatedRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const draft = await applicationDraftService.getDraft(req.user!.userId, req.params.petId);
      if (!draft) {
        return res.status(404).json({ error: 'Draft not found' });
      }
      return res.json({
        data: {
          petId: draft.petId,
          answers: draft.answers,
          updatedAt: draft.updatedAt,
          expiresAt: draft.expiresAt,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      logger.error('Failed to load application draft', { error });
      return res.status(500).json({ error: 'Failed to load draft' });
    }
  }

  static async upsertDraft(req: AuthenticatedRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const parsed = ApplicationDraftUpsertRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        error: 'Validation Error',
        details: parsed.error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    try {
      const draft = await applicationDraftService.upsertDraft(
        req.user!.userId,
        req.params.petId,
        parsed.data.answers
      );
      return res.json({
        data: {
          petId: draft.petId,
          answers: draft.answers,
          updatedAt: draft.updatedAt,
          expiresAt: draft.expiresAt,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      logger.error('Failed to upsert application draft', { error });
      return res.status(500).json({ error: 'Failed to save draft' });
    }
  }

  static async deleteDraft(req: AuthenticatedRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      await applicationDraftService.deleteDraft(req.user!.userId, req.params.petId);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      logger.error('Failed to delete application draft', { error });
      return res.status(500).json({ error: 'Failed to delete draft' });
    }
  }
}
