import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — breeds (lookup table).
//
// Direct port of service.backend's 00-baseline-019-breeds.ts INTO the
// `pets` schema. Reference data — the Breed model opts out of the global
// paranoid default, so there's NO deleted_at column. Cross-schema FKs
// (created_by / updated_by → auth.users) are deliberately omitted —
// they're audit pointers the schema-per-service rule keeps
// application-side.
//
// Extensions: citext / postgis live in `public` (the postgis Docker
// image + the @adopt-dont-shop/db search_path make them resolvable).
// pets needs postgis for the `location` POINT column added in 002.
// CREATE EXTENSION IF NOT EXISTS keeps the service self-contained.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;');

  // species mirrors the monolith's enum_breeds_species (same labels as
  // the pet `type` enum, but a distinct Postgres type — Sequelize derived
  // the name from (table, column), so we keep them separate here too).
  pgm.createType('breed_species', [
    'dog',
    'cat',
    'rabbit',
    'bird',
    'reptile',
    'small_mammal',
    'fish',
    'other',
  ]);

  pgm.createTable('breeds', {
    breed_id: { type: 'uuid', primaryKey: true },
    species: { type: 'breed_species', notNull: true },
    name: { type: 'varchar(128)', notNull: true },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    version: { type: 'integer', notNull: true, default: 0 },
  });

  // Composite unique on (species, name): one canonical breed per name per
  // species. Allows the same name across species (Persian cat vs rabbit).
  pgm.createIndex('breeds', ['species', 'name'], {
    name: 'breeds_species_name_unique',
    unique: true,
  });
  pgm.createIndex('breeds', 'name', { name: 'breeds_name_idx' });
  pgm.createIndex('breeds', 'created_by', { name: 'breeds_created_by_idx' });
  pgm.createIndex('breeds', 'updated_by', { name: 'breeds_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('breeds');
  pgm.dropType('breed_species');
};
