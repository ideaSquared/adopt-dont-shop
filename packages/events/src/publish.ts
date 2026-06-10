import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';

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
};

// withTransaction runs `fn` inside a Postgres transaction and publishes any
// events staged via `scope.publish(...)` only after the commit succeeds.
//
// Publishing goes through JetStream (`nc.jetstream().publish()`), which
// returns a server-side ACK — the event is durably stored in the
// DOMAIN_EVENTS stream before this function resolves. A consumer that was
// offline when the event fired still receives it on reconnect
// (at-least-once), which is the point of the migration: no domain event is
// lost to a subscriber being mid-deploy/restart.
//
// Failure modes:
//  - `fn` throws → ROLLBACK, no events fire, error re-thrown.
//  - COMMIT throws → no events fire (we never reach the publish loop), error
//    re-thrown. Transaction is effectively rolled back.
//  - publish throws (no JetStream ack) → does NOT roll back (commit already
//    happened) but the error bubbles. Callers should treat this as a transient
//    infra issue; consumers will re-derive state from the next event.
//
// This is the CAD pattern that PR #29 / #35 codified: no phantom events on
// rollback, ever.
export async function withTransaction<R>(
  { pool, nats }: WithTransactionDeps,
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
    await client.query('COMMIT');
    committed = true;
    // Publish AFTER commit. A failure here bubbles to the caller but must NOT
    // trigger a rollback — the commit already happened, so the `committed`
    // guard below skips the ROLLBACK. Consumers re-derive state from the next
    // event in that (rare, transient) case.
    await publishStaged(nats, staged);
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

async function publishStaged(nats: NatsConnection, staged: readonly DomainEvent[]): Promise<void> {
  if (staged.length === 0) {
    return;
  }
  const js = nats.jetstream();
  const encoder = new TextEncoder();
  for (const event of staged) {
    const envelope = {
      id: event.id,
      occurredAt: event.occurredAt ?? new Date(),
      payload: event.payload,
    };
    // Await the PubAck so a publish failure surfaces to the caller rather
    // than being fire-and-forget. `msgID` sets Nats-Msg-Id for broker-side
    // de-dup within the stream's duplicate window.
    await js.publish(event.type, encoder.encode(JSON.stringify(envelope)), {
      ...(event.id ? { msgID: event.id } : {}),
    });
  }
}
