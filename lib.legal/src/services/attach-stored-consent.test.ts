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

const ATTACHED_KEY = 'legal-consent-v1:attached';

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
    expect(window.localStorage.getItem(ATTACHED_KEY)).toBe(`user-1::${CURRENT_VERSION}`);
  });

  it('attaches once per userId — a different userId on the same browser still gets one call', async () => {
    storeConsent(true);

    await attachStoredCookieConsent('user-1');
    await attachStoredCookieConsent('user-2');

    expect(recordCookiesConsentMock).toHaveBeenCalledTimes(2);
    expect(window.localStorage.getItem(ATTACHED_KEY)).toBe(`user-2::${CURRENT_VERSION}`);
  });

  it('retries on the next call when the previous attach failed (no dedupe key written)', async () => {
    storeConsent(true);
    recordCookiesConsentMock.mockRejectedValueOnce(new Error('network'));

    await attachStoredCookieConsent('user-1');
    expect(window.localStorage.getItem(ATTACHED_KEY)).toBeNull();

    recordCookiesConsentMock.mockResolvedValueOnce(undefined);
    await attachStoredCookieConsent('user-1');

    expect(recordCookiesConsentMock).toHaveBeenCalledTimes(2);
    expect(window.localStorage.getItem(ATTACHED_KEY)).toBe(`user-1::${CURRENT_VERSION}`);
  });

  it('skips silently when fetching the cookies version fails', async () => {
    storeConsent(true);
    fetchCookiesVersionMock.mockRejectedValue(new Error('backend down'));

    await attachStoredCookieConsent('user-1');

    expect(recordCookiesConsentMock).not.toHaveBeenCalled();
  });
});
