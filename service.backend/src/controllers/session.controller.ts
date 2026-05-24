import { Response } from 'express';
import { validationResult } from 'express-validator';
import RefreshToken from '../models/RefreshToken';
import SecurityService from '../services/security.service';
import { ApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

export class SessionController {
  static async listSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await SecurityService.listSessions({ userId: req.user!.userId });
      return res.json({
        data: result.sessions.map(s => ({
          sessionId: s.sessionId,
          familyId: s.familyId,
          expiresAt: s.expiresAt,
          createdAt: s.createdAt,
        })),
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      logger.error('Failed to list sessions', { error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async revokeSession(req: AuthenticatedRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const row = await RefreshToken.findByPk(req.params.sessionId);
      if (!row || row.user_id !== req.user!.userId) {
        return res.status(404).json({ error: 'Session not found' });
      }
      await SecurityService.revokeSession(row.token_id, req.user!.userId);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      logger.error('Failed to revoke session', { error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
