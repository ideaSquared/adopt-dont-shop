import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reportWebVitals, type WebVitalMetric } from './web-vitals';

// Mock the web-vitals SDK so we can capture the callbacks `reportWebVitals`
// registers and drive them ourselves. Each `on*` records its callback into a
// shared registry keyed by metric name. Spies come from vi.hoisted so they are
// available at the (hoisted) mock-evaluation time.
type FakeMetric = {
  name: string;
  value: number;
  rating: string;
  id: string;
  delta: number;
};
type MetricCallback = (metric: FakeMetric) => void;

const { registry } = vi.hoisted(() => ({
  registry: new Map<string, MetricCallback>(),
}));

vi.mock('web-vitals', () => ({
  onCLS: (cb: MetricCallback) => registry.set('CLS', cb),
  onINP: (cb: MetricCallback) => registry.set('INP', cb),
  onLCP: (cb: MetricCallback) => registry.set('LCP', cb),
  onTTFB: (cb: MetricCallback) => registry.set('TTFB', cb),
  onFCP: (cb: MetricCallback) => registry.set('FCP', cb),
}));

describe('reportWebVitals', () => {
  beforeEach(() => {
    registry.clear();
  });

  it('subscribes to every core web vital metric', () => {
    reportWebVitals(() => undefined);

    expect([...registry.keys()].sort()).toEqual(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']);
  });

  it('forwards each measurement to the reporter as a normalised metric', () => {
    const received: WebVitalMetric[] = [];
    reportWebVitals(metric => received.push(metric));

    const lcpCallback = registry.get('LCP');
    expect(lcpCallback).toBeDefined();
    lcpCallback?.({
      name: 'LCP',
      value: 1234.5,
      rating: 'good',
      id: 'v3-lcp-1',
      delta: 1234.5,
    });

    expect(received).toEqual([
      {
        name: 'LCP',
        value: 1234.5,
        rating: 'good',
        id: 'v3-lcp-1',
        delta: 1234.5,
      },
    ]);
  });

  it('maps only the public metric fields and drops extra SDK internals', () => {
    const received: WebVitalMetric[] = [];
    reportWebVitals(metric => received.push(metric));

    const clsCallback = registry.get('CLS');
    // The real web-vitals Metric carries extra fields (entries, navigationType)
    // that must not leak through to the public WebVitalMetric shape.
    clsCallback?.({
      name: 'CLS',
      value: 0.05,
      rating: 'needs-improvement',
      id: 'v3-cls-1',
      delta: 0.01,
      // extra internal fields the SDK includes
      entries: [{ startTime: 1 }],
      navigationType: 'navigate',
    } as unknown as Parameters<MetricCallback>[0]);

    expect(received).toHaveLength(1);
    expect(Object.keys(received[0]).sort()).toEqual(['delta', 'id', 'name', 'rating', 'value']);
    expect(received[0]).toEqual({
      name: 'CLS',
      value: 0.05,
      rating: 'needs-improvement',
      id: 'v3-cls-1',
      delta: 0.01,
    });
  });

  it('forwards metrics from every registered callback', () => {
    const received: WebVitalMetric[] = [];
    reportWebVitals(metric => received.push(metric));

    for (const name of ['CLS', 'INP', 'LCP', 'TTFB', 'FCP'] as const) {
      registry.get(name)?.({
        name,
        value: 1,
        rating: 'poor',
        id: `id-${name}`,
        delta: 1,
      });
    }

    expect(received.map(m => m.name).sort()).toEqual(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']);
  });

  it('does not subscribe when the reporter is not a function', () => {
    // Guard clause: a non-function reporter must short-circuit before any
    // web-vitals subscription is registered.
    reportWebVitals(undefined as unknown as Parameters<typeof reportWebVitals>[0]);

    expect(registry.size).toBe(0);
  });
});
