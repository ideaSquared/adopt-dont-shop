import { Response } from 'express';
import { sendValidationErrors } from '../middleware/validation';
import RefreshToken from '../models/RefreshToken';
import SecurityService from '../services/security.service';
import { AuthenticatedRequest } from '../types/auth';

export class SessionController {
  static async listSessions(req: AuthenticatedRequest, res: Response) {
    const result = await SecurityService.listSessions({ userId: req.user!.userId });
    return res.json({
      data: result.sessions.map(s => ({
        sessionId: s.sessionId,
        familyId: s.familyId,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
      })),
    });
  }

  static async revokeSession(req: AuthenticatedRequest, res: Response) {
    if (sendValidationErrors(req, res)) {
      return;
    }

    const row = await RefreshToken.findByPk(req.params.sessionId);
    if (!row || row.user_id !== req.user!.userId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    await SecurityService.revokeSession(row.token_id, req.user!.userId);
    return res.status(204).send();
  }
}
