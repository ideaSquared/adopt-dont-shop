import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import AuditLog from '../models/AuditLog';

/**
 * ADS-495 / ADS-497: legal content + version source of truth.
 *
 * Versions are owned in code (not the markdown frontmatter) so that
 * consent capture and the public legal-routes response cannot drift out
 * of sync. When a new version of either document is shipped:
 *   1. Update the literal here (and the matching version line in the
 *      markdown for human readers).
 *   2. Existing users will see the new version on next sign-in and must
 *      re-accept — the detection side of that flow is
 *      `getPendingReacceptance` below; the user-facing modal and any
 *      email notification are tracked in follow-up ADS-497 slices.
 */

export const TERMS_VERSION = '2026-05-08-v1';
export const PRIVACY_VERSION = '2026-05-08-v1';
// The `-PLACEHOLDER` suffix is intentional and load-bearing: any cookies
// row surfaced by `getPendingReacceptance` (or written into an audit log)
// is obviously not-yet-legally-reviewed. Replace this constant — and the
// version line in `docs/legal/cookies.md` — when the real cookies policy
// lands.
export const COOKIES_VERSION = '2026-05-09-v0-PLACEHOLDER';

const DOCS_DIR = path.resolve(__dirname, '..', '..', '..', 'docs', 'legal');

const readMarkdown = (filename: string): string => {
  const filePath = path.join(DOCS_DIR, filename);
  // Synchronous read — these are tiny static files loaded once per
  // request. Caching is not worth the invalidation surface area.
  return fs.readFileSync(filePath, 'utf8');
};

export type LegalDocument = {
  version: string;
  contentType: 'text/markdown';
  content: string;
};

export const getTermsDocument = (): LegalDocument => ({
  version: TERMS_VERSION,
  contentType: 'text/markdown',
  content: readMarkdown('terms.md'),
});

export const getPrivacyDocument = (): LegalDocument => ({
  version: PRIVACY_VERSION,
  contentType: 'text/markdown',
  content: readMarkdown('privacy.md'),
});

export const getCookiesDocument = (): LegalDocument => ({
  version: COOKIES_VERSION,
  contentType: 'text/markdown',
  content: readMarkdown('cookies.md'),
});

/**
 * ADS-497 (slice 1): pending re-acceptance detection.
 *
 * Looks at the user's most recent `CONSENT_RECORDED` audit log row and
 * compares the recorded ToS / Privacy version strings to the currently
 * published versions. Any document whose current version differs from
 * the user's last accepted version (or where the user has never
 * accepted) is returned as pending.
 *
 * Returning a list (not a boolean) keeps the response useful when more
 * document types are added — the frontend modal can render one section
 * per pending doc.
 *
 * Notes:
 *   - `terms`, `privacy`, and `cookies` are tracked. The cookies copy
 *     and version are currently a clearly-marked placeholder
 *     (`COOKIES_VERSION` ends in `-PLACEHOLDER`) and the consent service
 *     does not yet capture a `cookiesVersion`, so until both land
 *     `getPendingReacceptance` will always return `cookies` as pending
 *     for every user. That is intentional for the wiring slice and
 *     should be addressed before the cookies type is shown in the
 *     re-acceptance modal.
 *   - Consent capture writes to `audit_logs` (see
 *     `consent.service.ts`), so this read also goes there. Migrating
 *     to a dedicated consent-acceptance table is a separate decision.
 */

export type LegalDocumentType = 'terms' | 'privacy' | 'cookies';

const PendingReacceptanceItemSchema = z.object({
  documentType: z.enum(['terms', 'privacy', 'cookies']),
  currentVersion: z.string(),
  lastAcceptedVersion: z.string().nullable(),
  lastAcceptedAt: z.string().nullable(),
});

export const PendingReacceptanceSchema = z.object({
  pending: z.array(PendingReacceptanceItemSchema),
});

export type PendingReacceptanceItem = z.infer<typeof PendingReacceptanceItemSchema>;
export type PendingReacceptance = z.infer<typeof PendingReacceptanceSchema>;

const ConsentDetailsSchema = z.object({
  tosVersion: z.string().optional(),
  privacyVersion: z.string().optional(),
  // Forward-compatible: consent.service does not write this field today,
  // so it will always be undefined and the cookies row will surface as
  // pending. Once consent capture starts persisting it, this read picks
  // it up automatically.
  cookiesVersion: z.string().optional(),
  acceptedAt: z.string().optional(),
});

const extractConsentDetails = (metadata: unknown): z.infer<typeof ConsentDetailsSchema> => {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  const details = (metadata as { details?: unknown }).details;
  const parsed = ConsentDetailsSchema.safeParse(details);
  return parsed.success ? parsed.data : {};
};

export const getPendingReacceptance = async (userId: string): Promise<PendingReacceptance> => {
  const latest = await AuditLog.findOne({
    where: { user: userId, action: 'CONSENT_RECORDED' },
    order: [['timestamp', 'DESC']],
  });

  const details = latest ? extractConsentDetails(latest.metadata) : {};
  const lastAcceptedAt = details.acceptedAt ?? latest?.timestamp?.toISOString() ?? null;

  const candidates: ReadonlyArray<{
    documentType: LegalDocumentType;
    currentVersion: string;
    lastAcceptedVersion: string | null;
  }> = [
    {
      documentType: 'terms',
      currentVersion: TERMS_VERSION,
      lastAcceptedVersion: details.tosVersion ?? null,
    },
    {
      documentType: 'privacy',
      currentVersion: PRIVACY_VERSION,
      lastAcceptedVersion: details.privacyVersion ?? null,
    },
    {
      documentType: 'cookies',
      currentVersion: COOKIES_VERSION,
      lastAcceptedVersion: details.cookiesVersion ?? null,
    },
  ];

  const pending = candidates
    .filter(c => c.lastAcceptedVersion !== c.currentVersion)
    .map(c => ({
      documentType: c.documentType,
      currentVersion: c.currentVersion,
      lastAcceptedVersion: c.lastAcceptedVersion,
      lastAcceptedAt: c.lastAcceptedVersion ? lastAcceptedAt : null,
    }));

  return { pending };
};
