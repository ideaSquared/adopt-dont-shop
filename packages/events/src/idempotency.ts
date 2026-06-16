// Inbound-event idempotency claim — the shared dedup primitive.
//
// `subscribe()` delivers at-least-once, so every subscriber that turns an
// upstream event into a durable, NON-idempotent side-effect (a notification
// row, a push fan-out, …) must dedupe on the event id. `claimEvent` is that
// primitive: it inserts a (consumer, event_id) row into the service's
// `processed_events` table and reports whether THIS call won the race. A
// redelivery hits the ON CONFLICT and returns false, so the caller skips the
// work it already did.
//
// The table is referenced UNQUALIFIED — it resolves to the calling service's
// schema via the connection search_path (every service sets it through
// @adopt-dont-shop/db `createDbClient`). Each adopting service adds a
// migration creating:
//
//   processed_events (
//     consumer     text        not null,
//     event_id     text        not null,
//     processed_at timestamptz not null default now(),
//     primary key (consumer, event_id)
//   )
//
// (see services/notifications migration 008 for the canonical shape). The key
// is (consumer, event_id) — NOT event_id alone — so the same id consumed by
// two different durables/subjects each claims independently.
//
// Pass a PoolClient to claim ATOMICALLY with the work (a rolled-back handler
// also un-claims the event); pass a Pool for best-effort dedup where there is
// no DB write to be atomic with (e.g. a fan-out worker — a missed side-effect
// on a mid-flight crash is acceptable, a duplicate is the thing suppressed).

import type { Pool, PoolClient } from 'pg';

export type DedupConn = Pool | PoolClient;

export const claimEvent = async (
  conn: DedupConn,
  consumer: string,
  eventId: string
): Promise<boolean> => {
  const res = await conn.query(
    `INSERT INTO processed_events (consumer, event_id)
     VALUES ($1, $2)
     ON CONFLICT (consumer, event_id) DO NOTHING`,
    [consumer, eventId]
  );
  return res.rowCount === 1;
};
