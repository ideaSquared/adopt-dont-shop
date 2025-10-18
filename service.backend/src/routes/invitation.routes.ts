import { Router } from 'express';
import { body, param } from 'express-validator';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { InvitationService } from '../services/invitation.service';
import { logger } from '../utils/logger';

const router = Router();

// Accept invitation (public route - no authentication required)
router.post(
  '/accept',
  [
    body('token').notEmpty().withMessage('Invitation token is required'),
    body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required (1-50 characters)'),
    body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required (1-50 characters)'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('title').optional().trim().isLength({ max: 100 }).withMessage('Title must be max 100 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { token, firstName, lastName, password, title } = req.body;

      const result = await InvitationService.acceptInvitation(
        token,
        {
          firstName,
          lastName,
          password,
          title
        }
      );

      res.status(201).json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error accepting invitation:', { error: errorMessage, token: req.body.token });

      if (errorMessage.includes('not found') || errorMessage.includes('expired')) {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      if (errorMessage.includes('already been used')) {
        return res.status(409).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to accept invitation',
        error: errorMessage,
      });
    }
  }
);

// Get invitation details (public route for form pre-population)
router.get(
  '/details/:token',
  [
    param('token').notEmpty().withMessage('Invitation token is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { token } = req.params;

      // Get invitation details without sensitive information
      const invitation = await InvitationService.getInvitationDetails(token);

      if (!invitation) {
        return res.status(404).json({
          success: false,
          message: 'Invitation not found or expired',
        });
      }

      res.json({
        success: true,
        invitation: {
          email: invitation.email,
          expiresAt: invitation.expiration
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting invitation details:', { error: errorMessage, token: req.params.token });

      res.status(500).json({
        success: false,
        message: 'Failed to get invitation details',
        error: errorMessage,
      });
    }
  }
);

export default router;
