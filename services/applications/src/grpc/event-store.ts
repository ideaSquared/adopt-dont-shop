// Event-store persistence for the event-sourced application domain.
//
// The flow for every state-changing command:
//   1. loadAggregate(client, aggregateId) — read all application_events
//      rows for the aggregate in version order, fold them into the
//      current ApplicationState via the pure domain fold.
//   2. domain.handle(state, command) — produce zero-or-more new events
//      (pure, no I/O).
//   3. appendEvents(client, ...) — INSERT each new event with
//      sequential versions. The (aggregate_id, version) UNIQUE
//      constraint enforces optimistic concurrency: a concurrent
//      writer at the same version gets a 23505 we translate to
//      CONCURRENCY.
//   4. projectReadModel(client, state) — UPSERT the read-model row so
//      gRPC reads don't need to replay events.
//
// All four steps run inside one withTransaction so the event append +
// read-model projection commit atomically, and NATS publishes only
// after commit (publish-after-commit).

import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

import {
  apply,
  INITIAL_STATE,
  type ApplicationEvent,
  type ApplicationState,
} from '../domain/index.js';

// pg's 23505 is unique_violation. The (aggregate_id, version) UNIQUE
// index trips this when two writers race at the same version.
const PG_UNIQUE_VIOLATION = '23505';

// Both `Pool` and `PoolClient` satisfy this — the write path passes the
// transaction's PoolClient, the read path (Get/List handlers) passes
// the pool directly since reads don't need a transaction.
export type Queryable = {
  query<R extends QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>>;
};

export class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

type EventRow = {
  event_type: string;
  event_data: ApplicationEvent;
  version: number;
};

// A persisted event row with its forensic metadata. The read-side
// timeline projection (GetApplication include_timeline) needs the
// event_id (stable entry id), occurred_at (when it happened) and
// actor_user_id (who did it) that the folded ApplicationState drops.
export type EventStoreRow = {
  event_id: string;
  event_data: ApplicationEvent;
  occurred_at: Date;
  actor_user_id: string | null;
  version: number;
};

// loadEventRows reads the raw event stream for an aggregate in version
// order, metadata included. Returns [] for an unknown aggregate. Both
// loadAggregate and the read-side timeline builder fold over these.
export async function loadEventRows(
  db: Queryable,
  aggregateId: string
): Promise<ReadonlyArray<EventStoreRow>> {
  const { rows } = await db.query<EventStoreRow>(
    `SELECT event_id, event_data, occurred_at, actor_user_id, version
     FROM application_events
     WHERE aggregate_id = $1
     ORDER BY version ASC`,
    [aggregateId]
  );
  return rows;
}

// loadAggregate reads + folds the event stream. Returns INITIAL_STATE
// when no events exist (a fresh aggregate). The folded state's
// `version` matches the highest event version, which is the optimistic-
// concurrency cursor the caller checks against expected_version.
export async function loadAggregate(db: Queryable, aggregateId: string): Promise<ApplicationState> {
  const { rows } = await db.query<EventRow>(
    `SELECT event_type, event_data, version
     FROM application_events
     WHERE aggregate_id = $1
     ORDER BY version ASC`,
    [aggregateId]
  );

  return rows.reduce<ApplicationState>((state, row) => apply(state, row.event_data), INITIAL_STATE);
}

// appendEvents writes the new events with versions continuing from
// `fromVersion`. The domain's fold already bumped state.version per
// event, but we write explicit sequential versions here so the UNIQUE
// constraint is the single source of truth.
//
// `actorUserId` is the principal who issued the command — stamped on
// every row for forensic queries. May be null for system commands.
export async function appendEvents(
  client: PoolClient,
  aggregateId: string,
  fromVersion: number,
  events: ReadonlyArray<ApplicationEvent>,
  actorUserId: string | null
): Promise<void> {
  let version = fromVersion;
  for (const event of events) {
    version += 1;
    try {
      await client.query(
        `INSERT INTO application_events (
           event_id, aggregate_id, version, event_type, event_data,
           occurred_at, actor_user_id
         )
         VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5, $6)`,
        [aggregateId, version, event.type, JSON.stringify(event), event.at, actorUserId]
      );
    } catch (err) {
      if ((err as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        throw new ConcurrencyError(
          `aggregate ${aggregateId} was modified concurrently at version ${version}`
        );
      }
      throw err;
    }
  }
}

// projectReadModel UPSERTs the applications read-model row from the
// folded state. The (aggregate_id) PK is the application_id. This is
// the row gRPC Get/List reads — so reads never replay events.
//
// status / answers / references / version are the live-state columns;
// everything else (timestamps stamped by specific events) is
// projected from the state's optional fields.
export async function projectReadModel(client: PoolClient, state: ApplicationState): Promise<void> {
  await client.query(
    `INSERT INTO applications (
       application_id, user_id, pet_id, rescue_id, status,
       documents, version, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW(), NOW())
     ON CONFLICT (application_id) DO UPDATE SET
       status = EXCLUDED.status,
       documents = EXCLUDED.documents,
       version = EXCLUDED.version,
       updated_at = NOW()`,
    [
      state.applicationId,
      state.adopterId,
      state.petId,
      state.rescueId,
      state.status,
      JSON.stringify({ answers: state.answers, references: state.references }),
      state.version,
    ]
  );
}
