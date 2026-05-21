import { Router, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody } from '../middleware/zod-validate';
import { UserType } from '../models/User';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_OPTIONS,
} from '../controllers/auth.controller';
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
    // making requests until access-token expiry. Pass the same options
    // used when setting the cookies — without them the Set-Cookie
    // expiry header doesn't match and the browser ignores the clear.
    res.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE_OPTIONS);
    res.clearCookie(ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.status(202).json({
      data: {
        ...result,
        message:
          'Account scheduled for deletion. Your data will be permanently anonymised after a 30-day grace window.',
      },
    });
  }
);

/**
 * Admin-scoped GDPR tooling. Allows platform admins to trigger data
 * exports and deletion requests on behalf of users (e.g. responding to
 * subject access requests received via support channels). Mounted on
 * the same router so the parent `authenticateToken` middleware applies;
 * `requireRole(...)` below restricts to admin/super_admin only.
 */
const requireAdminOrSuperAdmin = requireRole(UserType.ADMIN, UserType.SUPER_ADMIN);

const AdminUserIdParamSchema = z.object({ userId: z.string().min(1) });

router.get(
  '/admin/users/:userId/export',
  requireAdminOrSuperAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = AdminUserIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid userId' });
      return;
    }
    // ADS-605: thread the acting admin through so the audit row records
    // the admin's userId, not the data subject's.
    const actor = req.user ? { userId: req.user.userId, userType: req.user.userType } : undefined;
    const bundle = await exportUserData(parsed.data.userId, actor);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="adopt-dont-shop-export-${parsed.data.userId}.json"`
    );
    res.json(bundle);
  }
);

const AdminDeleteSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

router.post(
  '/admin/users/:userId/delete-request',
  requireAdminOrSuperAdmin,
  validateBody(AdminDeleteSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = AdminUserIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid userId' });
      return;
    }
    const body = req.body as z.infer<typeof AdminDeleteSchema>;
    // ADS-605: thread the acting admin through so a second audit row
    // attributed to the admin is written alongside the subject-scoped
    // GDPR_DELETE_REQUESTED entry.
    const actor = req.user ? { userId: req.user.userId, userType: req.user.userType } : undefined;
    const result = await requestAccountDeletion(parsed.data.userId, body.reason, actor);
    res.status(202).json({
      data: {
        ...result,
        message:
          'Account scheduled for deletion. Data will be anonymised after the 30-day grace window.',
      },
    });
  }
);

export default router;
