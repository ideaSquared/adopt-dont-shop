// Inbound-event idempotency claim against `notifications.processed_events`.
//
// The primitive now lives in @adopt-dont-shop/events (shared across services);
// this module re-exports it so existing call sites keep their local import.
// The table is resolved via the connection search_path (set to `notifications`
// by @adopt-dont-shop/db createDbClient), and is created by migration 008.

export { claimEvent, type DedupConn } from '@adopt-dont-shop/events';
