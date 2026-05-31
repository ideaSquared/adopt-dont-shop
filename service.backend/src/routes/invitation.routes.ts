import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { sensitiveWriteLimiter } from '../middleware/rate-limiter';
import { InvitationController } from '../controllers/invitation.controller';

// NOTE: audit is intentionally NOT applied at the route layer here.
// invitation.service runs each mutation inside a Sequelize transaction and
// audit is paired with the business write transactionally — see the
// AuditLogService.log({..., transaction}) calls in invitation.service.ts.
// Adding auditRoute() here would double-write and break the atomicity
// guarantee (route-level audit fires after res.finish, outside the tx).

const router = Router();

router.post(
  '/accept',
  sensitiveWriteLimiter,
  [
    body('token').notEmpty().withMessage('Invitation token is required'),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name is required (1-50 characters)'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name is required (1-50 characters)'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Title must be max 100 characters'),
  ],
  (req: Request, res: Response) => InvitationController.acceptInvitation(req, res)
);

router.get(
  '/details/:token',
  [param('token').notEmpty().withMessage('Invitation token is required')],
  (req: Request, res: Response) => InvitationController.getDetails(req, res)
);

export default router;
