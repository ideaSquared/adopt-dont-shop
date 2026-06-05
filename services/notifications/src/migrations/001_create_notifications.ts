import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — notifications.
//
// Direct port of service.backend's 00-baseline-035-notifications.ts (same
// columns, same ENUM value lists, same indexes), translated to
// node-pg-migrate's MigrationBuilder API and targeted at the
// `notifications` schema instead of `public`.
//
// FKs (user_id, created_by, updated_by) deliberately omitted at this
// layer — the schema-per-service rule means cross-schema joins are out;
// user_id is enforced application-side via the gRPC layer (Phase 1.3)
// using the principal metadata from the gateway. Same discipline CAD
// uses for incident.user_id.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  // ENUMs — declared as standalone Postgres types so the runner can
  // reference them by name when adding/dropping columns later. node-pg-migrate
  // creates them in the current search_path's first schema, which is
  // `notifications` per the runMigrations() schema arg.
  pgm.createType('notification_type', [
    'application_status',
    'message_received',
    'pet_available',
    'interview_scheduled',
    'home_visit_scheduled',
    'adoption_approved',
    'adoption_rejected',
    'reference_request',
    'system_announcement',
    'account_security',
    'reminder',
    'marketing',
    'rescue_invitation',
    'staff_assignment',
    'pet_update',
    'follow_up',
  ]);
  pgm.createType('notification_channel', ['in_app', 'email', 'push', 'sms']);
  pgm.createType('notification_priority', ['low', 'normal', 'high', 'urgent']);
  pgm.createType('notification_status', [
    'pending',
    'sent',
    'delivered',
    'read',
    'failed',
    'cancelled',
  ]);
  pgm.createType('notification_related_entity_type', [
    'application',
    'pet',
    'message',
    'user',
    'rescue',
    'conversation',
    'interview',
    'home_visit',
    'reminder',
    'announcement',
    'adoption',
    'event',
    'reference',
    'security',
  ]);

  pgm.createTable('notifications', {
    notification_id: { type: 'uuid', primaryKey: true },
    user_id: { type: 'uuid', notNull: true },
    type: { type: 'notification_type', notNull: true },
    channel: { type: 'notification_channel', notNull: true },
    priority: { type: 'notification_priority', notNull: true, default: 'normal' },
    status: { type: 'notification_status', notNull: true, default: 'pending' },
    title: { type: 'varchar(255)', notNull: true },
    message: { type: 'text', notNull: true },
    data: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    template_id: { type: 'varchar(255)' },
    template_variables: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    related_entity_type: { type: 'notification_related_entity_type' },
    related_entity_id: { type: 'uuid' },
    scheduled_for: { type: 'timestamptz' },
    sent_at: { type: 'timestamptz' },
    delivered_at: { type: 'timestamptz' },
    read_at: { type: 'timestamptz' },
    clicked_at: { type: 'timestamptz' },
    expires_at: { type: 'timestamptz' },
    retry_count: { type: 'integer', notNull: true, default: 0 },
    max_retries: { type: 'integer', notNull: true, default: 3 },
    error_message: { type: 'text' },
    external_id: {
      type: 'varchar(255)',
      comment: 'External service ID for tracking delivery status',
    },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  // Indexes — names mirror the monolith verbatim so dual-stack debugging
  // (querying both schemas during the strangler-fig overlap) stays
  // legible.
  pgm.createIndex('notifications', 'user_id', { name: 'notifications_user_id_idx' });
  pgm.createIndex('notifications', 'type', { name: 'notifications_type_idx' });
  pgm.createIndex('notifications', 'channel', { name: 'notifications_channel_idx' });
  pgm.createIndex('notifications', 'status', { name: 'notifications_status_idx' });
  pgm.createIndex('notifications', 'priority', { name: 'notifications_priority_idx' });
  pgm.createIndex('notifications', 'scheduled_for', { name: 'notifications_scheduled_for_idx' });
  pgm.createIndex('notifications', 'created_at', { name: 'notifications_created_at_idx' });
  pgm.createIndex('notifications', 'expires_at', { name: 'notifications_expires_at_idx' });
  pgm.createIndex('notifications', ['user_id', 'read_at'], { name: 'notifications_user_read_idx' });
  pgm.createIndex('notifications', ['related_entity_type', 'related_entity_id'], {
    name: 'notifications_related_entity_idx',
  });
  // Partial index — only meaningful when external_id is set.
  pgm.createIndex('notifications', 'external_id', {
    name: 'notifications_external_id_idx',
    where: 'external_id IS NOT NULL',
  });
  pgm.createIndex('notifications', ['user_id', 'status', 'created_at'], {
    name: 'notifications_user_status_created_idx',
  });
  pgm.createIndex('notifications', 'deleted_at', { name: 'notifications_deleted_at_idx' });
  pgm.createIndex('notifications', 'created_by', { name: 'notifications_created_by_idx' });
  pgm.createIndex('notifications', 'updated_by', { name: 'notifications_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('notifications');
  pgm.dropType('notification_related_entity_type');
  pgm.dropType('notification_status');
  pgm.dropType('notification_priority');
  pgm.dropType('notification_channel');
  pgm.dropType('notification_type');
};
