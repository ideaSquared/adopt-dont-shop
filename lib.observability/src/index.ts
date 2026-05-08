// Public API for @adopt-dont-shop/lib.observability
export { initSentry, captureException, captureMessage } from './sentry';
export type { SentryInitOptions } from './sentry';
export { reportWebVitals } from './web-vitals';
export type { WebVitalsReporter, WebVitalMetric } from './web-vitals';
export {
  hasAnalyticsConsent,
  setAnalyticsConsent,
  subscribeToAnalyticsConsent,
  ANALYTICS_CONSENT_STORAGE_KEY,
} from './consent';
export type { ConsentState } from './consent';
