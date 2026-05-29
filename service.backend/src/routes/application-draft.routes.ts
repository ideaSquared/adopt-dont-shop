import { Router, type Response } from 'express';
import { param } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { ApplicationDraftController } from '../controllers/application-draft.controller';
import type { AuthenticatedRequest } from '../types/auth';

const router = Router();

router.use(authenticateToken);

const petIdParam = param('petId').isString().notEmpty();

router.get('/:petId', petIdParam, (req: AuthenticatedRequest, res: Response) =>
  ApplicationDraftController.getDraft(req, res)
);

router.put('/:petId', petIdParam, (req: AuthenticatedRequest, res: Response) =>
  ApplicationDraftController.upsertDraft(req, res)
);

router.delete('/:petId', petIdParam, (req: AuthenticatedRequest, res: Response) =>
  ApplicationDraftController.deleteDraft(req, res)
);

export default router;
