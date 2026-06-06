import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — audit_events.
//
// Forensic record-of-record consuming *.actionTaken NATS events from
// every service. Idempotent on event_id (the producer's NATS message
// id is the PK — replays from JetStream redelivery are clean skips).
//
// Append-only by design — the row-level trigger installed below
// rejects UPDATE/DELETE so a compromised connection or buggy code
// path can't rewrite history. INSERT remains permitted so this
// service keeps appending; SELECT remains permitted so the gateway's
// `view Audit`-gated GET /api/audit/* can read. A maintenance flag
// (`SET LOCAL audit.allow_mutation = 'on'`) opens a per-transaction
// escape hatch for retention cleanups, matching the monolith's
// `audit_logs.allow_mutation` pattern in
// service.backend/src/models/audit-logs-immutable.ts.
//
// CAD PR #49 pattern — the trigger ships with the table, not
// separately. The monolith installed it post-sync; that race window
// (rows could be UPDATE-able between table create and trigger
// install) is closed here by bundling both into one migration.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('audit_events', {
    // Producer's NATS message id (uuid). Idempotency key — a
    // redelivered message INSERTs with ON CONFLICT DO NOTHING.
    event_id: { type: 'uuid', primaryKey: true },
    // Source service that emitted the event: 'service.auth',
    // 'service.pets', 'service.applications', etc. Indexed for
    // per-service forensic queries.
    service: { type: 'varchar(64)', notNull: true },
    // Full NATS subject — 'auth.userLoggedIn', 'pets.statusChanged',
    // 'applications.submitted'. Indexed for topic-scoped queries.
    subject: { type: 'varchar(128)', notNull: true },
    // Domain aggregate type ('application', 'pet', 'user', etc.) +
    // its id. (aggregate_type, aggregate_id) is the composite key the
    // gateway's GetByTarget RPC will index — admins answering "show
    // me everything that happened to pet X" hit this directly.
    aggregate_type: { type: 'varchar(64)', notNull: true },
    aggregate_id: { type: 'uuid', notNull: true },
    // The user who triggered the action. NULL for system events
    // (cron jobs, NATS replay backfills). user_id is a SOFT pointer
    // to auth.users — cross-schema FKs aren't enforced (CAD-style),
    // and the user may be deleted long after the audit row is
    // written. user_email_snapshot keeps the trail readable when the
    // user is gone.
    actor_user_id: { type: 'uuid' },
    actor_email_snapshot: { type: 'varchar(320)' },
    // The action name within the aggregate's domain — 'submit',
    // 'approve', 'login', 'updateStatus', etc. Combined with
    // (aggregate_type, subject) for human-readable timeline rendering.
    action: { type: 'varchar(64)', notNull: true },
    // Did the action succeed, get denied (authz failure), or fail
    // (server error)? Denied actions go through the audit log too —
    // that IS the forensic value. Indexed for "show me all denied
    // attempts" queries.
    outcome: { type: 'varchar(16)', notNull: true },
    // When the action happened in the producer's clock. Distinct
    // from recorded_at (this row's INSERT time) — NATS redeliveries
    // and processing lag mean recorded_at >= occurred_at, sometimes
    // by minutes. Indexed for time-window queries; this is the
    // primary forensic ordering.
    occurred_at: { type: 'timestamptz', notNull: true },
    recorded_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    // Full event body. Schema-less by design — every service's events
    // have different shapes. The gateway's query handlers render
    // relevant fields per (service, subject) tuple. Capped soft-side
    // by the NATS max message size.
    payload: { type: 'jsonb', notNull: true },
    // Optional request context — captured when the producing
    // service has it (gateway-originated events do; cron-originated
    // ones don't). Indexed only if forensic patterns later demand.
    ip_address: { type: 'varchar(45)' },
    user_agent: { type: 'text' },
  });

  // Forensic query indexes. The two most-likely queries are
  // "what happened to aggregate X" and "what did user Y do":
  pgm.createIndex('audit_events', ['aggregate_type', 'aggregate_id'], {
    name: 'audit_events_aggregate_idx',
  });
  pgm.createIndex('audit_events', 'actor_user_id', {
    name: 'audit_events_actor_user_id_idx',
    where: 'actor_user_id IS NOT NULL',
  });
  pgm.createIndex('audit_events', 'occurred_at', {
    name: 'audit_events_occurred_at_idx',
  });
  pgm.createIndex('audit_events', 'service', { name: 'audit_events_service_idx' });
  pgm.createIndex('audit_events', 'subject', { name: 'audit_events_subject_idx' });
  pgm.createIndex('audit_events', 'outcome', { name: 'audit_events_outcome_idx' });

  // Row-level tamper-resistance trigger. The function lives in this
  // service's schema (not public) so a schema drop cleans up the
  // function too. The `audit.allow_mutation` GUC is the per-tx
  // escape hatch for retention cleanups — `SET LOCAL` scopes it to
  // the current transaction, so it can never leak across requests
  // or be set persistently from a misconfigured client.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION audit_events_reject_mutation() RETURNS TRIGGER AS $$
    BEGIN
      IF current_setting('audit.allow_mutation', true) = 'on' THEN
        RETURN COALESCE(NEW, OLD);
      END IF;
      RAISE EXCEPTION 'audit_events is append-only; UPDATE/DELETE rejected';
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    CREATE TRIGGER audit_events_immutable
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW
    EXECUTE FUNCTION audit_events_reject_mutation();
  `);
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  // pgm.dropTable() cascades indexes + triggers; the function is
  // dropped explicitly because it survives the table drop otherwise.
  pgm.sql('DROP TRIGGER IF EXISTS audit_events_immutable ON audit_events;');
  pgm.dropTable('audit_events');
  pgm.sql('DROP FUNCTION IF EXISTS audit_events_reject_mutation();');
};
