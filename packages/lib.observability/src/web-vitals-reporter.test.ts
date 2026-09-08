import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setMeasurementMock, addBreadcrumbMock } = vi.hoisted(() => ({
  setMeasurementMock: vi.fn(),
  addBreadcrumbMock: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  setMeasurement: setMeasurementMock,
  addBreadcrumb: addBreadcrumbMock,
}));

import { createSentryWebVitalsReporter } from './web-vitals-reporter';
import type { WebVitalMetric } from './web-vitals';

function metric(overrides: Partial<WebVitalMetric> = {}): WebVitalMetric {
  return {
    name: 'LCP',
    value: 1234.5,
    rating: 'good',
    id: 'v3-lcp-1',
    delta: 1234.5,
    ...overrides,
  };
}

describe('createSentryWebVitalsReporter', () => {
  beforeEach(() => {
    setMeasurementMock.mockClear();
    addBreadcrumbMock.mockClear();
  });

  it('never calls captureException-shaped APIs — reports via setMeasurement + addBreadcrumb', () => {
    const reporter = createSentryWebVitalsReporter();
    reporter(metric());

    expect(setMeasurementMock).toHaveBeenCalledTimes(1);
    expect(setMeasurementMock).toHaveBeenCalledWith('web_vital.lcp', 1234.5, 'millisecond');
    expect(addBreadcrumbMock).toHaveBeenCalledTimes(1);
    expect(addBreadcrumbMock).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'web-vital',
        level: 'info',
        data: expect.objectContaining({ name: 'LCP', value: 1234.5 }),
      })
    );
  });

  it('uses a unitless measurement for CLS', () => {
    const reporter = createSentryWebVitalsReporter();
    reporter(metric({ name: 'CLS', value: 0.05, rating: 'needs-improvement' }));

    expect(setMeasurementMock).toHaveBeenCalledWith('web_vital.cls', 0.05, 'none');
  });

  it('flags a poor rating as a warning-level breadcrumb', () => {
    const reporter = createSentryWebVitalsReporter();
    reporter(metric({ name: 'INP', value: 900, rating: 'poor' }));

    expect(addBreadcrumbMock).toHaveBeenCalledWith(expect.objectContaining({ level: 'warning' }));
  });

  it('rate-limits to one report per metric name per page load', () => {
    const reporter = createSentryWebVitalsReporter();
    reporter(metric({ name: 'LCP', value: 1000 }));
    reporter(metric({ name: 'LCP', value: 2000 }));
    reporter(metric({ name: 'LCP', value: 3000 }));

    expect(setMeasurementMock).toHaveBeenCalledTimes(1);
    expect(addBreadcrumbMock).toHaveBeenCalledTimes(1);
  });

  it('tracks the rate limit independently per metric name', () => {
    const reporter = createSentryWebVitalsReporter();
    reporter(metric({ name: 'LCP' }));
    reporter(metric({ name: 'CLS' }));
    reporter(metric({ name: 'INP' }));
    reporter(metric({ name: 'TTFB' }));
    reporter(metric({ name: 'FCP' }));

    expect(setMeasurementMock).toHaveBeenCalledTimes(5);
  });

  it('gives each reporter instance its own rate-limit state', () => {
    const first = createSentryWebVitalsReporter();
    const second = createSentryWebVitalsReporter();

    first(metric({ name: 'LCP' }));
    second(metric({ name: 'LCP' }));

    expect(setMeasurementMock).toHaveBeenCalledTimes(2);
  });
});
