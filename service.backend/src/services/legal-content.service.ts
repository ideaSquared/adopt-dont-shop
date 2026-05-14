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

export const TERMS_VERSION = '2026-05-10-v1';
export const PRIVACY_VERSION = '2026-05-10-v1';
export const COOKIES_VERSION = '2026-05-10-v1';

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
 *   - `terms`, `privacy`, and `cookies` are tracked. The consent
 *     service does not yet capture a `cookiesVersion`, so until that
 *     gap is closed `getPendingReacceptance` will always return
 *     `cookies` as pending for every existing user. That is
 *     intentional for this slice and is tracked as a follow-up to be
 *     addressed before the cookies type is shown in the re-acceptance
 *     modal.
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

/**
 * ADS-550: walk audit rows newest-first and pick up each document's last
 * accepted version from the most recent row that actually carried it.
 *
 * The previous "only look at the latest row" implementation broke when
 * the cookie banner started writing CONSENT_RECORDED rows alongside the
 * registration / re-acceptance-modal rows: a cookies-only audit would
 * silently consume any pending ToS or Privacy re-acceptance because the
 * latest row's `tosVersion` was stamped with the currently-published
 * value even though the user never saw the modal.
 *
 * After the fix the cookies-only path no longer writes `tosVersion` /
 * `privacyVersion`, so we just need to read each field from whichever
 * row last contained it.
 */
const findLatestVersions = (
  rows: ReadonlyArray<{ metadata: unknown; timestamp: Date | null }>
): {
  tosVersion: string | null;
  privacyVersion: string | null;
  cookiesVersion: string | null;
  tosAt: Date | null;
  privacyAt: Date | null;
  cookiesAt: Date | null;
} => {
  let tosVersion: string | null = null;
  let privacyVersion: string | null = null;
  let cookiesVersion: string | null = null;
  let tosAt: Date | null = null;
  let privacyAt: Date | null = null;
  let cookiesAt: Date | null = null;

  for (const row of rows) {
    const details = extractConsentDetails(row.metadata);
    if (tosVersion === null && details.tosVersion) {
      tosVersion = details.tosVersion;
      tosAt = row.timestamp;
    }
    if (privacyVersion === null && details.privacyVersion) {
      privacyVersion = details.privacyVersion;
      privacyAt = row.timestamp;
    }
    if (cookiesVersion === null && details.cookiesVersion) {
      cookiesVersion = details.cookiesVersion;
      cookiesAt = row.timestamp;
    }
    if (tosVersion && privacyVersion && cookiesVersion) {
      break;
    }
  }

  return { tosVersion, privacyVersion, cookiesVersion, tosAt, privacyAt, cookiesAt };
};

export const getPendingReacceptance = async (userId: string): Promise<PendingReacceptance> => {
  const rows = await AuditLog.findAll({
    where: { user: userId, action: 'CONSENT_RECORDED' },
    order: [['timestamp', 'DESC']],
    attributes: ['metadata', 'timestamp'],
  });

  const versions = findLatestVersions(rows);

  const candidates: ReadonlyArray<{
    documentType: LegalDocumentType;
    currentVersion: string;
    lastAcceptedVersion: string | null;
    lastAcceptedAt: Date | null;
  }> = [
    {
      documentType: 'terms',
      currentVersion: TERMS_VERSION,
      lastAcceptedVersion: versions.tosVersion,
      lastAcceptedAt: versions.tosAt,
    },
    {
      documentType: 'privacy',
      currentVersion: PRIVACY_VERSION,
      lastAcceptedVersion: versions.privacyVersion,
      lastAcceptedAt: versions.privacyAt,
    },
    {
      documentType: 'cookies',
      currentVersion: COOKIES_VERSION,
      lastAcceptedVersion: versions.cookiesVersion,
      lastAcceptedAt: versions.cookiesAt,
    },
  ];

  const pending = candidates
    .filter(c => c.lastAcceptedVersion !== c.currentVersion)
    .map(c => ({
      documentType: c.documentType,
      currentVersion: c.currentVersion,
      lastAcceptedVersion: c.lastAcceptedVersion,
      lastAcceptedAt: c.lastAcceptedVersion ? (c.lastAcceptedAt?.toISOString() ?? null) : null,
    }));

  return { pending };
};
