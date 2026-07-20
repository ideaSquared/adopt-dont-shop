import * as Sentry from '@sentry/react';

/**
 * Strip identifiable fields from `event.user` before Sentry sends an
 * event upstream. Exported for testing — callers should not need to
 * invoke this directly.
 *
 * We deliberately keep `event.user.id` if present (UUIDs are opaque)
 * and drop email / username / ip_address so a future stray
 * Sentry.setUser({ email }) call cannot leak PII to the SaaS.
 */
export const redactSentryUser = <T extends { user?: Record<string, unknown> | null }>(
  event: T
): T => {
  if (event.user) {
    delete event.user.email;
    delete event.user.username;
    delete event.user.ip_address;
  }
  return event;
};

export type SentryInitOptions = {
  /** Sentry DSN — typically read from VITE_SENTRY_DSN by the caller. */
  dsn: string | undefined;
  /** Logical app name to tag every event with (admin / client / rescue). */
  appName: 'admin' | 'client' | 'rescue';
  /** Vite mode (e.g. development / production / staging). */
  environment: string;
  /** Build/release identifier. Optional. */
  release?: string;
  /** Sample rate for performance traces. Defaults to 0.1. */
  tracesSampleRate?: number;
  /**
   * Sample rate for replay sessions. Defaults to 0 (off). Session-replay
   * content can carry PII, so callers must only raise this after
   * analytics consent has been recorded — Sentry itself runs
   * unconditionally per the class-level note below.
   */
  replaysSessionSampleRate?: number;
  /** Replay sample rate when an error occurs. Defaults to 0. */
  replaysOnErrorSampleRate?: number;
};

/**
 * Initialise Sentry for a frontend app. Safe to call when DSN is empty —
 * it just logs a warning and skips, so dev/local builds without a DSN
 * don't crash.
 *
 * Sentry is strictly necessary for service reliability and is NOT gated
 * on analytics consent. Do not consult `hasAnalyticsConsent()` before
 * calling this — see docs/legal/cookies.md §5 and consent.ts for the
 * scope rules. Replay sample rates default to 0 here so identifiable
 * session content stays off until callers explicitly opt in.
 */
export const initSentry = (options: SentryInitOptions): void => {
  const {
    dsn,
    appName,
    environment,
    release,
    tracesSampleRate = 0.1,
    replaysSessionSampleRate = 0,
    replaysOnErrorSampleRate = 0,
  } = options;

  if (!dsn) {
    if (environment !== 'test') {
      // Don't be noisy in tests, but flag it once so devs notice in dev/prod.
      // eslint-disable-next-line no-console
      console.warn(
        `[observability] VITE_SENTRY_DSN is not set for app.${appName} — error tracking is disabled.`
      );
    }
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate,
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
    initialScope: {
      tags: { app: appName },
    },
    // Defensive PII scrub: no Sentry.setUser({ email }) call exists in
    // the codebase today, but lock the invariant so a future change
    // can't accidentally ship identifiable user fields to the SaaS.
    beforeSend: event => redactSentryUser(event),
  });
};

/**
 * Send an error to Sentry. Safe to call before init — Sentry no-ops
 * if it isn't configured.
 */
export const captureException = (error: unknown, context?: Record<string, unknown>): void => {
  Sentry.captureException(error, context ? { extra: context } : undefined);
};

export const captureMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void => {
  Sentry.captureMessage(message, level);
};
