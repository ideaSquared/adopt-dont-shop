// Forensic audit envelope for a scheduled job's per-run summary. Published as
// `notifications.actionTaken` from inside withTransaction, so it only fires on commit;
// service.audit's `*.actionTaken` subscriber persists it. The payload mirrors
// AuditEventPayload (services/audit/src/nats/event-types.ts).
import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '@adopt-dont-shop/events';

// A run has no single aggregate row and audit_events.aggregate_id is a uuid, so the
// run's own uuid is the aggregate id. It is also part of the envelope id (the JetStream
// de-dup key), so two runs in the same millisecond are not collapsed. `details` must
// carry counts only, no PII.
export function runSummaryActionTaken(summary: {
  aggregateType: string;
  action: string;
  details: Record<string, unknown>;
}): DomainEvent {
  const runId = randomUUID();
  return {
    type: 'notifications.actionTaken',
    id: `notifications.actionTaken.${summary.action}.${runId}`,
    payload: {
      // audit.audit_events.event_id is a uuid PK, so it cannot be the namespaced envelope
      // id. Generated once at staging time and stored in the outbox row, so relay
      // retries reuse the same value.
      eventId: randomUUID(),
      service: 'service.notifications',
      subject: 'notifications.actionTaken',
      aggregateType: summary.aggregateType,
      aggregateId: runId,
      // No actorUserId: a system job; the audit insert stores NULL.
      action: summary.action,
      outcome: 'success',
      occurredAt: new Date().toISOString(),
      payload: summary.details,
    },
  };
}
