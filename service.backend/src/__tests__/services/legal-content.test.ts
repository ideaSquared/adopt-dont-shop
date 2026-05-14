import { beforeEach, describe, it, expect, vi } from 'vitest';

// Global setup-tests.ts mocks `fs` so most tests don't accidentally
// hit the disk. The legal-content service is the rare case that
// genuinely needs filesystem reads, so we restore the real module
// before importing it.
vi.unmock('fs');

// AuditLog is the storage for ToS / Privacy / cookies acceptance (see
// consent.service.ts). ADS-550: getPendingReacceptance now walks
// CONSENT_RECORDED rows newest-first to find each document's last
// accepted version, so the test mocks `findAll` returning an array.
vi.mock('../../models/AuditLog', () => ({
  default: { findAll: vi.fn() },
  AuditLog: { findAll: vi.fn() },
  withAuditMutationAllowed: vi.fn(),
}));

import AuditLog from '../../models/AuditLog';
import {
  COOKIES_VERSION,
  getCookiesDocument,
  getPendingReacceptance,
  getPrivacyDocument,
  getTermsDocument,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '../../services/legal-content.service';

const mockFindAll = vi.mocked(AuditLog.findAll);

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

  it('returns cookies with version + markdown content', () => {
    const doc = getCookiesDocument();
    expect(doc.version).toBe(COOKIES_VERSION);
    expect(doc.contentType).toBe('text/markdown');
    expect(doc.content.length).toBeGreaterThan(0);
    expect(doc.content).toContain('Cookies Policy');
  });

  it('versions follow a date-based identifier so consent records can be replayed', () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(PRIVACY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(COOKIES_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});

describe('legal content service — getPendingReacceptance', () => {
  beforeEach(() => {
    mockFindAll.mockReset();
  });

  const buildAuditRow = (
    details: Record<string, unknown>,
    timestamp = new Date('2026-01-01T00:00:00Z')
  ) => ({
    metadata: { details },
    timestamp,
  });

  it('returns terms, privacy, and cookies as pending when the user has never recorded consent', async () => {
    mockFindAll.mockResolvedValue([]);

    const result = await getPendingReacceptance('user-without-history');

    expect(result.pending).toHaveLength(3);
    const types = result.pending.map(p => p.documentType).sort();
    expect(types).toEqual(['cookies', 'privacy', 'terms']);
    result.pending.forEach(item => {
      expect(item.lastAcceptedVersion).toBeNull();
      expect(item.lastAcceptedAt).toBeNull();
    });
  });

  it('returns an empty list when the user accepted the exact current versions for every tracked document', async () => {
    mockFindAll.mockResolvedValue([
      buildAuditRow({
        tosVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        cookiesVersion: COOKIES_VERSION,
        acceptedAt: '2026-04-01T12:00:00Z',
      })
    ]);

    const result = await getPendingReacceptance('user-up-to-date');

    expect(result.pending).toEqual([]);
  });

  it('flags only the documents whose accepted version is older than the current version', async () => {
    mockFindAll.mockResolvedValue([
      buildAuditRow({
        tosVersion: '2025-01-01-v1',
        privacyVersion: PRIVACY_VERSION,
        cookiesVersion: COOKIES_VERSION,
        acceptedAt: '2025-02-01T00:00:00Z',
      })
    ]);

    const result = await getPendingReacceptance('user-stale-tos');

    expect(result.pending).toHaveLength(1);
    expect(result.pending[0]).toEqual({
      documentType: 'terms',
      currentVersion: TERMS_VERSION,
      lastAcceptedVersion: '2025-01-01-v1',
      lastAcceptedAt: '2025-02-01T00:00:00Z',
    });
  });

  it('flags cookies as pending when the user accepted an older cookies version', async () => {
    mockFindAll.mockResolvedValue([
      buildAuditRow({
        tosVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        cookiesVersion: '2025-01-01-cookies-v1',
        acceptedAt: '2025-02-01T00:00:00Z',
      })
    ]);

    const result = await getPendingReacceptance('user-stale-cookies');

    expect(result.pending).toHaveLength(1);
    expect(result.pending[0]).toEqual({
      documentType: 'cookies',
      currentVersion: COOKIES_VERSION,
      lastAcceptedVersion: '2025-01-01-cookies-v1',
      lastAcceptedAt: '2025-02-01T00:00:00Z',
    });
  });

  it('flags cookies as pending when consent was recorded without any cookiesVersion at all', async () => {
    // Today's consent.service writes only tosVersion + privacyVersion.
    // Until that gap is closed, every existing user will surface
    // cookies as pending — this test pins that behaviour so the
    // shape is stable for the frontend modal.
    mockFindAll.mockResolvedValue([
      buildAuditRow({
        tosVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        acceptedAt: '2026-04-01T12:00:00Z',
      })
    ]);

    const result = await getPendingReacceptance('user-pre-cookies-capture');

    expect(result.pending).toHaveLength(1);
    expect(result.pending[0]).toEqual({
      documentType: 'cookies',
      currentVersion: COOKIES_VERSION,
      lastAcceptedVersion: null,
      lastAcceptedAt: null,
    });
  });

  it('falls back to the audit row timestamp when acceptedAt is missing from the details', async () => {
    const ts = new Date('2025-06-15T10:30:00Z');
    mockFindAll.mockResolvedValue([
      buildAuditRow(
        {
          tosVersion: '2025-01-01-v1',
          privacyVersion: PRIVACY_VERSION,
          cookiesVersion: COOKIES_VERSION,
        },
        ts
      )
    ]);

    const result = await getPendingReacceptance('user-no-acceptedAt');

    expect(result.pending).toHaveLength(1);
    expect(result.pending[0].lastAcceptedAt).toBe(ts.toISOString());
  });

  it('treats malformed audit metadata as no prior acceptance', async () => {
    mockFindAll.mockResolvedValue([{ metadata: 'not-an-object', timestamp: new Date() }]);

    const result = await getPendingReacceptance('user-broken-metadata');

    expect(result.pending).toHaveLength(3);
    result.pending.forEach(item => {
      expect(item.lastAcceptedVersion).toBeNull();
    });
  });
});
