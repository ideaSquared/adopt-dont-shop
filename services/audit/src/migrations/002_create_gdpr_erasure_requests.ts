import type { MigrationBuilder } from 'node-pg-migrate';

// audit.gdpr_erasure_requests — saga tracker for the GDPR erasure flow.
//
// One row per saga (correlation_id PK). Aggregates the per-service
// completion acks into a JSONB blob; rather than carry a separate
// completion table, the audit subscriber re-reads + rewrites this
// single row each time a `gdpr.erasureCompleted` event lands. That's
// fine at GDPR throughput (a handful of requests per day) and keeps
// the status lookup a single SELECT.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('gdpr_erasure_requests', {
    correlation_id: { type: 'uuid', primaryKey: true },
    user_id: { type: 'uuid', notNull: true },
    reason: { type: 'text' },
    requested_at: { type: 'timestamptz', notNull: true },
    // Map of service-name → { recordsErased, completedAt, error? }. Keeps
    // the schema cheap to evolve; today's services + a future Phase 12
    // service just plug into the same blob.
    completions: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    // Set when every service we expect to ack has acked. Optional so a
    // stuck saga shows as NULL — the operator runs the timeout sweep.
    completed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('gdpr_erasure_requests', 'user_id', {
    name: 'gdpr_erasure_requests_user_id_idx',
  });
  pgm.createIndex('gdpr_erasure_requests', 'requested_at', {
    name: 'gdpr_erasure_requests_requested_at_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('gdpr_erasure_requests');
};
