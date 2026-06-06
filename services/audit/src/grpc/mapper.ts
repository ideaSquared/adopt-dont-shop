// Row → proto mapper for AuditEvent.
//
// The DB row mirrors the audit.audit_events shape from #884; the proto
// message mirrors the AuditEvent type from #894. This file is the
// boundary translator — null DB columns map to omitted proto optionals,
// Date columns serialise via toISOString, and the JSONB payload
// stringifies for the gateway's REST surface (the blob trick — same as
// pets extra_json / rescue settings_json / moderation metadata_json).
//
// Pure function. No I/O, no logger. Handlers compose this onto every
// row returned by SELECT.

import type { AuditEvent } from '@adopt-dont-shop/proto';

import { outcomeFromDb } from './enum-map.js';

export type AuditEventRow = {
  event_id: string;
  service: string;
  subject: string;
  aggregate_type: string;
  aggregate_id: string;
  actor_user_id: string | null;
  actor_email_snapshot: string | null;
  action: string;
  // The DB CHECK isn't enforced — the schema uses varchar(16) — but
  // the enum-map will throw on anything other than 'success' / 'denied'
  // / 'failure', protecting the proto contract.
  outcome: string;
  occurred_at: Date;
  recorded_at: Date;
  // pg returns JSONB as a parsed JS value. The row column is `payload`;
  // the proto carries the stringified blob.
  payload: unknown;
  ip_address: string | null;
  user_agent: string | null;
};

export function rowToProto(row: AuditEventRow): AuditEvent {
  const event: AuditEvent = {
    eventId: row.event_id,
    service: row.service,
    subject: row.subject,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    action: row.action,
    outcome: outcomeFromDb(row.outcome),
    occurredAt: row.occurred_at.toISOString(),
    recordedAt: row.recorded_at.toISOString(),
    payloadJson: JSON.stringify(row.payload ?? {}),
  };

  if (row.actor_user_id !== null) {
    event.actorUserId = row.actor_user_id;
  }
  if (row.actor_email_snapshot !== null) {
    event.actorEmailSnapshot = row.actor_email_snapshot;
  }
  if (row.ip_address !== null) {
    event.ipAddress = row.ip_address;
  }
  if (row.user_agent !== null) {
    event.userAgent = row.user_agent;
  }

  return event;
}
