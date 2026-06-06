import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — swipe_actions.
//
// Direct port of service.backend's 00-baseline-052-swipe-actions.ts INTO
// the `matching` schema. High-volume behavioural log — non-paranoid
// (no deleted_at), no audit hooks. session_id FK is intra-schema with
// CASCADE so closing a session drops its action history.
// pet_id / user_id reference pets.* and auth.users — schema-per-service
// rule keeps them application-side as soft pointers (no DB REFERENCES).
//
// action values: 'like' / 'pass' / 'super_like' / 'info'. The 'info'
// action is the monolith's "user tapped the info button without
// swiping" trace event, kept for the recommender's preference
// modelling.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('swipe_action_type', ['like', 'pass', 'super_like', 'info']);

  pgm.createTable('swipe_actions', {
    swipe_action_id: { type: 'uuid', primaryKey: true },
    session_id: {
      type: 'uuid',
      notNull: true,
      references: 'swipe_sessions(session_id)',
      onDelete: 'CASCADE',
    },
    pet_id: { type: 'uuid', notNull: true },
    user_id: { type: 'uuid' },
    action: { type: 'swipe_action_type', notNull: true },
    timestamp: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    response_time: { type: 'integer' },
    device_type: { type: 'varchar(50)' },
    coordinates: { type: 'jsonb' },
    gesture_data: { type: 'jsonb' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('swipe_actions', 'session_id', { name: 'swipe_actions_session_idx' });
  pgm.createIndex('swipe_actions', 'pet_id', { name: 'swipe_actions_pet_idx' });
  // Recommender hot-path: "what has user X liked / passed".
  pgm.createIndex('swipe_actions', ['user_id', 'action'], {
    name: 'swipe_actions_user_action_idx',
  });
  pgm.createIndex('swipe_actions', 'timestamp', { name: 'swipe_actions_timestamp_idx' });
  pgm.createIndex('swipe_actions', ['action', 'timestamp'], {
    name: 'swipe_actions_action_time_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('swipe_actions');
  pgm.dropType('swipe_action_type');
};
