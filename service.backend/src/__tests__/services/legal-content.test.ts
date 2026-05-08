import { describe, it, expect, vi } from 'vitest';

// Global setup-tests.ts mocks `fs` so most tests don't accidentally
// hit the disk. The legal-content service is the rare case that
// genuinely needs filesystem reads, so we restore the real module
// before importing it.
vi.unmock('fs');

import {
  getPrivacyDocument,
  getTermsDocument,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '../../services/legal-content.service';

describe('legal content service', () => {
  it('returns terms with version + markdown content', () => {
    const doc = getTermsDocument();
    expect(doc.version).toBe(TERMS_VERSION);
    expect(doc.contentType).toBe('text/markdown');
    expect(doc.content.length).toBeGreaterThan(0);
    expect(doc.content).toContain('Terms of Service');
  });

  it('returns privacy with version + markdown content', () => {
    const doc = getPrivacyDocument();
    expect(doc.version).toBe(PRIVACY_VERSION);
    expect(doc.contentType).toBe('text/markdown');
    expect(doc.content.length).toBeGreaterThan(0);
    expect(doc.content).toContain('Privacy Policy');
  });

  it('versions follow a date-based identifier so consent records can be replayed', () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(PRIVACY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});
