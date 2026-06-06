import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — support_ticket_responses.
//
// Direct port of service.backend's 00-baseline-051-support-ticket-responses.ts.
// ticket_id FK is intra-schema with CASCADE. responder_id is a soft
// pointer (cross-schema to auth.users for staff, same for user
// responders — the responder_type discriminator distinguishes).
// Paranoid: deleted_at column with dedicated idx. attachments JSONB is
// nullable here (the only nullable JSON in the moderation domain).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('support_ticket_response_responder_type', ['staff', 'user']);

  pgm.createTable('support_ticket_responses', {
    response_id: { type: 'uuid', primaryKey: true },
    ticket_id: {
      type: 'uuid',
      notNull: true,
      references: 'support_tickets(ticket_id)',
      onDelete: 'CASCADE',
    },
    responder_id: { type: 'uuid', notNull: true },
    responder_type: { type: 'support_ticket_response_responder_type', notNull: true },
    content: { type: 'text', notNull: true },
    attachments: { type: 'jsonb' },
    is_internal: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.createIndex('support_ticket_responses', 'ticket_id', {
    name: 'support_ticket_responses_ticket_id_idx',
  });
  pgm.createIndex('support_ticket_responses', 'responder_id', {
    name: 'support_ticket_responses_responder_id_idx',
  });
  pgm.createIndex('support_ticket_responses', 'created_at', {
    name: 'support_ticket_responses_created_at_idx',
  });
  pgm.createIndex('support_ticket_responses', 'responder_type', {
    name: 'support_ticket_responses_responder_type_idx',
  });
  pgm.createIndex('support_ticket_responses', 'is_internal', {
    name: 'support_ticket_responses_is_internal_idx',
  });
  // Compound idx for the ticket-window pagination hot path.
  pgm.createIndex('support_ticket_responses', ['ticket_id', 'created_at'], {
    name: 'support_ticket_responses_ticket_created_idx',
  });
  pgm.createIndex('support_ticket_responses', 'deleted_at', {
    name: 'support_ticket_responses_deleted_at_idx',
  });
  pgm.createIndex('support_ticket_responses', 'created_by', {
    name: 'support_ticket_responses_created_by_idx',
  });
  pgm.createIndex('support_ticket_responses', 'updated_by', {
    name: 'support_ticket_responses_updated_by_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('support_ticket_responses');
  pgm.dropType('support_ticket_response_responder_type');
};
