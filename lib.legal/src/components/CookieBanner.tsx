import { Button } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { setAnalyticsConsent } from '@adopt-dont-shop/lib.observability';
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from 'react';
import { fetchCookiesVersion, recordCookiesConsent } from '../services/legal-service';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  readStoredConsent,
  readStoredConsentRaw,
  writeStoredConsent,
  type StoredCookieConsent,
} from '../services/cookie-consent-storage';
import * as styles from './CookieBanner.css';

/**
 * ADS-497 (slice 5): on-page cookie banner.
 *
 * Renders a bottom-anchored bar (NOT a modal — the page underneath stays
 * usable) when the user has not yet decided for the currently published
 * cookies policy version. Two primary actions:
 *
 *   - "Accept all" — analytics consent ON
 *   - "Essentials only" — analytics consent OFF (default)
 *
 * A "Manage preferences" disclosure exposes per-category controls. Only
 * two categories appear, matching docs/legal/cookies.md exactly:
 *
 *   - Strictly necessary (always on, no toggle)
 *   - Analytics (toggleable, default off — opt-in)
 *
 * The choice is persisted to localStorage under `legal-consent-v1` so it
 * survives reloads. For authenticated users it is also POSTed to
 * /api/v1/privacy/consent so the audit log captures the decision against
 * their account. Anonymous users persist only locally; their choice is
 * later replayed against their account on first sign-in via
 * `attachStoredCookieConsent`.
 *
 * The banner also flips the observability analytics gate so Sentry +
 * Statsig auto-capture / session replay respect the choice on the same
 * tab without a reload.
 */

const COOKIES_POLICY_HREF = '/cookies';

type Status = 'loading' | 'idle' | 'submitting';

const buildRecord = (cookiesVersion: string, analyticsConsent: boolean): StoredCookieConsent => ({
  cookiesVersion,
  analyticsConsent,
  acceptedAt: new Date().toISOString(),
});

