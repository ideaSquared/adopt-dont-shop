// Transactional-outbox insert + relay (ADS-1048).
//
// The publish-side half of the outbox. `outbox-schema.ts` owns the table DDL;
// this module owns the SQL that reads and writes it plus the relay loop that
// drains it to JetStream.
//
// Two publish paths share the SAME encode step (`publishRecord`) so a message
// is byte-identical whether it left via the inline fast-path or the relay:
//
//   * Inline fast-path (publish.ts) — right after COMMIT, publish the rows we
//     just inserted and DELETE them. Keeps the happy-path latency the old
//     commit-then-publish had.
//   * Relay (`startOutboxRelay`) — a background sweep that publishes any rows
//     the inline path did NOT clear (process died in the commit→publish
//     window, or JetStream was briefly unreachable). This is what closes the
//     lost-event hole; it is also usable as a one-shot reconciliation job via
//     `relayOutboxOnce`.
//
// A row is DELETEd on successful publish, so the table is a self-cleaning queue
// (only unpublished events live in it) — no unbounded ledger. Redelivery is
// safe: JetStream de-dups on Nats-Msg-Id within its duplicate window and every
// business consumer is idempotent on the event id (`claimEvent`), so a row the
// inline path published but crashed before deleting is harmlessly re-published
// by the relay.

import { randomUUID } from 'node:crypto';

