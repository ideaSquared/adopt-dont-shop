import { Router } from 'express';
import { getPrivacyDocument, getTermsDocument } from '../services/legal-content.service';
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

export default router;
