import { z } from 'zod';

/**
 * ADS-497 (slice 5): localStorage persistence for the on-page cookie
 * banner choice.
 *
 * The banner stores a single record describing the user's last decision
 * for the current published cookies policy version. When the policy
 * version changes (`COOKIES_VERSION` bumped server-side and surfaced via
 * the backend response), `readStoredConsent` returns null so the banner
 * re-prompts. Anonymous users live entirely off this store; authenticated
 * users additionally have their choice replayed to the consent endpoint
 * via `attachStoredCookieConsent`.
 *
 * Schema-first via Zod so a malformed value (e.g. an older banner
 * version, hand-edited storage) is treated the same as no decision.
 */

export const COOKIE_CONSENT_STORAGE_KEY = 'legal-consent-v1';

export const StoredCookieConsentSchema = z.object({
  cookiesVersion: z.string().min(1),
  analyticsConsent: z.boolean(),
  acceptedAt: z.string().min(1),
});

export type StoredCookieConsent = z.infer<typeof StoredCookieConsentSchema>;

const safeReadRaw = (): string | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
};

/**
 * Returns the stored cookie-consent record only when it parses cleanly
 * AND its `cookiesVersion` matches the caller's current version. Any
 * mismatch — missing, malformed JSON, schema failure, or stale version —
 * resolves to null so the caller treats the user as undecided and the
 * banner re-prompts.
 */
export const readStoredConsent = (currentCookiesVersion: string): StoredCookieConsent | null => {
  const raw = safeReadRaw();
  if (!raw) {
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = StoredCookieConsentSchema.safeParse(parsedJson);
  if (!result.success) {
    return null;
  }
  if (result.data.cookiesVersion !== currentCookiesVersion) {
    return null;
  }
  return result.data;
};

export const writeStoredConsent = (record: StoredCookieConsent): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage unavailable (privacy mode, quota); fail silently.
  }
};

export const clearStoredConsent = (): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    // localStorage unavailable; fail silently.
  }
};
