import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — pet_media.
//
// Direct port of service.backend's 00-baseline-017-pet-media.ts INTO the
// `pets` schema. pet_id is an INTRA-schema FK to pets.pet_id (ON DELETE
// CASCADE — media dies with its pet). created_by / updated_by are
// cross-schema audit pointers, left FK-free.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('pet_media_type', ['image', 'video']);

  pgm.createTable('pet_media', {
    media_id: { type: 'uuid', primaryKey: true },
    pet_id: {
      type: 'uuid',
      notNull: true,
      references: 'pets(pet_id)',
      onDelete: 'CASCADE',
    },
    type: { type: 'pet_media_type', notNull: true },
    url: { type: 'text', notNull: true },
    thumbnail_url: { type: 'text' },
    caption: { type: 'text' },
    order_index: { type: 'integer', notNull: true, default: 0 },
    is_primary: { type: 'boolean', notNull: true, default: false },
    duration_seconds: { type: 'integer' },
    uploaded_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
    version: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.createIndex('pet_media', ['pet_id', 'order_index'], { name: 'pet_media_pet_order_idx' });
  pgm.createIndex('pet_media', ['pet_id', 'type'], { name: 'pet_media_pet_type_idx' });
  // Partial unique: at most one is_primary=true media row per pet.
  pgm.createIndex('pet_media', 'pet_id', {
    name: 'pet_media_one_primary_per_pet',
    unique: true,
    where: 'is_primary = true',
  });
  pgm.createIndex('pet_media', 'created_by', { name: 'pet_media_created_by_idx' });
  pgm.createIndex('pet_media', 'updated_by', { name: 'pet_media_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('pet_media');
  pgm.dropType('pet_media_type');
};
