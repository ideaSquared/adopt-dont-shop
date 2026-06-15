import type { MigrationBuilder } from 'node-pg-migrate';

// Idempotency guard for system-originated auto-reports.
//
// The NATS subscribers (src/nats/subscribers.ts) re-file the SAME
// (reporter_id, reported_entity_type, reported_entity_id) tuple every
// time JetStream redelivers a chat.messageCreated / pets.created /
// applications.submitted event. Without a unique arbiter, FileReport's
// INSERT mints a fresh report_id each time and floods the moderator
// queue with duplicates.
//
// Scope the constraint to the SYSTEM reporter only — a real user filing
// a second report about the same entity is legitimate and must still
// insert. The partial index keys on (reported_entity_type,
// reported_entity_id) WHERE reporter_id = SYSTEM_USER_ID, which is the
// exact arbiter FileReport's `ON CONFLICT ... WHERE reporter_id = ...`
// targets.

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createIndex('reports', ['reported_entity_type', 'reported_entity_id'], {
    name: 'reports_system_autoreport_uniq',
    unique: true,
    where: `reporter_id = '${SYSTEM_USER_ID}'`,
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('reports', ['reported_entity_type', 'reported_entity_id'], {
    name: 'reports_system_autoreport_uniq',
  });
};
