import fs from 'fs';
import path from 'path';

/**
 * ADS-495 / ADS-497: legal content + version source of truth.
 *
 * Versions are owned in code (not the markdown frontmatter) so that
 * consent capture and the public legal-routes response cannot drift out
 * of sync. When a new version of either document is shipped:
 *   1. Update the literal here (and the matching version line in the
 *      markdown for human readers).
 *   2. Existing users will see the new version on next sign-in and must
 *      re-accept (re-acceptance flow tracked in ADS-497 follow-up).
 */

export const TERMS_VERSION = '2026-05-08-v1';
export const PRIVACY_VERSION = '2026-05-08-v1';

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
