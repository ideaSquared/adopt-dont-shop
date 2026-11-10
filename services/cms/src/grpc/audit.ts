// Forensic audit envelope for CMS content state changes. Published as
// `cms.actionTaken` from inside withTransaction, so it only fires on commit;
// service.audit's `*.actionTaken` subscriber persists it. The payload mirrors
// AuditEventPayload (services/audit/src/nats/event-types.ts).

import { randomUUID } from 'node:crypto';

export type ContentAudit = {
  action: 'delete' | 'publish' | 'unpublish' | 'archive';
  contentId: string;
  actorUserId: string;
  details: Record<string, unknown>;
};

// The id is the JetStream Nats-Msg-Id AND the audit row's primary key, so it
// carries a fresh uuid: the same content can be published, unpublished and
// published again, and each of those is its own logical event.
export function contentActionTaken(audit: ContentAudit) {
  const id = `cms.actionTaken.${audit.action}.${audit.contentId}.${randomUUID()}`;
  return {
    type: 'cms.actionTaken',
    id,
    payload: {
      eventId: id,
      service: 'service.cms',
      subject: 'cms.actionTaken',
      aggregateType: 'content',
      aggregateId: audit.contentId,
      actorUserId: audit.actorUserId,
      action: audit.action,
      outcome: 'success',
      occurredAt: new Date().toISOString(),
      payload: audit.details,
    },
  };
}