export const CookieBanner = () => {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [cookiesVersion, setCookiesVersion] = useState<string | null>(null);
  const [hasDecided, setHasDecided] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsToggle, setAnalyticsToggle] = useState(false);
  const detailsId = useId();
  const analyticsLabelId = useId();
  const manageButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const version = await fetchCookiesVersion();
        if (cancelled) {
          return;
        }
        setCookiesVersion(version);
        const stored = readStoredConsent(version);
        setHasDecided(stored !== null);
        setAnalyticsToggle(stored?.analyticsConsent ?? false);
        setStatus('idle');
      } catch {
        // Backend unreachable: we deliberately do NOT show the banner
        // with a guessed version, because that would write a stale
        // localStorage record. Banner stays hidden until the next page
        // load retries.
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-open path: useCookieConsent().openPreferences() clears the stored
  // record and dispatches this event so the banner returns without a
  // page reload (slice 5b footer link).
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handler = () => {
      setHasDecided(false);
      setShowDetails(true);
      setAnalyticsToggle(false);
    };
    window.addEventListener(`${COOKIE_CONSENT_STORAGE_KEY}:cleared`, handler);
    return () => window.removeEventListener(`${COOKIE_CONSENT_STORAGE_KEY}:cleared`, handler);
  }, []);

  const persistChoice = async (analyticsConsent: boolean): Promise<void> => {
    if (!cookiesVersion) {
      return;
    }
    setStatus('submitting');
    const record = buildRecord(cookiesVersion, analyticsConsent);
    writeStoredConsent(record);
    setAnalyticsConsent(analyticsConsent ? 'granted' : 'denied');

    if (isAuthenticated) {
      try {
        // ADS-550: cookies-only path. Previously this called
        // `recordReacceptance` with hard-coded `tosAccepted: true,
        // privacyAccepted: true`, which made the backend stamp the
        // currently-published ToS/Privacy versions onto the audit row
        // and silently consume pending re-acceptance for documents the
        // user never saw.
        await recordCookiesConsent({
          cookiesVersion: record.cookiesVersion,
          analyticsConsent: record.analyticsConsent,
        });
      } catch {
        // Network failures are non-fatal: localStorage already captured
        // the user's choice and the next sign-in will retry the attach.
      }
    }

    setHasDecided(true);
    setStatus('idle');
  };

  if (status === 'loading' || !cookiesVersion || hasDecided) {
    return null;
  }

  // Escape inside the expanded "Manage preferences" disclosure closes it
  // and returns focus to the trigger. Banner is otherwise non-blocking, so
  // Escape outside the disclosure does nothing.
  const handleDisclosureKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Escape') {
      return;
    }
    event.stopPropagation();
    setShowDetails(false);
    manageButtonRef.current?.focus();
  };

  return (
    <div
      role='region'
      aria-label='Cookie preferences'
      className={styles.banner}
      data-testid='cookie-banner'
    >
      <div className={styles.headerRow}>
        <h2 className={styles.title}>We use cookies</h2>
        <p className={styles.description}>
          We use strictly necessary cookies to keep you signed in and to protect your account. With
          your permission we also use analytics cookies to understand how the site is used so we can
          improve it. Read our{' '}
          <a className={styles.policyLink} href={COOKIES_POLICY_HREF}>
            cookies policy
          </a>
          .
        </p>
      </div>

      <div className={styles.actionRow}>
        <Button
          variant='primary'
          onClick={() => void persistChoice(true)}
          disabled={status === 'submitting'}
          data-testid='cookie-banner-accept-all'
        >
          Accept all
        </Button>
        <Button
          variant='secondary'
          onClick={() => void persistChoice(false)}
          disabled={status === 'submitting'}
          data-testid='cookie-banner-essentials-only'
        >
          Essentials only
        </Button>
        <Button
          ref={manageButtonRef}
          variant='outline'
          onClick={() => setShowDetails(prev => !prev)}
          disabled={status === 'submitting'}
          aria-expanded={showDetails}
          aria-controls={detailsId}
          data-testid='cookie-banner-manage-preferences'
        >
          {showDetails ? 'Hide preferences' : 'Manage preferences'}
        </Button>
      </div>

      {showDetails && (
        <div id={detailsId} className={styles.detailsBlock} onKeyDown={handleDisclosureKeyDown}>
          <div className={styles.categoryRow}>
            <span className={styles.categoryLabel}>
              Strictly necessary
              <span className={styles.categoryMeta}>Always on</span>
            </span>
            <p className={styles.categoryDescription}>
              Required to sign you in, keep you signed in, and protect forms from cross-site request
              forgery. The platform cannot work without these.
            </p>
          </div>

          <div className={styles.categoryRow}>
            <label className={styles.categoryLabel}>
              <input
                type='checkbox'
                className={styles.checkbox}
                checked={analyticsToggle}
                onChange={e => setAnalyticsToggle(e.target.checked)}
                disabled={status === 'submitting'}
                aria-labelledby={analyticsLabelId}
                data-testid='cookie-banner-analytics-toggle'
              />
              <span id={analyticsLabelId}>
                Analytics
                <span className={styles.categoryMeta}>Optional</span>
              </span>
            </label>
            <p className={styles.categoryDescription}>
              Helps us understand how the site is used so we can fix problems and improve features.
              Off by default.
            </p>
          </div>

          <div className={styles.togglesActions}>
            <Button
              variant='primary'
              onClick={() => void persistChoice(analyticsToggle)}
              disabled={status === 'submitting'}
              data-testid='cookie-banner-save-preferences'
            >
              Save preferences
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Hook for components that need to read or re-open the cookie banner
 * (e.g. a footer "Cookie preferences" link in slice 5b).
 *
 * Subscribes via `useSyncExternalStore` so consumers re-render when the
 * stored choice changes in this tab (banner save / clear) AND when
 * another tab changes localStorage (the browser fires the `storage`
 * event on every other tab when one tab writes / removes a key).
 *
 * The snapshot is version-agnostic by design: this hook only answers
 * "has the user ever decided for SOME version". Callers that need
 * current-version-only behaviour should use the banner itself, which
 * fetches the published version on mount.
 */
const CONSENT_CLEARED_EVENT = `${COOKIE_CONSENT_STORAGE_KEY}:cleared`;

const subscribeToConsent = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const handleStorage = (event: StorageEvent): void => {
    if (event.key === null || event.key === COOKIE_CONSENT_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener(CONSENT_CLEARED_EVENT, callback);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(CONSENT_CLEARED_EVENT, callback);
    window.removeEventListener('storage', handleStorage);
  };
};

/**
 * useSyncExternalStore requires a referentially-stable snapshot between
 * polls when the underlying value hasn't changed — returning a fresh
 * object every call triggers React's "getSnapshot should be cached"
 * warning and breaks bailout. We cache the last serialized record and
 * return the previous parsed instance when the bytes are unchanged.
 */
let cachedSnapshotRaw: string | null = null;
let cachedSnapshot: StoredCookieConsent | null = null;

const getConsentSnapshot = (): StoredCookieConsent | null => {
  const parsed = readStoredConsentRaw();
  const serialized = parsed === null ? null : JSON.stringify(parsed);
  if (serialized === cachedSnapshotRaw) {
    return cachedSnapshot;
  }
  cachedSnapshotRaw = serialized;
  cachedSnapshot = parsed;
  return parsed;
};

const getConsentServerSnapshot = (): StoredCookieConsent | null => null;

export const useCookieConsent = (): {
  analyticsConsent: boolean;
  hasDecided: boolean;
  openPreferences: () => void;
} => {
  const stored = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getConsentServerSnapshot
  );

  const openPreferences = () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
      // Force a synthetic event so any mounted CookieBanner re-evaluates.
      window.dispatchEvent(new Event(CONSENT_CLEARED_EVENT));
    } catch {
      // localStorage unavailable; nothing to do.
    }
  };

  return {
    analyticsConsent: stored?.analyticsConsent ?? false,
    hasDecided: stored !== null,
    openPreferences,
  };
};
