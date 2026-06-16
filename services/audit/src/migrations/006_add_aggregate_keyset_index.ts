import type { MigrationBuilder } from 'node-pg-migrate';

// getByTarget filters on (aggregate_type, aggregate_id) and paginates with a
// keyset cursor ordered by (occurred_at DESC, event_id DESC). The existing
// audit_events_aggregate_idx covers only the filter, so for a hot aggregate
// Postgres filters then sorts every page. This composite index covers both
// the equality filter AND the keyset order, so the cursor predicate is served
// straight from the index with no per-page sort.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(`
    CREATE INDEX audit_events_aggregate_keyset_idx
    ON audit_events (aggregate_type, aggregate_id, occurred_at DESC, event_id DESC)
  `);
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql('DROP INDEX IF EXISTS audit_events_aggregate_keyset_idx');
};
