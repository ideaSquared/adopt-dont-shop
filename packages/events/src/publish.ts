import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';

import { flushInline, insertOutboxRecords, toOutboxRecord, type OutboxLogger } from './outbox.js';

export type DomainEvent<T = unknown> = {
  // NATS subject the event publishes on. Convention: `<service>.<entity>.<verb>`,
  // e.g. `pets.unit.statusChanged`. Subscribers wildcard the prefix.
  type: string;
  payload: T;
  // Event id used for idempotency on the subscriber side. Callers MUST set
  // this to a value that uniquely identifies the business action — typically
  // the aggregate id + version, or a ULID minted at command time. Falls back
  // to a generated value but that defeats idempotency.
  //
  // Under JetStream this id ALSO becomes the published message's
  // `Nats-Msg-Id`, so a double-publish of the same event within the stream's
  // duplicate window is de-duped by the broker before it reaches any consumer.
  id?: string;
  // When the event happened in the domain (not when it was published). Defaults
  // to now if omitted, but explicit is better — clock skew between services is
  // a real source of bugs.
  occurredAt?: Date;
};

export type TransactionalScope = {
  // The Postgres client inside the BEGIN/COMMIT span. Pass to repository code.
  client: PoolClient;
  // Stage a domain event to publish AFTER the transaction commits. If the
  // transaction rolls back, no staged event will ever leave the process —
  // CAD's publish-after-commit rule.
  publish<T>(event: DomainEvent<T>): void;
};

export type WithTransactionDeps = {
  pool: Pool;
  nats: NatsConnection;
  // Optional structured logger. When present, a failed inline publish (the
  // best-effort fast-path — see below) is logged at warn; the relay still
  // delivers the event regardless, so a logger is never required.
  logger?: OutboxLogger;
};

// withTransaction runs `fn` inside a Postgres transaction and delivers any
// events staged via `scope.publish(...)` through a transactional outbox
// (ADS-1048).
//
// Staged events are written as rows in the `event_outbox` table INSIDE the
// same transaction as the business write, so the event is durable atomically
// with the state change it describes. There is no dual-write window any more:
// if we commit, the event is durably queued; if we roll back, it never
// existed. This closes the old hole where a crash between COMMIT and the
// JetStream ack lost a terminal event (a notification never sent, an audit row
// never written) forever.
//
// Delivery is then two-phase:
//   1. Inline fast-path — right after COMMIT we publish the just-staged rows
//      and DELETE them on ack, preserving the low latency the old
//      commit-then-publish had. This is BEST-EFFORT: a failure here is
//      swallowed (logged if a logger was passed), because the row is still in
//      the outbox and...
//   2. The relay (`startOutboxRelay`, started once per service at boot) sweeps
//      any rows the inline path did not clear and publishes them. This is the
//      durability guarantee — the process can die anywhere in the inline path
//      and the event is still delivered.
//
// Failure modes:
//  - `fn` throws → ROLLBACK, nothing staged, error re-thrown.
//  - the outbox INSERT throws → ROLLBACK, error re-thrown. The business write
//    is abandoned too, because we could not durably stage its event — that
//    atomicity IS the fix.
//  - COMMIT throws → ROLLBACK, error re-thrown; nothing was published.
//  - inline publish throws → swallowed; the row stays in the outbox for the
//    relay. The caller sees success, because the operation DID succeed and the
//    event is durably queued.
//
// This preserves the CAD discipline (no phantom events on rollback) and adds
// the missing half: no committed event is ever lost.
export async function withTransaction<R>(
  { pool, nats, logger }: WithTransactionDeps,
  fn: (scope: TransactionalScope) => Promise<R>
): Promise<R> {
  const client = await pool.connect();
  const staged: DomainEvent[] = [];
  let committed = false;
  try {
    await client.query('BEGIN');
    const result = await fn({
      client,
      publish: event => {
        staged.push(event);
      },
    });

    // Persist the staged events in the SAME transaction as the business write.
    // A failure here rolls the whole thing back — we never commit a state
    // change whose event we could not durably queue.
    const records = staged.map(toOutboxRecord);
    await insertOutboxRecords(client, records);

    await client.query('COMMIT');
    committed = true;

    // Best-effort inline delivery on the just-committed client. Never throws —
    // anything left unpublished stays in the outbox for the relay to deliver.
    await flushInline(nats, client, records, logger);
    return result;
  } catch (err) {
    if (!committed) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Swallow rollback failures — the original error is the one the caller
        // needs to see. A failed rollback typically means the connection is
        // already gone (the most common case), and `client.release()` below
        // handles cleanup.
      }
    }
    throw err;
  } finally {
    client.release();
  }
}
