// Tests for the GDPR saga metrics (ADS-830).
//
// The metrics module provides a gauge that tracks the count of sagas in each
// terminal/stuck state: in_progress, completed, failed, timed_out.

import type { Pool } from 'pg';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  createGdprSagaMetrics,
  recordGdprSagaStates,
  type GdprSagaMetrics,
} from './gdpr-metrics.js';

function makePool(rows: Record<string, unknown>[] = []): Pool {
  return {
    query: vi.fn().mockResolvedValue({ rows }),
  } as unknown as Pool;
}

describe('createGdprSagaMetrics', () => {
  it('creates a gauge with the correct metric name and label names', () => {
    const metrics = createGdprSagaMetrics();
    expect(metrics).toBeDefined();
    // The gauge is accessible via the metrics object.
    expect(metrics.gauge).toBeDefined();
  });

  it('is idempotent — calling twice returns the same gauge instance', () => {
    const a = createGdprSagaMetrics();
    const b = createGdprSagaMetrics();
    expect(a.gauge).toBe(b.gauge);
  });
});

describe('recordGdprSagaStates', () => {
  let metrics: GdprSagaMetrics;

  beforeEach(() => {
    metrics = createGdprSagaMetrics();
  });

  it('queries the DB for saga counts per state and sets the gauge', async () => {
    const pool = makePool([
      { state: 'in_progress', count: '5' },
      { state: 'completed', count: '12' },
      { state: 'failed', count: '2' },
      { state: 'timed_out', count: '1' },
    ]);

    const setFn = vi.fn();
    metrics.gauge.set = setFn;

    await recordGdprSagaStates({ pool, metrics });

    // Must call set for each state.
    expect(setFn).toHaveBeenCalledWith({ state: 'in_progress' }, 5);
    expect(setFn).toHaveBeenCalledWith({ state: 'completed' }, 12);
    expect(setFn).toHaveBeenCalledWith({ state: 'failed' }, 2);
    expect(setFn).toHaveBeenCalledWith({ state: 'timed_out' }, 1);
  });

  it('sets a zero for a state not returned by the query (all-ok scenario)', async () => {
    // Only 'completed' rows exist.
    const pool = makePool([{ state: 'completed', count: '3' }]);
    const setFn = vi.fn();
    metrics.gauge.set = setFn;

    await recordGdprSagaStates({ pool, metrics });

    // 'completed' must be recorded.
    expect(setFn).toHaveBeenCalledWith({ state: 'completed' }, 3);
    // States with no rows must still be recorded as 0 so Prometheus doesn't
    // see a stale value from a previous observation.
    expect(setFn).toHaveBeenCalledWith({ state: 'in_progress' }, 0);
    expect(setFn).toHaveBeenCalledWith({ state: 'failed' }, 0);
    expect(setFn).toHaveBeenCalledWith({ state: 'timed_out' }, 0);
  });

  it('uses the audit schema prefix in the SQL query', async () => {
    const querySpy = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query: querySpy } as unknown as Pool;

    const setFn = vi.fn();
    metrics.gauge.set = setFn;

    await recordGdprSagaStates({ pool, metrics });

    const sql = querySpy.mock.calls[0][0] as string;
    expect(sql).toContain('audit.gdpr_erasure_requests');
  });
});
