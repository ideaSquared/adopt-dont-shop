import type { MigrationBuilder } from 'node-pg-migrate';

// pet_views — one row per (authenticated viewer, pet, hour) detail-page view.
//
// Backs the swipe card's `views_today` activity label: the matching
// service asks for the number of rows per pet in the last 24 hours.
// Anonymous views are not stored — there is no stable viewer key to dedupe
// on, and an unauthenticated write path would be trivially spammable.
//
// Dedupe is a unique index on (viewer_id, pet_id, view_hour), where
// view_hour is the UTC hour of viewed_at, so RecordPetView is a single
// INSERT ... ON CONFLICT DO NOTHING: atomic under concurrency, with no
// check-then-insert window. The same index serves per-user lookups (GDPR
// erasure deletes by viewer_id). AT TIME ZONE 'UTC' keeps the generated
// expression immutable, which STORED columns require.
//
// pet_id is an intra-schema FK (CASCADE with the pet). viewer_id is a soft
// pointer to auth.users — schema-per-service keeps it application-side.
// Rows only matter for 24 hours; a scheduled job prunes older ones.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('pet_views', {
    view_id: { type: 'uuid', primaryKey: true },
    pet_id: {
      type: 'uuid',
      notNull: true,
      references: 'pets(pet_id)',
      onDelete: 'CASCADE',
    },
    viewer_id: { type: 'uuid', notNull: true },
    viewed_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.sql(`
    ALTER TABLE pets.pet_views
      ADD COLUMN view_hour timestamp
      GENERATED ALWAYS AS (date_trunc('hour', viewed_at AT TIME ZONE 'UTC')) STORED
  `);

  pgm.createIndex('pet_views', ['viewer_id', 'pet_id', 'view_hour'], {
    name: 'pet_views_viewer_pet_hour_uniq',
    unique: true,
  });
  // Per-pet 24h counts.
  pgm.createIndex('pet_views', ['pet_id', 'viewed_at'], {
    name: 'pet_views_pet_id_viewed_at_idx',
  });
  // Retention sweep.
  pgm.createIndex('pet_views', 'viewed_at', { name: 'pet_views_viewed_at_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('pet_views');
};
