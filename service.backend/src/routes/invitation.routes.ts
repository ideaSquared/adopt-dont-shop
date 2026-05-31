import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { sensitiveWriteLimiter } from '../middleware/rate-limiter';
import { auditRoute } from '../middleware/audit-route';
import { InvitationController } from '../controllers/invitation.controller';

const router = Router();

router.post(
  '/accept',
  sensitiveWriteLimiter,
  auditRoute({
    action: 'INVITATION_ACCEPTED',
    entity: 'Invitation',
    // Token is the invitation handle; controller doesn't echo it back, so
    // resolve it from the request body. Email is captured for forensics.
    entityIdFrom: 'body.token',
    metadataFrom: ['body.firstName', 'body.lastName'],
  }),
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
