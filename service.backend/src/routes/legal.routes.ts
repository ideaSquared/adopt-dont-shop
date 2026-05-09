import { Response, Router } from 'express';
import {
  getPendingReacceptance,
  getPrivacyDocument,
  getTermsDocument,
} from '../services/legal-content.service';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/api';
import { logger } from '../utils/logger';

/**
 * ADS-495: public legal endpoints for /terms and /privacy.
 *
 * Returns the current version + markdown content as JSON so the React
 * apps can render a Privacy Policy / Terms of Service page from a
 * single source of truth. The `version` field is the canonical
 * identifier persisted at consent capture (ADS-497).
 *
 * Public — no authentication. Rate limiting is provided by the global
 * `apiLimiter` mount on `/api`.
 */

const router = Router();

router.get('/terms', (_req, res) => {
  try {
    const doc = getTermsDocument();
    res.json({ data: doc });
  } catch (error) {
    logger.error('Failed to read terms document', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to load terms' });
  }
});

router.get('/privacy', (_req, res) => {
  try {
    const doc = getPrivacyDocument();
    res.json({ data: doc });
  } catch (error) {
    logger.error('Failed to read privacy document', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Failed to load privacy policy' });
  }
});

/**
 * ADS-497 (slice 1): which legal documents does this user need to
 * re-accept because the published version is newer than the version
 * they last accepted? Returns an empty `pending` array when the user
 * is fully up to date. Authenticated — anonymous callers can't have
 * pending re-acceptance.
 */
router.get(
  '/pending-reacceptance',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      // authenticateToken already 401s when no token is present, but
      // be defensive in case middleware ever changes shape.
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const result = await getPendingReacceptance(userId);
      res.json(result);
    } catch (error) {
      logger.error('Failed to compute pending re-acceptance', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Failed to load pending re-acceptance' });
    }
  }
);

export default router;
