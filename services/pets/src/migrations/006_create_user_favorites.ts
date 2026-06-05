import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — user_favorites.
//
// Direct port of service.backend's 00-baseline-054-user-favorites.ts INTO
// the `pets` schema. Join row between an adopter and a pet they've
// favourited. pet_id is the INTRA-schema FK (→ pets.pet_id, ON DELETE
// CASCADE — a deleted pet drops its favourite rows). user_id /
// created_by / updated_by → auth.users are CROSS-schema, left FK-free.
//
// The partial unique index unique_user_pet_favorite enforces "one active
// favourite per user+pet" while permitting historical soft-deleted rows.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('user_favorites', {
    id: { type: 'uuid', primaryKey: true },
    user_id: { type: 'uuid', notNull: true },
    pet_id: {
      type: 'uuid',
      notNull: true,
      references: 'pets(pet_id)',
      onDelete: 'CASCADE',
    },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('user_favorites', ['user_id', 'pet_id'], {
    name: 'unique_user_pet_favorite',
    unique: true,
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('user_favorites', 'user_id', { name: 'idx_user_favorites_user_id' });
  pgm.createIndex('user_favorites', 'pet_id', { name: 'idx_user_favorites_pet_id' });
  pgm.createIndex('user_favorites', 'created_at', { name: 'idx_user_favorites_created_at' });
  pgm.createIndex('user_favorites', 'deleted_at', { name: 'user_favorites_deleted_at_idx' });
  pgm.createIndex('user_favorites', 'created_by', { name: 'user_favorites_created_by_idx' });
  pgm.createIndex('user_favorites', 'updated_by', { name: 'user_favorites_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('user_favorites');
};
