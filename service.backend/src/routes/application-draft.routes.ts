import { Router, type Response } from 'express';
import { param } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { auditRoute } from '../middleware/audit-route';
import { ApplicationDraftController } from '../controllers/application-draft.controller';
import type { AuthenticatedRequest } from '../types/auth';

const router = Router();

router.use(authenticateToken);

const petIdParam = param('petId').isString().notEmpty();

router.get('/:petId', petIdParam, (req: AuthenticatedRequest, res: Response) =>
  ApplicationDraftController.getDraft(req, res)
);

router.put(
  '/:petId',
  petIdParam,
  auditRoute({
    action: 'APPLICATION_DRAFT_UPSERTED',
    entity: 'ApplicationDraft',
    entityIdFrom: 'params.petId',
  }),
  (req: AuthenticatedRequest, res: Response) => ApplicationDraftController.upsertDraft(req, res)
);

router.delete(
  '/:petId',
  petIdParam,
  auditRoute({
    action: 'APPLICATION_DRAFT_DELETED',
    entity: 'ApplicationDraft',
    entityIdFrom: 'params.petId',
  }),
  (req: AuthenticatedRequest, res: Response) => ApplicationDraftController.deleteDraft(req, res)
);

export default router;
