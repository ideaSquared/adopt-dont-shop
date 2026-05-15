import { fetchCookiesVersion, recordCookiesConsent } from './legal-service';
import { readStoredConsent } from './cookie-consent-storage';

/**
 * ADS-497 (slice 5): replay an anonymous cookie-banner choice against
 * the user's account on first sign-in.
 *
 * The cookie banner persists the user's choice to localStorage even when
 * they're not signed in. When `auth_session_authenticated` fires for the
 * first time per `(userId, cookiesVersion)`, we POST the stored choice
 * to /api/v1/privacy/consent so the audit log captures the decision
 * against the account.
 *
 * Idempotency: a second key `legal-consent-v1:attached` records the
 * `userId,cookiesVersion` tuple last attached. Subsequent calls with the
 * same tuple are no-ops, so calling this on every rehydrate (or both
 * fresh login + rehydrate within one tab life) does not produce
 * duplicate audit rows.
 *
 * Failures are swallowed so a transient network error here cannot break
 * sign-in. The next session-authenticated event will retry the attach,
 * because the dedupe key is only written on success.
 */

const ATTACHED_STORAGE_KEY = 'legal-consent-v1:attached';

const safeReadAttachKey = (): string | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage.getItem(ATTACHED_STORAGE_KEY);
  } catch {
    return null;
  }
};

const safeWriteAttachKey = (value: string): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(ATTACHED_STORAGE_KEY, value);
  } catch {
    // localStorage unavailable; without persistence we accept that the
    // attach call may run again on the next session event. Better than
    // refusing to attach at all.
  }
};

const buildAttachKey = (userId: string, cookiesVersion: string): string =>
  `${userId}::${cookiesVersion}`;

export const attachStoredCookieConsent = async (userId: string): Promise<void> => {
  let currentCookiesVersion: string;
  try {
    currentCookiesVersion = await fetchCookiesVersion();
  } catch {
    // Backend unreachable — silently skip; the next session-auth event
    // will retry. Refusing to authenticate over a transient outage in
    // an audit-replay path would be worse.
    return;
  }
  const stored = readStoredConsent(currentCookiesVersion);
  if (!stored) {
    return;
  }
  const attachKey = buildAttachKey(userId, stored.cookiesVersion);
  if (safeReadAttachKey() === attachKey) {
    return;
  }
  try {
    // ADS-550: cookies-only path. The previous implementation called
    // `recordReacceptance` with hard-coded `tosAccepted: true,
    // privacyAccepted: true` on every first-sign-in replay, silently
    // recording ToS / Privacy re-acceptance the user never gave.
    await recordCookiesConsent({
      cookiesVersion: stored.cookiesVersion,
      analyticsConsent: stored.analyticsConsent,
    });
    safeWriteAttachKey(attachKey);
  } catch {
    // Leave the dedupe key un-set so the next session event retries.
  }
};
