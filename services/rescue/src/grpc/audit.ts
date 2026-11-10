// Forensic audit envelope for rescue and staff-membership state changes.
// Published as `rescue.actionTaken` from inside withTransaction, so it only
// fires on commit; service.audit's `*.actionTaken` subscriber persists it. The
// payload mirrors AuditEventPayload (services/audit/src/nats/event-types.ts).

export type RescueAudit = {
  aggregateType: 'rescue' | 'staff_member';
  aggregateId: string;
  action: 'delete' | 'verify' | 'reject' | 'updateStatus' | 'create' | 'update' | 'remove';
  actorUserId: string;
  details: Record<string, unknown>;
};

// `occurrence` is the per-event component of the id (a row version, or a
// fresh uuid). The id is the JetStream Nats-Msg-Id AND the audit row's primary
// key, so it must never be reused by a different logical event.
export function rescueActionTaken(occurrence: string, audit: RescueAudit) {
  const id = `rescue.actionTaken.${audit.action}.${audit.aggregateId}.${occurrence}`;
  return {
    type: 'rescue.actionTaken',
    id,
    payload: {
      eventId: id,
      service: 'service.rescue',
      subject: 'rescue.actionTaken',
      aggregateType: audit.aggregateType,
      aggregateId: audit.aggregateId,
      actorUserId: audit.actorUserId,
      action: audit.action,
      outcome: 'success',
      occurredAt: new Date().toISOString(),
      payload: audit.details,
    },
  };
}
