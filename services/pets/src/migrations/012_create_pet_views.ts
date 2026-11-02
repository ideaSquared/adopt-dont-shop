import type { MigrationBuilder } from 'node-pg-migrate';

// pet_views — one row per (authenticated viewer, pet) detail-page view.
//
// Backs the swipe card's `views_today` activity label: the matching
// service asks for the number of rows per pet in the last 24 hours.
// The RecordPetView handler dedupes inside a rolling hour, so a refresh
// loop can't inflate the count. Anonymous views are not stored — there is
// no stable viewer key to dedupe on, and an unauthenticated write path
// would be trivially spammable.
//
// pet_id is an intra-schema FK (CASCADE with the pet). viewer_id is a soft
// pointer to auth.users — schema-per-service keeps it application-side.
// The (pet_id, viewed_at) index serves both the per-pet 24h count and the
// dedupe lookup; rows older than a day only matter to retention jobs.

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

  pgm.createIndex('pet_views', ['pet_id', 'viewed_at'], {
    name: 'pet_views_pet_id_viewed_at_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('pet_views');
};