import type { JetStreamClient, NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';

import { Counter, Gauge, getMetricsRegistry } from '@adopt-dont-shop/observability';

import { OUTBOX_TABLE } from './outbox-schema.js';
import type { DomainEvent } from './publish.js';

// Anything that can run a parameterised query — the transaction client (inline
// path) or a pooled connection (relay). Keeps the SQL helpers agnostic to
// which one they run on.
type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

// A pending event, as staged in the outbox and as needed to publish it.
export type OutboxRecord = {
  outboxId: string;
  eventId: string | null;
  subject: string;
  payload: unknown;
  occurredAt: Date;
};

// Optional structured logger — the relay logs a swept tick's failures if given
// one, but never requires it (kept dependency-light on purpose).
export type OutboxLogger = {
  warn?: (message: string, meta?: unknown) => void;
  error?: (message: string, meta?: unknown) => void;
};

export type OutboxRelayDeps = {
  pool: Pool;
  nats: NatsConnection;
  logger?: OutboxLogger;
};

const encoder = new TextEncoder();

// Turn a staged DomainEvent into an outbox record. `occurredAt` and the outbox
// id are fixed HERE (stage time), not at publish time, so the inline path and
// the relay agree on both.
export const toOutboxRecord = (event: DomainEvent): OutboxRecord => ({
  outboxId: randomUUID(),
  eventId: event.id ?? null,
  subject: event.type,
  payload: event.payload,
  occurredAt: event.occurredAt ?? new Date(),
});

// The single encode-and-publish step. Envelope shape matches subscribe.ts's
// EventEnvelope; msgID sets Nats-Msg-Id for broker-side de-dup when an id is
// present.
export const publishRecord = async (js: JetStreamClient, rec: OutboxRecord): Promise<void> => {
  const envelope = {
    id: rec.eventId ?? undefined,
    occurredAt: rec.occurredAt,
    payload: rec.payload,
  };
  await js.publish(rec.subject, encoder.encode(JSON.stringify(envelope)), {
    ...(rec.eventId ? { msgID: rec.eventId } : {}),
  });
};

// Insert staged records into the outbox in a single multi-row statement. Run
// on the transaction client so the rows commit atomically with the business
// write. A no-op for an empty batch (the common "no events staged" path).
export const insertOutboxRecords = async (
  client: Queryable,
  records: readonly OutboxRecord[]
): Promise<void> => {
  if (records.length === 0) {
    return;
  }
  const values: string[] = [];
  const params: unknown[] = [];
  records.forEach((rec, i) => {
    const b = i * 5;
    values.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`);
    params.push(
      rec.outboxId,
      rec.eventId,
      rec.subject,
      JSON.stringify(rec.payload),
      rec.occurredAt
    );
  });
  await client.query(
    `INSERT INTO ${OUTBOX_TABLE} (outbox_id, event_id, subject, payload, occurred_at)
     VALUES ${values.join(', ')}`,
    params
  );
};

const deleteOutboxRow = async (executor: Queryable, outboxId: string): Promise<void> => {
  await executor.query(`DELETE FROM ${OUTBOX_TABLE} WHERE outbox_id = $1`, [outboxId]);
};

// Best-effort inline publish of the rows a transaction just staged. Publishes
// each in seq order and DELETEs it on ack. On the FIRST failure it stops and
// leaves that row and every later one for the relay — preserving order and
// never throwing, because the outbox row is the durability guarantee now (a
// failure here is latency, not loss).
//
// `executor` is the just-committed transaction client — reusing it means the
// delete needs no extra connection. The publish is fast (local JetStream ack),
// so the brief hold on that connection is negligible next to the transaction
// it just ran.
export const flushInline = async (
  nats: NatsConnection,
  executor: Queryable,
  records: readonly OutboxRecord[],
  logger?: OutboxLogger
): Promise<void> => {
  if (records.length === 0) {
    return;
  }
  const js = nats.jetstream();
  for (const rec of records) {
    try {
      await publishRecord(js, rec);
      await deleteOutboxRow(executor, rec.outboxId);
      recordOutboxPublished();
    } catch (err) {
      // Count it on the same failure metric the relay uses — an inline failure
      // is non-fatal (the row waits for the relay) but it IS a publish failure,
      // and hiding it would understate the true failure rate.
      recordOutboxFailure();
      logger?.warn?.('outbox inline publish failed; relay will retry', {
        subject: rec.subject,
        err,
      });
      return;
    }
  }
};

const rowToRecord = (row: {
  outbox_id: string;
  event_id: string | null;
  subject: string;
  payload: unknown;
  occurred_at: Date;
}): OutboxRecord => ({
  outboxId: row.outbox_id,
  eventId: row.event_id,
  subject: row.subject,
  payload: row.payload,
  occurredAt: row.occurred_at,
});

// Claim a batch and publish it, holding the claim lock through publish+delete.
//
// The whole sweep runs in ONE transaction: `SELECT ... FOR UPDATE SKIP LOCKED`
// locks the batch, and the locks are held until COMMIT — so a second relay (a
// sibling replica) skips these rows and picks up a disjoint batch instead of
// re-claiming and re-publishing them. That matters because events published
// with no id opt out of JetStream's Nats-Msg-Id de-dup, so a cross-replica
// double-claim would be a genuine duplicate side-effect, not a deduped one.
//
// Holding a connection + row locks across the network publishes is acceptable
// here where it would not be on the write hot-path: the relay is a background
// backstop (the inline path handles the happy path), it runs on a bounded
// batch, and it stops the batch at the first failure — so the hold is short.
//
// Each row is published then DELETEd (self-cleaning queue). A publish failure
// stamps attempts/last_error, stops the batch (preserving per-subject order),
// and COMMITs what already succeeded; the remaining rows wait for the next
// sweep. Returns the count published so the caller can drain until a short
// batch signals the backlog is empty.
export const relayOutboxOnce = async (
  deps: Pick<OutboxRelayDeps, 'pool' | 'nats'>,
  batchSize: number
): Promise<number> => {
  const { pool, nats } = deps;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT outbox_id, event_id, subject, payload, occurred_at
         FROM ${OUTBOX_TABLE}
        ORDER BY seq
        LIMIT $1
        FOR UPDATE SKIP LOCKED`,
      [batchSize]
    );
    if (rows.length === 0) {
      await client.query('COMMIT');
      return 0;
    }
    const js = nats.jetstream();
    let published = 0;
    for (const row of rows) {
      const rec = rowToRecord(row);
      try {
        await publishRecord(js, rec);
        await deleteOutboxRow(client, rec.outboxId);
        recordOutboxPublished();
        published += 1;
      } catch (err) {
        recordOutboxFailure();
        await client.query(
          `UPDATE ${OUTBOX_TABLE}
              SET attempts = attempts + 1, last_attempt_at = now(), last_error = $2
            WHERE outbox_id = $1`,
          [rec.outboxId, err instanceof Error ? err.message : String(err)]
        );
        // Stop at the first failure — the remaining rows keep their lock until
        // COMMIT and are retried next sweep, in order.
        break;
      }
    }
    await client.query('COMMIT');
    return published;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The original error is the one that matters; a failed rollback usually
      // means the connection is already gone.
    }
    throw err;
  } finally {
    client.release();
  }
};

