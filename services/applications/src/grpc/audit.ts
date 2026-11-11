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

type ApplicationsAuditEnvelope = {
  id: string;
  aggregateType: string;
  aggregateId: string;
  actorUserId?: string;
  action: string;
  details: Record<string, unknown>;
};

// Single place that stamps the AuditEventPayload fields every applications.actionTaken
// event must carry, so handlers and jobs cannot drift from the audit service's contract.
function buildActionTaken(e: ApplicationsAuditEnvelope): PublishEnvelope {
  return {
    type: 'applications.actionTaken',
    id: e.id,
    payload: {
      // audit.audit_events.event_id is a uuid PK, so it cannot be the namespaced envelope
      // id (that one is the JetStream de-dup key). Generated once at staging time
      // and stored in the outbox row, so relay retries reuse the same value.
      eventId: randomUUID(),
      service: 'service.applications',
      subject: 'applications.actionTaken',
      aggregateType: e.aggregateType,
      aggregateId: e.aggregateId,
      // Omitted (undefined) for system actions (cron jobs); the audit insert stores NULL.
      actorUserId: e.actorUserId,
      action: e.action,
      outcome: 'success',
      occurredAt: new Date().toISOString(),
      payload: e.details,
    },
  };
}

// `key` must be unique per logical event (the caller passes the aggregate id
// plus its post-write version): it is the JetStream Nats-Msg-Id, so a reused key
// would silently drop the event.
export function applicationActionTaken(
  applicationId: string,
  key: string,
  audit: ApplicationAudit
): PublishEnvelope {
  return buildActionTaken({
    id: `applications.actionTaken.${audit.action}.${key}`,
    aggregateType: 'application',
    aggregateId: applicationId,
    actorUserId: audit.actorUserId,
    action: audit.action,
    details: audit.details,
  });
}

// Bulk retention purge: one summary event per run. A run has no single aggregate row, so
// the run's own uuid is the aggregate id (and part of the envelope id, so a job that runs
// again inside JetStream's 2-minute de-dup window is not dropped). Counts only, no PII.
export function draftRetentionPurged(runId: string, deletedCount: number): PublishEnvelope {
  return buildActionTaken({
    id: `applications.actionTaken.retention_purge.${runId}`,
    aggregateType: 'application_draft_retention_run',
    aggregateId: runId,
    action: 'retention_purge',
    details: { runId, deletedCount },
  });
}
