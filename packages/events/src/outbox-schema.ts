// Transactional-outbox table DDL — the publish-side durability primitive
// (ADS-1048).
//
// `withTransaction` stages every domain event as a row in this table INSIDE
// the same Postgres transaction as the business write, so the event is durable
// atomically with the state change it describes. A background relay
// (`startOutboxRelay`) publishes pending rows to JetStream and DELETEs them on
// ack; the inline fast-path in `withTransaction` does the same immediately
// after commit so the happy path keeps its low latency. The row is the queue
// entry — a self-cleaning queue, NOT an append-only log — so the table only
// ever holds not-yet-published events and never grows unbounded.
//
// Mirror of the consumer-side `processed_events` / `claimEvent` pattern: the
// table is referenced UNQUALIFIED everywhere, resolving to the calling
// service's own schema via the connection search_path (@adopt-dont-shop/db).
// Every event-publishing service adds a migration that re-exports the `up` /
// `down` below, so the DDL is defined once here and stays in lock-step with
// the SQL in `outbox.ts` that reads and writes these columns.

import type { MigrationBuilder } from 'node-pg-migrate';

// The one table name shared by the DDL, the inserter, and the relay. Keeping
// it here (imported by outbox.ts) means the column contract has a single
// source of truth.
export const OUTBOX_TABLE = 'event_outbox';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable(OUTBOX_TABLE, {
    // App-generated id (crypto.randomUUID) so the inline fast-path can DELETE
    // exactly the rows it just inserted without relying on RETURNING order.
    outbox_id: { type: 'uuid', primaryKey: true },
    // Monotonic per-service sequence — the FIFO the relay drains by. `now()`
    // is transaction-start time, so two events staged in one transaction share
    // created_at; seq is the only tiebreaker that preserves intra-transaction
    // publish order.
    seq: { type: 'bigserial', notNull: true },
    // The DomainEvent.id — becomes the JetStream Nats-Msg-Id for broker-side
    // de-dup. Nullable: callers that omit it opt out of dedup (documented on
    // DomainEvent), so the outbox must not force one.
    event_id: { type: 'text' },
    // The NATS subject (DomainEvent.type), e.g. `pets.unit.statusChanged`.
    subject: { type: 'text', notNull: true },
    // The business payload (DomainEvent.payload). The published envelope
    // (`{ id, occurredAt, payload }`) is reconstructed from these columns so it
    // is identical whether the inline path or the relay sends it.
    payload: { type: 'jsonb', notNull: true },
    // Domain occurrence time, fixed at stage time (NOT publish time) so a
    // relay-published event carries the same occurredAt the caller intended.
    occurred_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    // Relay bookkeeping — how many publish attempts this row has taken and the
    // last failure, for triage when JetStream is unreachable and rows pile up.
    attempts: { type: 'integer', notNull: true, default: 0 },
    last_attempt_at: { type: 'timestamptz' },
    last_error: { type: 'text' },
  });

  // The relay's hot query is `... ORDER BY seq LIMIT n FOR UPDATE SKIP LOCKED`.
  // An index on seq keeps that O(log n) as a backlog drains.
  pgm.createIndex(OUTBOX_TABLE, 'seq', { name: 'event_outbox_seq_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable(OUTBOX_TABLE);
};
