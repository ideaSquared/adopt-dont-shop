import type { MigrationBuilder } from 'node-pg-migrate';

// Inbound-event idempotency ledger.
//
// `subscribe()` (@adopt-dont-shop/events) is at-least-once: a redelivered
// JetStream message (replica restart, nak after a transient handler
// failure, ack timeout) re-runs the handler. The canonical create handler
// mints a fresh notification_id per call, so without a dedup ledger one
// upstream event becomes N duplicate notification rows (and N pushes).
// The subscriber path claims against this table inside the SAME
// transaction as the notification insert, so a redelivery is a clean
// no-op.
//
// Key is (consumer, event_id), NOT event_id alone: the applications
// service publishes every lifecycle event for an application under the
// SAME envelope id (the application id), so applications.approved and
// applications.adopted for one application would collide on event_id.
// The `consumer` column (the subject / durable consumer that handled the
// event) keeps distinct subscribers — and distinct subjects — apart.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('processed_events', {
    consumer: { type: 'text', notNull: true },
    event_id: { type: 'text', notNull: true },
    processed_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('processed_events', 'processed_events_pkey', {
    primaryKey: ['consumer', 'event_id'],
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('processed_events');
};
