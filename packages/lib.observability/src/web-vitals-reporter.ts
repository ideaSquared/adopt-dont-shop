import { addBreadcrumb, setMeasurement } from '@sentry/react';

import type { WebVitalMetric, WebVitalsReporter } from './web-vitals';

// A "poor" Core Web Vital rating is not an application error — shipping it
// via `captureException` (ADS-1324) puts five events on the error budget per
// page load, in every session, which exhausts the quota and buries real
// errors. Sentry's performance-measurement APIs are the right transport:
// `setMeasurement` attaches the value to the active transaction so it's
// queryable/graphable, and the breadcrumb keeps a human-readable trail on
// whatever error (if any) fires next in the same page load.
const MEASUREMENT_UNIT: Record<WebVitalMetric['name'], 'millisecond' | 'none'> = {
  CLS: 'none', // unitless layout-shift score
  INP: 'millisecond',
  LCP: 'millisecond',
  TTFB: 'millisecond',
  FCP: 'millisecond',
};

/**
 * Build a `WebVitalsReporter` (for `reportWebVitals`) that ships each Core
 * Web Vital to Sentry as a performance measurement + breadcrumb instead of
 * an exception. Rate-limited to one report per metric name per page load —
 * `web-vitals` already invokes each `on*` callback once per pageload by
 * default (no `reportAllChanges`), but the guard here keeps a stray second
 * call to `reportWebVitals` (e.g. a caller re-running it) from double-reporting.
 *
 * Call once per app bootstrap and pass the result straight to
 * `reportWebVitals()`.
 */
export const createSentryWebVitalsReporter = (): WebVitalsReporter => {
  const reported = new Set<WebVitalMetric['name']>();

  return metric => {
    if (reported.has(metric.name)) {
      return;
    }
    reported.add(metric.name);

    setMeasurement(
      `web_vital.${metric.name.toLowerCase()}`,
      metric.value,
      MEASUREMENT_UNIT[metric.name]
    );
    addBreadcrumb({
      category: 'web-vital',
      message: `${metric.name}: ${metric.value} (${metric.rating})`,
      level: metric.rating === 'poor' ? 'warning' : 'info',
      data: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
      },
    });
  };
};
