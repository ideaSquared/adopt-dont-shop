import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — user_privacy_prefs.
//
// Direct port of service.backend's 00-baseline-057-user-privacy-prefs.ts.
// 1:1 with users — `user_id` is both the primary key here and the FK
// to auth.users. The companion table (user_notification_prefs) lives
// in the notifications schema; the gateway composes both for the
// monolith's unified /api/v1/users/preferences endpoint.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('user_profile_visibility', ['public', 'rescues_only', 'private']);

  pgm.createTable('user_privacy_prefs', {
    user_id: {
      type: 'uuid',
      primaryKey: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
    },
    profile_visibility: {
      type: 'user_profile_visibility',
      notNull: true,
      default: 'rescues_only',
    },
    show_last_seen: { type: 'boolean', notNull: true, default: false },
    show_location: { type: 'boolean', notNull: true, default: true },
    allow_search_indexing: { type: 'boolean', notNull: true, default: false },
    allow_data_export: { type: 'boolean', notNull: true, default: true },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('user_privacy_prefs', 'created_by', {
    name: 'user_privacy_prefs_created_by_idx',
  });
  pgm.createIndex('user_privacy_prefs', 'updated_by', {
    name: 'user_privacy_prefs_updated_by_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('user_privacy_prefs');
  pgm.dropType('user_profile_visibility');
};
