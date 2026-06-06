import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — application_events (event store).
//
// The persistence layer for the Phase 5.2 event-sourced domain. Every
// command that lands on a handler produces zero-or-more events here;
// the read model (Phase 5.2.5b, table `applications`) is the fold of
// these rows.
//
// Optimistic concurrency: (aggregate_id, version) UNIQUE — a second
// writer trying to append at the same version gets a 23505 the handler
// translates to DomainErrorCode='CONCURRENCY'. Version is sequential
// per aggregate starting at 1.
//
// Append-only by design — the row-level trigger installed below
// rejects UPDATE/DELETE so a compromised connection can't rewrite
// history. Same CAD PR #49 pattern shipping in services/audit. INSERT
// remains permitted; SELECT is the only read path. Per-tx escape
// hatch `SET LOCAL applications.allow_event_mutation = 'on'` exists
// for retention cleanups (event-store compaction down the line) but
// is not used in normal operation.
//
// event_data carries the full event payload as jsonb — schema-less
// at the DB layer because the domain's event union (DraftCreated,
// DraftSubmitted, etc.) evolves independently of the table shape.
// event_type is the discriminator the read-model projector dispatches
// on.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('application_events', {
    event_id: { type: 'uuid', primaryKey: true },
    // The application aggregate this event belongs to. Soft pointer
    // to applications.application_id — the FK is deferred to the
    // read model migration (002) so events can be appended before
    // the read model row exists (the DraftCreated event IS what
    // creates the aggregate).
    aggregate_id: { type: 'uuid', notNull: true },
    // Sequential per aggregate starting at 1. (aggregate_id, version)
    // is the optimistic-concurrency check — a duplicate UNIQUE
    // violation is the signal to retry the command with the latest
    // state.
    version: { type: 'integer', notNull: true },
    // Discriminator the projector dispatches on — values are the
    // domain event union's `kind` field (DraftCreated, DraftSubmitted,
    // ReviewStarted, HomeVisitScheduled, HomeVisitCompleted, Approved,
    // Rejected, Withdrawn, Adopted, DraftAnswersSaved).
    event_type: { type: 'varchar(64)', notNull: true },
    // Full event payload. Schema-less so the domain's event union can
    // evolve without an ALTER TABLE per shape change.
    event_data: { type: 'jsonb', notNull: true },
    // When the event actually happened in domain time. Distinct from
    // the row's insert time — the handler stamps this from the
    // command, not from now().
    occurred_at: { type: 'timestamptz', notNull: true },
    // Per-tx insert time. Equal to occurred_at in the happy path;
    // differs when an event is backfilled / replayed.
    recorded_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    // The user who issued the command that produced this event. NULL
    // for system events (cron job promoting expired draft → withdrawn,
    // etc.). Soft pointer to auth.users.
    actor_user_id: { type: 'uuid' },
  });

  // Optimistic concurrency control — the entire event-sourcing
  // contract rests on this constraint.
  pgm.createIndex('application_events', ['aggregate_id', 'version'], {
    unique: true,
    name: 'application_events_aggregate_version_unique',
  });
  // Replay-ordering idx — the fold reads in (aggregate_id,
  // version) order; this idx also serves "load aggregate X" queries.
  // (Note the unique idx above already orders by version within
  // aggregate, so this is redundant; left as a placeholder if we
  // ever drop the unique constraint.)

  // Query-pattern indexes.
  pgm.createIndex('application_events', 'event_type', {
    name: 'application_events_event_type_idx',
  });
  pgm.createIndex('application_events', 'occurred_at', {
    name: 'application_events_occurred_at_idx',
  });
  pgm.createIndex('application_events', 'actor_user_id', {
    name: 'application_events_actor_user_id_idx',
    where: 'actor_user_id IS NOT NULL',
  });

  // Row-level tamper-resistance trigger. Function lives in this
  // service's schema so a schema drop cleans it up too. The
  // `applications.allow_event_mutation` GUC is the per-tx escape
  // hatch — SET LOCAL scopes it to the current transaction, so it
  // can never leak across connections or be set persistently from a
  // misconfigured client.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION application_events_reject_mutation() RETURNS TRIGGER AS $$
    BEGIN
      IF current_setting('applications.allow_event_mutation', true) = 'on' THEN
        RETURN COALESCE(NEW, OLD);
      END IF;
      RAISE EXCEPTION 'application_events is append-only; UPDATE/DELETE rejected';
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    CREATE TRIGGER application_events_immutable
    BEFORE UPDATE OR DELETE ON application_events
    FOR EACH ROW
    EXECUTE FUNCTION application_events_reject_mutation();
  `);
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql('DROP TRIGGER IF EXISTS application_events_immutable ON application_events;');
  pgm.dropTable('application_events');
  pgm.sql('DROP FUNCTION IF EXISTS application_events_reject_mutation();');
};
