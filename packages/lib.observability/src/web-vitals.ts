import { onCLS, onINP, onLCP, onTTFB, onFCP, type Metric } from 'web-vitals';

export type WebVitalMetric = {
  name: 'CLS' | 'INP' | 'LCP' | 'TTFB' | 'FCP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id: string;
  delta: number;
};

export type WebVitalsReporter = (metric: WebVitalMetric) => void;

const toMetric = (m: Metric): WebVitalMetric => ({
  name: m.name as WebVitalMetric['name'],
  value: m.value,
  rating: m.rating,
  id: m.id,
  delta: m.delta,
});

/**
 * Subscribe to Core Web Vitals (CLS, INP, LCP, TTFB, FCP) and forward
 * each measurement to the supplied reporter. Designed to be called once
 * during app bootstrap.
 *
 * The reporter is responsible for shipping metrics anywhere meaningful
 * (Sentry metrics API, /api/v1/web-vitals, console, etc).
 */
export const reportWebVitals = (reporter: WebVitalsReporter): void => {
  if (typeof reporter !== 'function') {
    return;
  }
  const forward = (m: Metric) => reporter(toMetric(m));
  onCLS(forward);
  onINP(forward);
  onLCP(forward);
  onTTFB(forward);
  onFCP(forward);
};
