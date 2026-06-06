// Idempotent persistence for the Stage D.0 backfill.
//
// Differs from the live write path (grpc/event-store.ts appendEvents) in
// ONE way: it inserts with `ON CONFLICT (aggregate_id, version) DO
// NOTHING` instead of letting the UNIQUE violation surface as a
// ConcurrencyError. That makes a re-run of the backfill a clean no-op —
// the second pass synthesizes the same versioned events for the same
// aggregate_id (the aggregate_id IS the monolith application id), every
// INSERT collides, nothing changes.
//
// occurred_at is the monolith's domain timestamp (event.at). recorded_at
// is left to its DEFAULT now() — migration 001 documents that
// occurred_at and recorded_at intentionally differ for backfilled /
// replayed events, which is exactly this case.
//
// The read-model projection reuses grpc/event-store.ts projectReadModel
// verbatim (already an idempotent UPSERT keyed on application_id), so a
// re-run re-projects the identical folded state.

import type { PoolClient } from 'pg';

import { fold, type ApplicationEvent } from '../domain/index.js';
import { projectReadModel } from '../grpc/event-store.js';

import {
  mapMonolithApplication,
  type MonolithApplicationInput,
} from './map-monolith-application.js';

// Inserts one synthesized event at an explicit version with
// ON CONFLICT DO NOTHING. Returns true when a row was actually inserted
// (false when it already existed — the idempotent re-run case).
async function insertEventIdempotent(
  client: PoolClient,
  aggregateId: string,
  version: number,
  event: ApplicationEvent,
  actorUserId: string | null
): Promise<boolean> {
  const { rowCount } = await client.query(
    `INSERT INTO application_events (
       event_id, aggregate_id, version, event_type, event_data,
       occurred_at, actor_user_id
     )
     VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5, $6)
     ON CONFLICT (aggregate_id, version) DO NOTHING`,
    [aggregateId, version, event.type, JSON.stringify(event), event.at, actorUserId]
  );
  return (rowCount ?? 0) > 0;
}

// The actor stamped on the event-store rows. The monolith's
// actioned_by is the decision-maker; we stamp it on every backfilled
// row for forensic continuity. Null when the monolith never recorded a
// decision-maker (legacy / system rows).
const resolveActor = (input: MonolithApplicationInput): string | null =>
  input.actionedBy && input.actionedBy.length > 0 ? input.actionedBy : null;

export type BackfillOutcome = {
  applicationId: string;
  // Number of event rows newly inserted this run (0 on a re-run).
  insertedEvents: number;
  // Total events in the synthesized sequence (constant across runs).
  totalEvents: number;
};

// Backfill one monolith application: synthesize its event chain, insert
// each event idempotently, then project the folded read model. Runs
// inside the caller's transaction so the events + projection commit
// atomically per application.
export async function backfillApplication(
  client: PoolClient,
  input: MonolithApplicationInput
): Promise<BackfillOutcome> {
  const events = mapMonolithApplication(input);
  const actor = resolveActor(input);

  let inserted = 0;
  let version = 0;
  for (const event of events) {
    version += 1;
    const didInsert = await insertEventIdempotent(
      client,
      input.applicationId,
      version,
      event,
      actor
    );
    if (didInsert) {
      inserted += 1;
    }
  }

  // Project the read-model row from the full folded state. Idempotent
  // UPSERT — safe to re-run even when no events were inserted this pass.
  await projectReadModel(client, fold(events));

  return {
    applicationId: input.applicationId,
    insertedEvents: inserted,
    totalEvents: events.length,
  };
}
