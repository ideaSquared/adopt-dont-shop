// Inbound-event idempotency claim against `notifications.processed_events`.
//
// `subscribe()` delivers at-least-once, so every subscriber that turns an
// upstream event into a durable side-effect (a notification row, a push
// fan-out) must dedupe on the event id. `claimEvent` is that primitive:
// it inserts a (consumer, event_id) row and reports whether THIS call won
// the race. A redelivery hits the ON CONFLICT and returns false, so the
// caller skips the work it already did.
//
// Pass a PoolClient when the claim must be atomic with the work (the
// create handler claims inside the same transaction as the insert, so a
// rolled-back handler also un-claims the event). Pass a Pool for
// best-effort dedup where there is no DB write to be atomic with (the
// push worker — a missed push on a mid-flight crash is acceptable, a
// duplicate push is the thing we are suppressing).

import type { Pool, PoolClient } from 'pg';

export type DedupConn = Pool | PoolClient;

export const claimEvent = async (
  conn: DedupConn,
  consumer: string,
  eventId: string
): Promise<boolean> => {
  const res = await conn.query(
    `INSERT INTO notifications.processed_events (consumer, event_id)
     VALUES ($1, $2)
     ON CONFLICT (consumer, event_id) DO NOTHING`,
    [consumer, eventId]
  );
  return res.rowCount === 1;
};
