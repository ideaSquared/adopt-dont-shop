import { Router } from 'express';
import { param } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { SessionController } from '../controllers/session.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', SessionController.listSessions);

router.delete(
  '/:sessionId',
  [param('sessionId').isString().notEmpty().withMessage('sessionId is required')],
  SessionController.revokeSession
);

export default router;
