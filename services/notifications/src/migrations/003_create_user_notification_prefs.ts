import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — user_notification_prefs.
//
// Direct port of service.backend's 00-baseline-056-user-notification-prefs.ts.
// 1:1 with users — `user_id` is both the primary key here and the FK
// to the auth service's users table (enforced application-side via
// gRPC metadata; cross-schema FKs are off the table by the schema-per-
// service rule).
//
// `paranoid: false` — no `deleted_at` here. Prefs are mutable, not
// soft-deleted.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('digest_frequency', ['immediate', 'daily', 'weekly', 'never']);

  pgm.createTable('user_notification_prefs', {
    user_id: { type: 'uuid', primaryKey: true },
    email_enabled: { type: 'boolean', notNull: true, default: true },
    push_enabled: { type: 'boolean', notNull: true, default: true },
    sms_enabled: { type: 'boolean', notNull: true, default: false },
    digest_frequency: { type: 'digest_frequency', notNull: true, default: 'weekly' },
    application_updates: { type: 'boolean', notNull: true, default: true },
    pet_matches: { type: 'boolean', notNull: true, default: true },
    rescue_updates: { type: 'boolean', notNull: true, default: true },
    chat_messages: { type: 'boolean', notNull: true, default: true },
    quiet_hours_start: { type: 'time' },
    quiet_hours_end: { type: 'time' },
    timezone: { type: 'varchar(64)', notNull: true, default: 'UTC' },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('user_notification_prefs', 'created_by', {
    name: 'user_notification_prefs_created_by_idx',
  });
  pgm.createIndex('user_notification_prefs', 'updated_by', {
    name: 'user_notification_prefs_updated_by_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('user_notification_prefs');
  pgm.dropType('digest_frequency');
};
