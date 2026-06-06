import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — swipe_sessions.
//
// Direct port of service.backend's 00-baseline-053-swipe-sessions.ts INTO
// the `matching` schema. Non-paranoid (no deleted_at), no audit hooks
// (no created_by / updated_by / version) — this is a behavioural
// session log, not domain state. user_id is a soft pointer to
// auth.users (NULL allowed for anonymous browsing sessions).
//
// device_type carries the monolith's 4-value enum verbatim. filters
// is JSONB so the matching service can evolve filter shape (species,
// breed, size, age, etc.) without ALTER TABLE per addition.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('swipe_session_device_type', ['desktop', 'mobile', 'tablet', 'unknown']);

  pgm.createTable('swipe_sessions', {
    session_id: { type: 'uuid', primaryKey: true },
    user_id: { type: 'uuid' },
    start_time: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    end_time: { type: 'timestamptz' },
    total_swipes: { type: 'integer', notNull: true, default: 0 },
    likes: { type: 'integer', notNull: true, default: 0 },
    passes: { type: 'integer', notNull: true, default: 0 },
    super_likes: { type: 'integer', notNull: true, default: 0 },
    filters: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
    ip_address: { type: 'inet' },
    user_agent: { type: 'text' },
    device_type: { type: 'swipe_session_device_type', default: 'unknown' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // Hot-path: load a user's open session.
  pgm.createIndex('swipe_sessions', ['user_id', 'is_active'], {
    name: 'swipe_sessions_user_active_idx',
  });
  pgm.createIndex('swipe_sessions', 'start_time', { name: 'swipe_sessions_start_time_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('swipe_sessions');
  pgm.dropType('swipe_session_device_type');
};