export type OutboxRelayOptions = {
  // How often to sweep for rows the inline path missed. Default 1s — the relay
  // is a backstop (the inline path handles the happy path), so this only
  // governs crash/outage recovery latency, and a gentle interval keeps idle DB
  // load negligible.
  intervalMs?: number;
  // Max rows claimed per statement. The tick drains fully (loops until a short
  // batch), so this just bounds each claim's lock set / memory.
  batchSize?: number;
};

export type OutboxRelayHandle = {
  stop: () => void;
};

const DEFAULT_INTERVAL_MS = 1_000;
const DEFAULT_BATCH_SIZE = 100;

// Start the background relay. Returns a handle whose stop() clears the timer.
// The tick is re-entrancy-guarded (a slow sweep never overlaps the next) and
// wraps everything so a transient DB/NATS error is logged, not fatal. The
// timer is unref'd so the relay alone never keeps the process alive at
// shutdown.
export const startOutboxRelay = (
  deps: OutboxRelayDeps,
  options: OutboxRelayOptions = {}
): OutboxRelayHandle => {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  let ticking = false;

  const tick = async (): Promise<void> => {
    if (ticking) {
      return;
    }
    ticking = true;
    try {
      let published = 0;
      do {
        published = await relayOutboxOnce(deps, batchSize);
      } while (published === batchSize);
      await updatePendingGauge(deps.pool);
    } catch (err) {
      deps.logger?.error?.('outbox relay tick failed', { err });
    } finally {
      ticking = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);
  timer.unref?.();

  return {
    stop: () => clearInterval(timer),
  };
};

// --- Metrics ----------------------------------------------------------------
//
// Registered once on the shared observability registry so they appear on
// /metrics next to the HTTP/gRPC and dead-letter series. The pending gauge is
// the primary alert signal — a rising backlog means events are stuck (NATS
// down, relay wedged); the counters give throughput and a failure rate.

let _published: InstanceType<typeof Counter> | null = null;
let _failures: InstanceType<typeof Counter> | null = null;
let _pending: InstanceType<typeof Gauge> | null = null;

const publishedCounter = (): InstanceType<typeof Counter> => {
  if (!_published) {
    _published = new Counter({
      name: 'events_outbox_published_total',
      help: 'Domain events published from the transactional outbox (inline + relay).',
      registers: [getMetricsRegistry()],
    });
  }
  return _published;
};

const failuresCounter = (): InstanceType<typeof Counter> => {
  if (!_failures) {
    _failures = new Counter({
      name: 'events_outbox_publish_failures_total',
      help: 'Outbox publish attempts that failed and left the row for a later relay sweep.',
      registers: [getMetricsRegistry()],
    });
  }
  return _failures;
};

const pendingGauge = (): InstanceType<typeof Gauge> => {
  if (!_pending) {
    _pending = new Gauge({
      name: 'events_outbox_pending',
      help: 'Rows currently waiting in the transactional outbox (unpublished backlog).',
      registers: [getMetricsRegistry()],
    });
  }
  return _pending;
};

const recordOutboxPublished = (): void => {
  publishedCounter().inc();
};

const recordOutboxFailure = (): void => {
  failuresCounter().inc();
};

const updatePendingGauge = async (pool: Pick<Pool, 'query'>): Promise<void> => {
  try {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM ${OUTBOX_TABLE}`
    );
    pendingGauge().set(Number(rows[0]?.count ?? 0));
  } catch {
    // A backlog-count blip must not crash the relay tick; the next tick retries.
  }
};

// --- Test-only helper -------------------------------------------------------

export const __resetOutboxMetricsForTest = (): void => {
  _published = null;
  _failures = null;
  _pending = null;
};
