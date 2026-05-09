import { beforeEach, describe, it, expect, vi } from 'vitest';

// Global setup-tests.ts mocks `fs` so most tests don't accidentally
// hit the disk. The legal-content service is the rare case that
// genuinely needs filesystem reads, so we restore the real module
// before importing it.
vi.unmock('fs');

// AuditLog is the storage for ToS / Privacy acceptance (see
// consent.service.ts). The pending-re-acceptance behaviour is purely
// derived from the latest CONSENT_RECORDED row, so a mocked findOne
// is sufficient and keeps the test free of DB setup.
vi.mock('../../models/AuditLog', () => ({
  default: { findOne: vi.fn() },
  AuditLog: { findOne: vi.fn() },
  withAuditMutationAllowed: vi.fn(),
}));

import AuditLog from '../../models/AuditLog';
import {
  getPendingReacceptance,
  getPrivacyDocument,
  getTermsDocument,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '../../services/legal-content.service';

const mockFindOne = vi.mocked(AuditLog.findOne);

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

describe('legal content service — getPendingReacceptance', () => {
  beforeEach(() => {
    mockFindOne.mockReset();
  });

  const buildAuditRow = (
    details: Record<string, unknown>,
    timestamp = new Date('2026-01-01T00:00:00Z')
  ) => ({
    metadata: { details },
    timestamp,
  });

  it('returns both terms and privacy as pending when the user has never recorded consent', async () => {
    mockFindOne.mockResolvedValue(null);

    const result = await getPendingReacceptance('user-without-history');

    expect(result.pending).toHaveLength(2);
    const types = result.pending.map(p => p.documentType).sort();
    expect(types).toEqual(['privacy', 'terms']);
    result.pending.forEach(item => {
      expect(item.lastAcceptedVersion).toBeNull();
      expect(item.lastAcceptedAt).toBeNull();
    });
  });

  it('returns an empty list when the user accepted the exact current versions', async () => {
    mockFindOne.mockResolvedValue(
      buildAuditRow({
        tosVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        acceptedAt: '2026-04-01T12:00:00Z',
      })
    );

    const result = await getPendingReacceptance('user-up-to-date');

    expect(result.pending).toEqual([]);
  });

  it('flags only the documents whose accepted version is older than the current version', async () => {
    mockFindOne.mockResolvedValue(
      buildAuditRow({
        tosVersion: '2025-01-01-v1',
        privacyVersion: PRIVACY_VERSION,
        acceptedAt: '2025-02-01T00:00:00Z',
      })
    );

    const result = await getPendingReacceptance('user-stale-tos');

    expect(result.pending).toHaveLength(1);
    expect(result.pending[0]).toEqual({
      documentType: 'terms',
      currentVersion: TERMS_VERSION,
      lastAcceptedVersion: '2025-01-01-v1',
      lastAcceptedAt: '2025-02-01T00:00:00Z',
    });
  });

  it('falls back to the audit row timestamp when acceptedAt is missing from the details', async () => {
    const ts = new Date('2025-06-15T10:30:00Z');
    mockFindOne.mockResolvedValue(
      buildAuditRow(
        {
          tosVersion: '2025-01-01-v1',
          privacyVersion: PRIVACY_VERSION,
        },
        ts
      )
    );

    const result = await getPendingReacceptance('user-no-acceptedAt');

    expect(result.pending).toHaveLength(1);
    expect(result.pending[0].lastAcceptedAt).toBe(ts.toISOString());
  });

  it('treats malformed audit metadata as no prior acceptance', async () => {
    mockFindOne.mockResolvedValue({ metadata: 'not-an-object', timestamp: new Date() });

    const result = await getPendingReacceptance('user-broken-metadata');

    expect(result.pending).toHaveLength(2);
    result.pending.forEach(item => {
      expect(item.lastAcceptedVersion).toBeNull();
    });
  });
});
