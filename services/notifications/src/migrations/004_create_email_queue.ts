import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — email_queue.
//
// Direct port of service.backend's 00-baseline-039-email-queue.ts.
// Append-only delivery queue; the worker takes a row, attempts the
// provider send, and updates status in place. Three Postgres enums
// (type / priority / status) declared inline. `paranoid: false` on
// the monolith model — no `deleted_at`. The retention job hard-deletes
// terminal rows after a configurable horizon.
//
// FKs (template_id → email_templates, user_id → auth.users,
// created_by/updated_by → auth.users) are NOT declared here — the
// schema-per-service rule means we never cross-schema FK to auth.
// Application-level enforcement only.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('email_queue_type', ['transactional', 'notification', 'marketing', 'system']);
  pgm.createType('email_queue_priority', ['low', 'normal', 'high', 'urgent']);
  pgm.createType('email_queue_status', [
    'queued',
    'sending',
    'sent',
    'delivered',
    'opened',
    'clicked',
    'failed',
    'bounced',
    'unsubscribed',
  ]);

  pgm.createTable('email_queue', {
    email_id: { type: 'uuid', primaryKey: true },
    template_id: { type: 'uuid' },
    from_email: { type: 'varchar(320)', notNull: true },
    from_name: { type: 'varchar(255)' },
    to_email: { type: 'varchar(320)', notNull: true },
    to_name: { type: 'varchar(255)' },
    cc_emails: { type: 'text[]', notNull: true, default: pgm.func('ARRAY[]::text[]') },
    bcc_emails: { type: 'text[]', notNull: true, default: pgm.func('ARRAY[]::text[]') },
    reply_to_email: { type: 'varchar(320)' },
    subject: { type: 'varchar(500)', notNull: true },
    html_content: { type: 'text', notNull: true },
    text_content: { type: 'text' },
    template_data: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    attachments: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
    type: { type: 'email_queue_type', notNull: true },
    priority: { type: 'email_queue_priority', notNull: true, default: 'normal' },
    status: { type: 'email_queue_status', notNull: true, default: 'queued' },
    scheduled_for: { type: 'timestamptz' },
    max_retries: { type: 'integer', notNull: true, default: 3 },
    current_retries: { type: 'integer', notNull: true, default: 0 },
    last_attempt_at: { type: 'timestamptz' },
    sent_at: { type: 'timestamptz' },
    failure_reason: { type: 'text' },
    provider_id: { type: 'varchar(64)' },
    provider_message_id: { type: 'varchar(255)' },
    tracking: { type: 'jsonb' },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    campaign_id: { type: 'varchar(255)' },
    user_id: { type: 'uuid' },
    tags: { type: 'text[]', notNull: true, default: pgm.func('ARRAY[]::text[]') },
    // Idempotency key — opt-in send-once semantics. Unique partial
    // index below permits multiple NULLs (most sends) while enforcing
    // uniqueness for callers that set it.
    idempotency_key: { type: 'varchar(64)' },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('email_queue', 'status', { name: 'email_queue_status_idx' });
  pgm.createIndex('email_queue', 'priority', { name: 'email_queue_priority_idx' });
  pgm.createIndex('email_queue', 'type', { name: 'email_queue_type_idx' });
  pgm.createIndex('email_queue', 'to_email', { name: 'email_queue_to_email_idx' });
  pgm.createIndex('email_queue', 'user_id', { name: 'email_queue_user_id_idx' });
  pgm.createIndex('email_queue', 'template_id', { name: 'email_queue_template_id_idx' });
  pgm.createIndex('email_queue', 'campaign_id', { name: 'email_queue_campaign_id_idx' });
  pgm.createIndex('email_queue', 'scheduled_for', { name: 'email_queue_scheduled_for_idx' });
  pgm.createIndex('email_queue', 'sent_at', { name: 'email_queue_sent_at_idx' });
  pgm.createIndex('email_queue', 'created_at', { name: 'email_queue_created_at_idx' });
  pgm.createIndex('email_queue', 'tags', { method: 'gin', name: 'email_queue_tags_idx' });
  pgm.createIndex('email_queue', ['status', 'priority', 'scheduled_for'], {
    name: 'email_queue_processing_idx',
  });
  pgm.createIndex('email_queue', 'created_by', { name: 'email_queue_created_by_idx' });
  pgm.createIndex('email_queue', 'updated_by', { name: 'email_queue_updated_by_idx' });
  // Partial unique on idempotency_key — uniqueness only when set.
  pgm.createIndex('email_queue', 'idempotency_key', {
    name: 'email_queue_idempotency_key_unique',
    unique: true,
    where: 'idempotency_key IS NOT NULL',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('email_queue');
  pgm.dropType('email_queue_status');
  pgm.dropType('email_queue_priority');
  pgm.dropType('email_queue_type');
};
