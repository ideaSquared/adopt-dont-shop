// Wire shape for the audit consumer.
//
// Every service that owns a state-changing surface publishes a
// `<domain>.actionTaken` event with the same shape — that's the
// uniformity the audit log relies on. Audit subscribes to the
// wildcard subject `*.actionTaken` and persists every event row.
//
// The shape lives HERE (consumer-side) because no producer ships a
// formal proto for it yet. Producers in Phase 10.4b (auth, pets,
// rescue, applications, chat, notifications, moderation, matching)
// will adopt the shared @adopt-dont-shop/proto.AuditEventPayload
// once it lands; for now this is the contract.
//
// Same pattern as services/notifications/src/nats/event-types.ts
// (Phase 1.4) — consumer documents the contract it depends on.

export type AuditEventPayload = {
  // Idempotency key — the producer's NATS message id. Persists as the
  // PK on audit_events; JetStream redelivery becomes an ON CONFLICT
  // DO NOTHING insert.
  eventId: string;
  // Source service identifier: 'service.auth', 'service.pets', etc.
  // Used by the gateway's `service=` filter in Query (#915).
  service: string;
  // Full NATS subject the event was published on (the audit consumer
  // subscribes to '*.actionTaken' so this comes from the message
  // metadata, not the payload). Mirrors it into the row for stable
  // forensic query.
  subject: string;
  // Domain aggregate the action targeted ('user', 'pet', 'application').
  aggregateType: string;
  // The aggregate's id (uuid string).
  aggregateId: string;
  // The user who triggered the action. NULL for system events
  // (cron jobs, NATS replay backfills).
  actorUserId?: string;
  // Denormalised at write time so the trail stays readable when the
  // user is gone.
  actorEmailSnapshot?: string;
  // Action name within the aggregate's domain — 'submit', 'approve',
  // 'login', 'updateStatus'.
  action: string;
  // 'success' | 'denied' | 'failure'. The audit enum-map (#895) maps
  // this to AuditV1.AuditOutcome.
  outcome: string;
  // When the action happened in the producer's clock (RFC 3339).
  occurredAt: string;
  // Full event body — schema-less. The producing service stamps
  // whatever fields make sense for its event type.
  payload?: unknown;
  // Optional request context.
  ipAddress?: string;
  userAgent?: string;
};
