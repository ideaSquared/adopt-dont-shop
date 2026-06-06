import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — email_preferences.
//
// Direct port of service.backend's 00-baseline-040-email-preferences.ts.
// 1:1 with users — `user_id` carries both column-level UNIQUE and a
// separate named unique index, mirroring the monolith's sync() output.
//
// Distinct from `user_notification_prefs` (003): that table stores the
// in-app channel toggles and digest cadence. `email_preferences` is
// purely the email-channel record — per-type opt-in/opt-out, bounce
// tracking, unsubscribe-token surface, locale/format. The split is
// preserved from the monolith because the surfaces evolve independently
// (the bounce/blacklist columns belong to ops, the digest knobs to UX).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('email_preferences_format', ['html', 'text', 'both']);
  pgm.createType('email_preferences_digest_frequency', [
    'immediate',
    'daily',
    'weekly',
    'monthly',
    'never',
  ]);

  pgm.createTable('email_preferences', {
    preference_id: { type: 'uuid', primaryKey: true },
    user_id: { type: 'uuid', notNull: true, unique: true },
    is_email_enabled: { type: 'boolean', notNull: true, default: true },
    global_unsubscribe: { type: 'boolean', notNull: true, default: false },
    preferences: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
    language: { type: 'varchar(10)', notNull: true, default: 'en' },
    timezone: { type: 'varchar(64)', notNull: true, default: 'UTC' },
    email_format: { type: 'email_preferences_format', notNull: true, default: 'html' },
    digest_frequency: {
      type: 'email_preferences_digest_frequency',
      notNull: true,
      default: 'weekly',
    },
    digest_time: { type: 'varchar(5)', notNull: true, default: '09:00' },
    unsubscribe_token: { type: 'varchar(64)', notNull: true, unique: true },
    last_digest_sent: { type: 'timestamptz' },
    bounce_count: { type: 'integer', notNull: true, default: 0 },
    last_bounce_at: { type: 'timestamptz' },
    is_blacklisted: { type: 'boolean', notNull: true, default: false },
    blacklist_reason: { type: 'text' },
    blacklisted_at: { type: 'timestamptz' },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('email_preferences', 'is_email_enabled', {
    name: 'email_preferences_is_email_enabled_idx',
  });
  pgm.createIndex('email_preferences', 'global_unsubscribe', {
    name: 'email_preferences_global_unsubscribe_idx',
  });
  pgm.createIndex('email_preferences', 'is_blacklisted', {
    name: 'email_preferences_is_blacklisted_idx',
  });
  pgm.createIndex('email_preferences', 'digest_frequency', {
    name: 'email_preferences_digest_frequency_idx',
  });
  pgm.createIndex('email_preferences', 'last_digest_sent', {
    name: 'email_preferences_last_digest_sent_idx',
  });
  pgm.createIndex('email_preferences', 'created_by', {
    name: 'email_preferences_created_by_idx',
  });
  pgm.createIndex('email_preferences', 'updated_by', {
    name: 'email_preferences_updated_by_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('email_preferences');
  pgm.dropType('email_preferences_digest_frequency');
  pgm.dropType('email_preferences_format');
};
