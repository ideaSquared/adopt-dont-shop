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
 * Idempotency (ADS-555): a side-table keyed by userId remembers the
 * cookiesVersion last attached for each user. The previous shape held a
 * single `<userId>::<cookiesVersion>` tuple, which meant signing in as
 * A → then B → then back to A would re-attach for A every time. The
 * map shape caps at 10 user IDs with LRU eviction so the worst case on
 * a shared kiosk doesn't grow without bound.
 *
 * Failures are swallowed so a transient network error here cannot break
 * sign-in. The next session-authenticated event will retry the attach,
 * because the dedupe entry is only written on success.
 */

const ATTACHED_MAP_STORAGE_KEY = 'legal-consent-v1:attached-map';
const ATTACHED_MAP_MAX_USERS = 10;

type AttachedMap = Record<string, string>;

const safeReadAttachedMap = (): AttachedMap => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {};
    }
    const raw = window.localStorage.getItem(ATTACHED_MAP_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const entries = Object.entries(parsed).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
};

const safeWriteAttachedMap = (map: AttachedMap): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(ATTACHED_MAP_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage unavailable; without persistence we accept that the
    // attach call may run again on the next session event. Better than
    // refusing to attach at all.
  }
};

/**
 * Insert/refresh a (userId, cookiesVersion) entry while preserving
 * insertion order so the oldest entry can be evicted when the map
 * exceeds the cap. Re-inserting an existing user moves it to the end
 * (most-recent), implementing LRU promotion on write.
 */
const upsertAttachedEntry = (
  map: AttachedMap,
  userId: string,
  cookiesVersion: string
): AttachedMap => {
  const next: AttachedMap = {};
  for (const [key, value] of Object.entries(map)) {
    if (key === userId) {
      continue;
    }
    next[key] = value;
  }
  next[userId] = cookiesVersion;
  const keys = Object.keys(next);
  if (keys.length <= ATTACHED_MAP_MAX_USERS) {
    return next;
  }
  const trimmed: AttachedMap = {};
  for (const key of keys.slice(keys.length - ATTACHED_MAP_MAX_USERS)) {
    trimmed[key] = next[key];
  }
  return trimmed;
};

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
  const attachedMap = safeReadAttachedMap();
  if (attachedMap[userId] === stored.cookiesVersion) {
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
    safeWriteAttachedMap(upsertAttachedEntry(attachedMap, userId, stored.cookiesVersion));
  } catch {
    // Leave the dedupe entry un-written so the next session event retries.
  }
};
