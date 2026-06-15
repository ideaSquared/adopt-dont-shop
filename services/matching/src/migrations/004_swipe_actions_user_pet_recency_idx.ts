import type { MigrationBuilder } from 'node-pg-migrate';

// Read-side dedupe support for the append-only swipe history.
//
// Re-swipes are append-only (product decision keeps every row), so two
// hot read paths must collapse the duplicates per (user, pet):
//
//   1. fetchSwipedPetIds (Recommend exclusion) — SELECT DISTINCT pet_id
//      WHERE user_id = $1 AND action IN (...). Scans every swipe row for
//      the user.
//   2. getUserSwipeStats — DISTINCT ON (pet_id) ... ORDER BY pet_id,
//      timestamp DESC to take the latest action per pet, then aggregate.
//
// Both filter by user_id then need pet_id grouping (and recency order
// for latest-wins). The existing (user_id, action) and standalone
// timestamp indexes don't serve a per-pet-per-user latest scan. This
// composite — (user_id, pet_id, timestamp DESC) — lets Postgres satisfy
// the DISTINCT ON directly and keeps the exclusion scan index-only on
// pet_id.

const INDEX_NAME = 'swipe_actions_user_pet_recency_idx';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createIndex('swipe_actions', ['user_id', 'pet_id', { name: 'timestamp', sort: 'DESC' }], {
    name: INDEX_NAME,
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('swipe_actions', ['user_id', 'pet_id', 'timestamp'], { name: INDEX_NAME });
};
