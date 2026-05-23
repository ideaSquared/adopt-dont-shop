import { Router, type Response } from 'express';
import { param, validationResult } from 'express-validator';
import { ApplicationDraftUpsertRequestSchema } from '@adopt-dont-shop/lib.validation';
import { authenticateToken } from '../middleware/auth';
import applicationDraftService from '../services/application-draft.service';
import type { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

/**
 * Backend-synced application drafts. Last-write-wins; one row per
 * (user, pet). Mounted at /api/v1/applications/drafts (see index.ts) —
 * registered as its own router so the application router's
 * GET /:applicationId catch-all can't shadow GET /drafts/:petId.
 */
const router = Router();

router.use(authenticateToken);

const petIdParam = param('petId').isString().notEmpty();

router.get('/:petId', petIdParam, async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const draft = await applicationDraftService.getDraft(req.user.userId, req.params.petId);
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
    logger.error('Failed to load application draft', { error });
    return res.status(500).json({ error: 'Failed to load draft' });
  }
});

router.put('/:petId', petIdParam, async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
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
      req.user.userId,
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
    logger.error('Failed to upsert application draft', { error });
    return res.status(500).json({ error: 'Failed to save draft' });
  }
});

router.delete('/:petId', petIdParam, async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    await applicationDraftService.deleteDraft(req.user.userId, req.params.petId);
    // 204 whether or not anything was deleted — DELETE is idempotent and
    // the frontend calls this on submit without knowing if a draft exists.
    return res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete application draft', { error });
    return res.status(500).json({ error: 'Failed to delete draft' });
  }
});

export default router;
