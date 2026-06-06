import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — application_status_transitions (read model).
//
// Append-only history projected from application_events whenever a
// status-bearing event lands. Distinct from application_events
// because:
//  - it's a flattened denormalisation tuned for "show me the
//    timeline of this application" queries (which read all
//    transitions for one aggregate in chrono order)
//  - the from_status / to_status pair is what the gateway renders;
//    the underlying event types (DraftSubmitted, ReviewStarted, etc.)
//    are an implementation detail.
//
// `timestamps: false` in the monolith equivalent — only
// `transitioned_at` tracks event time; no created_at/updated_at
// because each row IS the create-time record.
//
// application_id FK is intra-schema with CASCADE — if an application
// row is hard-deleted the timeline goes with it. (The event store
// rows are immutable by trigger; soft-delete on the read model
// doesn't cascade here.)
//
// from_status / to_status carry the Phase 5.2 expanded enum (9
// values), NOT the monolith's collapsed 4-state version.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('application_status_transitions', {
    transition_id: { type: 'uuid', primaryKey: true },
    application_id: {
      type: 'uuid',
      notNull: true,
      references: 'applications(application_id)',
      onDelete: 'CASCADE',
    },
    // Null on the first transition (draft creation) where the
    // aggregate didn't have a prior status.
    from_status: { type: 'application_status' },
    to_status: { type: 'application_status', notNull: true },
    transitioned_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    // Soft pointer to auth.users. NULL for system transitions
    // (cron-promoted withdrawn drafts, etc.).
    transitioned_by: { type: 'uuid' },
    reason: { type: 'text' },
    metadata: { type: 'jsonb' },
  });

  // Timeline query: load all transitions for one aggregate in
  // chronological order.
  pgm.createIndex('application_status_transitions', ['application_id', 'transitioned_at'], {
    name: 'application_status_transitions_app_id_at_idx',
  });
  // "What did user X do" forensic query — same shape as the
  // moderation transitions table.
  pgm.createIndex('application_status_transitions', 'transitioned_by', {
    name: 'application_status_transitions_transitioned_by_idx',
    where: 'transitioned_by IS NOT NULL',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('application_status_transitions');
};
