import { Router, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/zod-validate';
import {
  ConsentInputSchema,
  CookiesConsentInputSchema,
  recordConsent,
  recordCookiesConsent,
  type ConsentInput,
  type CookiesConsentInput,
} from '../services/consent.service';
import { exportUserData } from '../services/data-export.service';
import { requestAccountDeletion } from '../services/data-deletion.service';
import type { AuthenticatedRequest } from '../types/auth';

/**
 * ADS-427 / ADS-496 / ADS-497: user-facing privacy endpoints.
 *
 *   POST /api/v1/privacy/consent       — record ToS/Privacy/marketing
 *                                        consent for the authenticated
 *                                        user (ADS-496/497).
 *   GET  /api/v1/privacy/me/export     — JSON archive of user-owned
 *                                        rows (GDPR Art. 20).
 *   POST /api/v1/privacy/me/delete     — soft-delete + revoke sessions;
 *                                        retention job hard-anonymises
 *                                        after the grace window
 *                                        (GDPR Art. 17).
 *
 * All routes require authentication. The deletion endpoint is POST —
 * rather than DELETE on a /me sub-resource — because it triggers a
 * background workflow rather than removing one resource.
 */

const router = Router();

router.use(authenticateToken);

router.post(
  '/consent',
  validateBody(ConsentInputSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const record = await recordConsent(req.body as ConsentInput, {
      userId,
      ip: req.ip ?? null,
      userAgent: req.get('User-Agent') ?? null,
    });
    res.status(201).json({ data: record });
  }
);

/**
 * ADS-550: cookies-only consent. Separate from /consent so the audit
 * row written by the on-page cookie banner does NOT carry the
 * currently-published ToS / Privacy versions (which would silently
 * consume any pending re-acceptance for those documents).
 */
router.post(
  '/cookies-consent',
  validateBody(CookiesConsentInputSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const record = await recordCookiesConsent(req.body as CookiesConsentInput, {
      userId,
      ip: req.ip ?? null,
      userAgent: req.get('User-Agent') ?? null,
    });
    res.status(201).json({ data: record });
  }
);

router.get('/me/export', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const bundle = await exportUserData(userId);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="adopt-dont-shop-export-${userId}.json"`
  );
  res.json(bundle);
});

const DeleteAccountSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

router.post(
  '/me/delete',
  validateBody(DeleteAccountSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const body = req.body as z.infer<typeof DeleteAccountSchema>;
    const result = await requestAccountDeletion(userId, body.reason);
    // Clear auth cookies so the now-deactivated session can't keep
    // making requests until access-token expiry.
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    res.status(202).json({
      data: {
        ...result,
        message:
          'Account scheduled for deletion. Your data will be permanently anonymised after a 30-day grace window.',
      },
    });
  }
);

export default router;
