import { Response, Router } from 'express';
import { param, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import RefreshToken from '../models/RefreshToken';
import SecurityService from '../services/security.service';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/v1/sessions
 * Return the caller's own active (non-revoked, non-expired) refresh-token
 * rows so they can review where they're signed in.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const result = await SecurityService.listSessions({ userId: req.user.userId });
    return res.json({
      data: result.sessions.map(s => ({
        sessionId: s.sessionId,
        familyId: s.familyId,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Failed to list sessions', { error });
    return res.status(500).json({ error: 'Failed to list sessions' });
  }
});

/**
 * DELETE /api/v1/sessions/:sessionId
 * Revoke a single session belonging to the caller. The ownership check is
 * load-bearing: without it a user could revoke any session by guessing the
 * id. Non-existent or other-user sessions both return 404 so we don't leak
 * the existence of an id that belongs to a different account.
 */
router.delete(
  '/:sessionId',
  [param('sessionId').isString().notEmpty().withMessage('sessionId is required')],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const row = await RefreshToken.findByPk(req.params.sessionId);
      if (!row || row.user_id !== req.user.userId) {
        return res.status(404).json({ error: 'Session not found' });
      }
      await SecurityService.revokeSession(row.token_id, req.user.userId);
      return res.status(204).send();
    } catch (error) {
      logger.error('Failed to revoke session', { error });
      return res.status(500).json({ error: 'Failed to revoke session' });
    }
  }
);

export default router;
