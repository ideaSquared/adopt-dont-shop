// Forensic audit envelope for application state changes. Published as
// `applications.actionTaken` from inside runCommand's withTransaction, so it
// only fires on commit; service.audit's `*.actionTaken` subscriber persists
// it. The payload mirrors AuditEventPayload (services/audit/src/nats/event-types.ts).
import { randomUUID } from 'node:crypto';

import type { PublishEnvelope } from './command-runner.js';

export type ApplicationAudit = {
  action: 'approve' | 'reject' | 'withdraw';
  actorUserId: string;
  details: Record<string, unknown>;
};

// `key` must be unique per logical event (the caller passes the aggregate id
// plus its post-write version): it is the JetStream Nats-Msg-Id, so a reused key
// would silently drop the event.
export function applicationActionTaken(
  applicationId: string,
  key: string,
  audit: ApplicationAudit
): PublishEnvelope {
  const id = `applications.actionTaken.${audit.action}.${key}`;
  return {
    type: 'applications.actionTaken',
    id,
    payload: {
      // audit.audit_events.event_id is a uuid PK, so it cannot be the namespaced envelope
      // id above (that one is the JetStream de-dup key). Generated once at staging time
      // and stored in the outbox row, so relay retries reuse the same value.
      eventId: randomUUID(),
      service: 'service.applications',
      subject: 'applications.actionTaken',
      aggregateType: 'application',
      aggregateId: applicationId,
      actorUserId: audit.actorUserId,
      action: audit.action,
      outcome: 'success',
      occurredAt: new Date().toISOString(),
      payload: audit.details,
    },
  };
}
