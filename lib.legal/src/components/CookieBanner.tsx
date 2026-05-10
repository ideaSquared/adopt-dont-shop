import { Button } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { setAnalyticsConsent } from '@adopt-dont-shop/lib.observability';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { fetchCookiesVersion, recordReacceptance } from '../services/legal-service';
import {
  readStoredConsent,
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
    window.addEventListener('legal-consent-v1:cleared', handler);
    return () => window.removeEventListener('legal-consent-v1:cleared', handler);
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
        await recordReacceptance({
          tosAccepted: true,
          privacyAccepted: true,
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
 * (e.g. a footer "Cookie preferences" link in slice 5b). Internal
 * subscription pattern is intentionally minimal: we re-read localStorage
 * lazily — banner choices are infrequent so polling is fine.
 */
export const useCookieConsent = (): {
  analyticsConsent: boolean;
  hasDecided: boolean;
  openPreferences: () => void;
} => {
  // The `cookiesVersion` argument to readStoredConsent comes from a
  // network fetch on banner mount; this hook intentionally only checks
  // "has the user ever decided for SOME version" so it stays
  // synchronous. Callers that need the current-version-only view should
  // use the banner itself.
  const stored = (() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null;
      }
      const raw = window.localStorage.getItem('legal-consent-v1');
      if (!raw) {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        'analyticsConsent' in parsed &&
        typeof (parsed as { analyticsConsent: unknown }).analyticsConsent === 'boolean'
      ) {
        return parsed as StoredCookieConsent;
      }
      return null;
    } catch {
      return null;
    }
  })();

  const openPreferences = () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      window.localStorage.removeItem('legal-consent-v1');
      // Force a synthetic event so any mounted CookieBanner re-evaluates.
      window.dispatchEvent(new Event('legal-consent-v1:cleared'));
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
