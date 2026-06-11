// GDPR saga state metrics (ADS-830).
//
// A single Prometheus gauge tracks how many sagas are in each state:
//   gdpr_sagas{state="in_progress"} — started, not yet completed/failed/timed_out
//   gdpr_sagas{state="completed"}   — all expected services acked without error
//   gdpr_sagas{state="failed"}      — at least one service acked with an error
//   gdpr_sagas{state="timed_out"}   — deadline passed, services never acked
//
// The gauge is registered on the shared observability registry so it appears
// on the /metrics endpoint alongside the standard HTTP/gRPC histograms.
// recordGdprSagaStates() is called by the sweep scheduler every tick so the
// value is fresh within one scheduler period.

import type { Pool } from 'pg';
import { Gauge } from 'prom-client';

import { getMetricsRegistry } from '@adopt-dont-shop/observability';

// The four terminal/stuck states we track.
const SAGA_STATES = ['in_progress', 'completed', 'failed', 'timed_out'] as const;

export type SagaState = (typeof SAGA_STATES)[number];

export type GdprSagaMetrics = {
  gauge: InstanceType<typeof Gauge<'state'>>;
};

// Module-level singleton so the gauge is only registered once across all
// calls (prom-client throws if the same metric name is registered twice in
// the same process).
let _metrics: GdprSagaMetrics | null = null;

export const createGdprSagaMetrics = (): GdprSagaMetrics => {
  if (_metrics) {
    return _metrics;
  }
  const registry = getMetricsRegistry();
  const gauge = new Gauge<'state'>({
    name: 'gdpr_sagas',
    help: 'Count of GDPR erasure sagas in each state (in_progress / completed / failed / timed_out).',
    labelNames: ['state'],
    registers: [registry],
  });
  _metrics = { gauge };
  return _metrics;
};

export type RecordGdprSagaStatesOptions = {
  pool: Pool;
  metrics: GdprSagaMetrics;
};

// recordGdprSagaStates queries the DB for saga counts per state and updates
// the gauge. Called by the scheduler on every tick so the metric stays fresh.
export const recordGdprSagaStates = async ({
  pool,
  metrics,
}: RecordGdprSagaStatesOptions): Promise<void> => {
  // A single aggregate query avoids N queries for N states.
  //
  // State derivation (same ordering matters for the CASE):
  //   completed  → completed_at IS NOT NULL
  //   timed_out  → timed_out_at IS NOT NULL (and not yet completed)
  //   failed     → failed_at IS NOT NULL (and not timed_out, not completed)
  //   in_progress → everything else
  const { rows } = await pool.query<{ state: string; count: string }>(
    `SELECT
       CASE
         WHEN completed_at IS NOT NULL THEN 'completed'
         WHEN timed_out_at IS NOT NULL THEN 'timed_out'
         WHEN failed_at    IS NOT NULL THEN 'failed'
         ELSE 'in_progress'
       END AS state,
       COUNT(*) AS count
     FROM audit.gdpr_erasure_requests
     GROUP BY state`
  );

  // Build a map for fast lookup; any state absent from the DB gets 0.
  const byState = new Map<string, number>(rows.map(r => [r.state, Number(r.count)]));

  for (const state of SAGA_STATES) {
    metrics.gauge.set({ state }, byState.get(state) ?? 0);
  }
};

// --- Test-only helper -------------------------------------------------------

export const __resetGdprMetricsForTest = (): void => {
  _metrics = null;
};
