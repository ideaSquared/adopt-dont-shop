import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIE_CONSENT_STORAGE_KEY } from './cookie-consent-storage';

const CURRENT_VERSION = '2026-05-09-v1';

const fetchCookiesVersionMock = vi.fn();
const recordCookiesConsentMock = vi.fn();

vi.mock('./legal-service', () => ({
  fetchCookiesVersion: () => fetchCookiesVersionMock(),
  recordCookiesConsent: (input: unknown) => recordCookiesConsentMock(input),
  // Round out the partial mock so other importers stay safe.
  fetchPendingReacceptance: vi.fn(),
}));

import { attachStoredCookieConsent } from './attach-stored-consent';

const ATTACHED_MAP_KEY = 'legal-consent-v1:attached-map';

const readAttachedMap = (): Record<string, string> => {
  const raw = window.localStorage.getItem(ATTACHED_MAP_KEY);
  if (!raw) {
    return {};
  }
  return JSON.parse(raw) as Record<string, string>;
};

describe('attachStoredCookieConsent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchCookiesVersionMock.mockReset();
    recordCookiesConsentMock.mockReset();
    fetchCookiesVersionMock.mockResolvedValue(CURRENT_VERSION);
    recordCookiesConsentMock.mockResolvedValue(undefined);
  });

  const storeConsent = (analyticsConsent: boolean): void => {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({
        cookiesVersion: CURRENT_VERSION,
        analyticsConsent,
        acceptedAt: '2026-05-10T09:00:00.000Z',
      })
    );
  };

  it('does nothing when no anonymous choice is stored', async () => {
    await attachStoredCookieConsent('user-1');

    expect(recordCookiesConsentMock).not.toHaveBeenCalled();
  });

  it('does nothing when the stored choice is for an older cookies version', async () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({
        cookiesVersion: '2025-01-01-old',
        analyticsConsent: true,
        acceptedAt: '2025-01-02T00:00:00.000Z',
      })
    );

    await attachStoredCookieConsent('user-1');

    expect(recordCookiesConsentMock).not.toHaveBeenCalled();
  });

  it('replays the stored choice to the consent endpoint on first attach', async () => {
    storeConsent(true);

    await attachStoredCookieConsent('user-1');

    expect(recordCookiesConsentMock).toHaveBeenCalledTimes(1);
    // ADS-550: the payload must NOT carry tosAccepted/privacyAccepted —
    // the dedicated cookies-consent endpoint is the only consent path
    // that doesn't represent explicit ToS/Privacy action.
    expect(recordCookiesConsentMock).toHaveBeenCalledWith({
      cookiesVersion: CURRENT_VERSION,
      analyticsConsent: true,
    });
  });

  it('is idempotent for the same userId + cookiesVersion (no duplicate audit row)', async () => {
    storeConsent(false);

    await attachStoredCookieConsent('user-1');
    await attachStoredCookieConsent('user-1');
    await attachStoredCookieConsent('user-1');

    expect(recordCookiesConsentMock).toHaveBeenCalledTimes(1);
    expect(readAttachedMap()).toEqual({ 'user-1': CURRENT_VERSION });
  });

  it('attaches once per userId — a different userId on the same browser still gets one call', async () => {
    storeConsent(true);

    await attachStoredCookieConsent('user-1');
    await attachStoredCookieConsent('user-2');

    expect(recordCookiesConsentMock).toHaveBeenCalledTimes(2);
    expect(readAttachedMap()).toEqual({
      'user-1': CURRENT_VERSION,
      'user-2': CURRENT_VERSION,
    });
  });

  it('does NOT re-attach when alternating between users (ADS-555)', async () => {
    // The pre-ADS-555 implementation kept a single tuple, so signing in
    // as A → B → A logged a duplicate audit row for A on the second
    // visit. The map keeps a per-user entry so subsequent sign-ins for
    // the same (user, version) pair are no-ops.
    storeConsent(true);

    await attachStoredCookieConsent('user-A');
    // simulate logout
    await attachStoredCookieConsent('user-B');
    // simulate logout
    await attachStoredCookieConsent('user-A');
    // simulate logout
    await attachStoredCookieConsent('user-A');

    expect(recordCookiesConsentMock).toHaveBeenCalledTimes(2);
    expect(readAttachedMap()).toEqual({
      'user-A': CURRENT_VERSION,
      'user-B': CURRENT_VERSION,
    });
  });

  it('caps the attached map at 10 user IDs and evicts the oldest entry', async () => {
    storeConsent(true);

    // Fill 10 users + 1 more to force eviction.
    for (let i = 0; i < 11; i += 1) {
      await attachStoredCookieConsent(`user-${i}`);
    }

    const map = readAttachedMap();
    expect(Object.keys(map)).toHaveLength(10);
    // The first inserted user-0 is the LRU; it should be the one evicted.
    expect(map['user-0']).toBeUndefined();
    expect(map['user-10']).toBe(CURRENT_VERSION);
  });

  it('retries on the next call when the previous attach failed (no dedupe entry written)', async () => {
    storeConsent(true);
    recordCookiesConsentMock.mockRejectedValueOnce(new Error('network'));

    await attachStoredCookieConsent('user-1');
    expect(window.localStorage.getItem(ATTACHED_MAP_KEY)).toBeNull();

    recordCookiesConsentMock.mockResolvedValueOnce(undefined);
    await attachStoredCookieConsent('user-1');

    expect(recordCookiesConsentMock).toHaveBeenCalledTimes(2);
    expect(readAttachedMap()).toEqual({ 'user-1': CURRENT_VERSION });
  });

  it('skips silently when fetching the cookies version fails', async () => {
    storeConsent(true);
    fetchCookiesVersionMock.mockRejectedValue(new Error('backend down'));

    await attachStoredCookieConsent('user-1');

    expect(recordCookiesConsentMock).not.toHaveBeenCalled();
  });
});
