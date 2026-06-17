import { ANALYTICS_ENDPOINTS, EXPERIMENT_RESULTS, TRACK_EVENT } from './endpoints';

describe('ANALYTICS_ENDPOINTS', () => {
  it('exposes static endpoint paths under the analytics namespace', () => {
    expect(ANALYTICS_ENDPOINTS.TRACK_EVENT).toBe('/api/v1/analytics/track');
    expect(ANALYTICS_ENDPOINTS.DASHBOARD_METRICS).toBe('/api/v1/analytics/dashboard');
  });

  it('builds an experiment-results URL from the experiment id', () => {
    expect(ANALYTICS_ENDPOINTS.EXPERIMENT_RESULTS('exp-42')).toBe(
      '/api/v1/analytics/experiments/exp-42/results'
    );
  });

  it('re-exports individual endpoints that point at the same paths', () => {
    expect(TRACK_EVENT).toBe(ANALYTICS_ENDPOINTS.TRACK_EVENT);
    expect(EXPERIMENT_RESULTS('exp-7')).toBe('/api/v1/analytics/experiments/exp-7/results');
  });
});
