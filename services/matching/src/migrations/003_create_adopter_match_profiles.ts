import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — adopter_match_profiles.
//
// Direct port of service.backend's AdopterMatchProfile model INTO the
// `matching` schema. One row per adopter (user_id is the PK). Stores
// the explicit preference fields the recommender + top-picks scorer
// consume, plus the inferred-preference blob the swipe history feeds.
//
// user_id references auth.users — schema-per-service rule keeps it a
// soft pointer (no DB REFERENCES). Non-paranoid (no deleted_at):
// preferences are mutable, not soft-deleted.
//
// JSONB preference fields (preferred_types / sizes / age_groups /
// energy / temperament) are nullable arrays-of-strings; lifestyle and
// inferred_prefs are non-null defaulting to '{}'.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('adopter_match_profiles', {
    user_id: { type: 'uuid', primaryKey: true },
    preferred_types: { type: 'jsonb' },
    preferred_sizes: { type: 'jsonb' },
    preferred_age_groups: { type: 'jsonb' },
    preferred_energy: { type: 'jsonb' },
    preferred_temperament: { type: 'jsonb' },
    lifestyle: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    max_distance_km: { type: 'integer' },
    open_to_special_needs: { type: 'boolean', notNull: true, default: false },
    notify_new_matches: { type: 'boolean', notNull: true, default: true },
    min_notification_score: { type: 'integer', notNull: true, default: 0 },
    last_notified_at: { type: 'timestamptz' },
    inferred_prefs: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    prefs_updated_at: { type: 'timestamptz' },
    allergies: { type: 'varchar(255)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('adopter_match_profiles', 'notify_new_matches', {
    name: 'adopter_match_profiles_notify_new_matches_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('adopter_match_profiles');
};
