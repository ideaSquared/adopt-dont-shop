import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — support_tickets.
//
// Direct port of service.backend's 00-baseline-050-support-tickets.ts.
// Cross-schema FKs (user_id, assigned_to, escalated_to, created_by,
// updated_by reference auth.users) declared as plain uuid. tags is
// text[] with GIN index for tag-array search. attachments + metadata
// are JSONB. No paranoid (deleted_at).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('support_ticket_status', [
    'open',
    'in_progress',
    'waiting_for_user',
    'resolved',
    'closed',
    'escalated',
  ]);
  pgm.createType('support_ticket_priority', ['low', 'normal', 'high', 'urgent', 'critical']);
  pgm.createType('support_ticket_category', [
    'technical_issue',
    'account_problem',
    'adoption_inquiry',
    'payment_issue',
    'feature_request',
    'report_bug',
    'general_question',
    'compliance_concern',
    'data_request',
    'other',
  ]);

  pgm.createTable('support_tickets', {
    ticket_id: { type: 'uuid', primaryKey: true },
    user_id: { type: 'uuid' },
    user_email: { type: 'varchar(320)', notNull: true },
    user_name: { type: 'varchar(255)' },
    assigned_to: { type: 'uuid' },
    status: { type: 'support_ticket_status', notNull: true, default: 'open' },
    priority: { type: 'support_ticket_priority', notNull: true, default: 'normal' },
    category: { type: 'support_ticket_category', notNull: true },
    subject: { type: 'varchar(255)', notNull: true },
    description: { type: 'text', notNull: true },
    tags: { type: 'text[]', notNull: true },
    attachments: { type: 'jsonb', notNull: true, default: pgm.func(`'[]'::jsonb`) },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
    first_response_at: { type: 'timestamptz' },
    last_response_at: { type: 'timestamptz' },
    resolved_at: { type: 'timestamptz' },
    closed_at: { type: 'timestamptz' },
    escalated_at: { type: 'timestamptz' },
    escalated_to: { type: 'uuid' },
    escalation_reason: { type: 'text' },
    satisfaction_rating: { type: 'integer' },
    satisfaction_feedback: { type: 'text' },
    internal_notes: { type: 'text' },
    due_date: { type: 'timestamptz' },
    estimated_resolution_time: { type: 'integer' },
    actual_resolution_time: { type: 'integer' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.createIndex('support_tickets', 'user_id', { name: 'support_tickets_user_id_idx' });
  pgm.createIndex('support_tickets', 'user_email', { name: 'support_tickets_user_email_idx' });
  pgm.createIndex('support_tickets', 'assigned_to', { name: 'support_tickets_assigned_to_idx' });
  pgm.createIndex('support_tickets', 'escalated_to', { name: 'support_tickets_escalated_to_idx' });
  pgm.createIndex('support_tickets', 'status', { name: 'support_tickets_status_idx' });
  pgm.createIndex('support_tickets', 'priority', { name: 'support_tickets_priority_idx' });
  pgm.createIndex('support_tickets', 'category', { name: 'support_tickets_category_idx' });
  pgm.createIndex('support_tickets', 'created_at', { name: 'support_tickets_created_at_idx' });
  pgm.createIndex('support_tickets', 'due_date', { name: 'support_tickets_due_date_idx' });
  pgm.createIndex('support_tickets', 'tags', {
    method: 'gin',
    name: 'support_tickets_tags_gin_idx',
  });
  pgm.createIndex('support_tickets', 'created_by', { name: 'support_tickets_created_by_idx' });
  pgm.createIndex('support_tickets', 'updated_by', { name: 'support_tickets_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('support_tickets');
  pgm.dropType('support_ticket_status');
  pgm.dropType('support_ticket_priority');
  pgm.dropType('support_ticket_category');
};
