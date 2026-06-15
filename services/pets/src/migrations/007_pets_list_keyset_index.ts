import type { MigrationBuilder } from 'node-pg-migrate';

// Composite keyset index for the public List browse path.
//
// listPets orders by `created_at DESC, pet_id DESC` and paginates with the
// keyset predicate `(created_at, pet_id) < ($cursorCreatedAt, $cursorPetId)`.
// The pre-existing single-column `pets_created_at_idx` covers the leading
// sort key but not the `pet_id` tiebreak, so deep pages still re-sort on the
// secondary key. A matching `(created_at DESC, pet_id DESC)` index lets the
// planner satisfy both the ORDER BY and the tuple comparison directly.

const KEYSET_COLUMNS = [
  { name: 'created_at', sort: 'DESC' },
  { name: 'pet_id', sort: 'DESC' },
] as const;

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createIndex('pets', [...KEYSET_COLUMNS], { name: 'pets_created_at_pet_id_keyset_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('pets', [...KEYSET_COLUMNS], { name: 'pets_created_at_pet_id_keyset_idx' });
};
