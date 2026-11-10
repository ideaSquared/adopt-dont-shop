// Forensic audit envelope for pet state changes. Published as
// `pets.actionTaken` from inside withTransaction, so it only fires on commit;
// service.audit's `*.actionTaken` subscriber persists it. The payload mirrors
// AuditEventPayload (services/audit/src/nats/event-types.ts).

export type PetAudit = {
  action: 'delete' | 'updateStatus';
  petId: string;
  actorUserId: string;
  details: Record<string, unknown>;
};

// The id is the JetStream Nats-Msg-Id AND the audit row's primary key, so it
// must be unique per logical event: `occurrence` is a per-event component
// (a transition id, or a fresh uuid), never just the pet id.
export function petActionTaken(occurrence: string, audit: PetAudit) {
  const id = `pets.actionTaken.${audit.action}.${audit.petId}.${occurrence}`;
  return {
    type: 'pets.actionTaken',
    id,
    payload: {
      eventId: id,
      service: 'service.pets',
      subject: 'pets.actionTaken',
      aggregateType: 'pet',
      aggregateId: audit.petId,
      actorUserId: audit.actorUserId,
      action: audit.action,
      outcome: 'success',
      occurredAt: new Date().toISOString(),
      payload: audit.details,
    },
  };
}
