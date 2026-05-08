/**
 * Minimal analytics consent gate. Persists a boolean in localStorage so
 * Statsig session-replay / auto-capture / web-vitals reporting can be
 * gated behind explicit opt-in (PECR / GDPR).
 *
 * The full consent banner UI is intentionally out of scope here — this
 * module just provides the storage primitive. Callers (apps) own the
 * banner. Until consent is granted, hasAnalyticsConsent() returns false
 * and analytics SDKs should not initialise.
 */
export const ANALYTICS_CONSENT_STORAGE_KEY = 'ads:analytics-consent';

export type ConsentState = 'granted' | 'denied' | 'unknown';

const safeReadStorage = (): string | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const hasAnalyticsConsent = (): boolean => {
  return safeReadStorage() === 'granted';
};

export const setAnalyticsConsent = (state: ConsentState): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    if (state === 'unknown') {
      window.localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
    } else {
      window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, state);
    }
    // Fire a synthetic event so listeners in the same tab can react —
    // the native `storage` event only fires across tabs.
    window.dispatchEvent(new CustomEvent('ads:analytics-consent-change', { detail: state }));
  } catch {
    // localStorage unavailable (privacy mode, quota); fail silently.
  }
};

/**
 * Subscribe to consent changes. Returns an unsubscribe function.
 */
export const subscribeToAnalyticsConsent = (listener: (granted: boolean) => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const handler = () => listener(hasAnalyticsConsent());
  window.addEventListener('ads:analytics-consent-change', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('ads:analytics-consent-change', handler);
    window.removeEventListener('storage', handler);
  };
};
