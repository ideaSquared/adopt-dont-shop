import type { MigrationBuilder } from 'node-pg-migrate';

// ADS-830 — GDPR saga deadline and retry support.
//
// Two new columns on audit.gdpr_erasure_requests:
//
//   timed_out_at — stamped by the periodic sweep when the saga has
//     been in flight longer than GDPR_SAGA_DEADLINE_MS (default 30 min)
//     and still has services that haven't acked (no completion entry
//     at all). NULL while the saga is still in flight or has completed/
//     failed normally. The sweep logs at error level when it stamps
//     this column — Loki/alerting picks that up.
//
//   retry_count — incremented each time the sweep re-publishes
//     gdpr.erasureRequested for services that have errored. Bounded
//     by GDPR_SAGA_MAX_RETRIES (default 3). Starts at 0 so "never
//     retried" is readable from the DB.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('gdpr_erasure_requests', {
    timed_out_at: { type: 'timestamptz' },
    retry_count: { type: 'integer', notNull: true, default: 0 },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropColumn('gdpr_erasure_requests', 'timed_out_at');
  pgm.dropColumn('gdpr_erasure_requests', 'retry_count');
};
