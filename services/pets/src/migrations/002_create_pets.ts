import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — pets.
//
// Direct port of service.backend's 00-baseline-016-pets.ts INTO the
// `pets` schema. The big one — the full pet listing row.
//
// FK decisions:
//   - breed_id / secondary_breed_id → breeds: INTRA-schema, so the FK
//     stays enforced (both tables live in `pets`). ON DELETE SET NULL
//     matches the monolith's nullable belongsTo.
//   - rescue_id → rescue schema, created_by / updated_by → auth.users:
//     CROSS-schema, so no DB-level FK — the no-cross-schema-joins rule
//     keeps these application-side.
//
// search_vector is a plain TSVECTOR column (the maintaining trigger lives
// with the model's afterSync hook in the monolith — not part of the
// baseline schema, so not ported here). location is public.geometry(Point)
// — PostGIS lives in public (extension created in 001).

const PET_STATUS = [
  'available',
  'pending',
  'adopted',
  'foster',
  'medical_hold',
  'behavioral_hold',
  'not_available',
  'deceased',
];

const PET_TYPE = ['dog', 'cat', 'rabbit', 'bird', 'reptile', 'small_mammal', 'fish', 'other'];
const GENDER = ['male', 'female', 'unknown'];
const SIZE = ['extra_small', 'small', 'medium', 'large', 'extra_large'];
const AGE_GROUP = ['baby', 'young', 'adult', 'senior'];
const ENERGY_LEVEL = ['low', 'medium', 'high', 'very_high'];
const VACCINATION_STATUS = ['up_to_date', 'partial', 'not_vaccinated', 'unknown'];
const SPAY_NEUTER_STATUS = ['spayed', 'neutered', 'not_altered', 'unknown'];

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('pet_status', PET_STATUS);
  pgm.createType('pet_type', PET_TYPE);
  pgm.createType('pet_gender', GENDER);
  pgm.createType('pet_size', SIZE);
  pgm.createType('pet_age_group', AGE_GROUP);
  pgm.createType('pet_energy_level', ENERGY_LEVEL);
  pgm.createType('pet_vaccination_status', VACCINATION_STATUS);
  pgm.createType('pet_spay_neuter_status', SPAY_NEUTER_STATUS);

  pgm.createTable('pets', {
    pet_id: { type: 'uuid', primaryKey: true },
    name: { type: 'varchar(100)', notNull: true },
    // Nullable cross-schema pointer to the owning rescue (no DB FK).
    rescue_id: { type: 'uuid' },
    short_description: { type: 'text' },
    long_description: { type: 'text' },
    age_years: { type: 'integer' },
    age_months: { type: 'integer' },
    birth_date: { type: 'date' },
    is_birth_date_estimate: { type: 'boolean', notNull: true, default: false },
    age_group: { type: 'pet_age_group', notNull: true, default: 'adult' },
    gender: { type: 'pet_gender', notNull: true, default: 'unknown' },
    status: { type: 'pet_status', notNull: true, default: 'available' },
    type: { type: 'pet_type', notNull: true },
    breed_id: {
      type: 'uuid',
      references: 'breeds(breed_id)',
      onDelete: 'SET NULL',
    },
    secondary_breed_id: {
      type: 'uuid',
      references: 'breeds(breed_id)',
      onDelete: 'SET NULL',
    },
    weight_kg: { type: 'decimal(5,2)' },
    size: { type: 'pet_size', notNull: true, default: 'medium' },
    color: { type: 'varchar(100)' },
    markings: { type: 'varchar(255)' },
    microchip_id: { type: 'varchar(50)', unique: true },
    archived: { type: 'boolean', notNull: true, default: false },
    featured: { type: 'boolean', notNull: true, default: false },
    priority_listing: { type: 'boolean', notNull: true, default: false },
    adoption_fee_minor: { type: 'integer' },
    adoption_fee_currency: { type: 'char(3)', default: 'GBP' },
    special_needs: { type: 'boolean', notNull: true, default: false },
    special_needs_description: { type: 'text' },
    house_trained: { type: 'boolean', notNull: true, default: false },
    good_with_children: { type: 'boolean' },
    good_with_dogs: { type: 'boolean' },
    good_with_cats: { type: 'boolean' },
    good_with_small_animals: { type: 'boolean' },
    energy_level: { type: 'pet_energy_level', notNull: true, default: 'medium' },
    exercise_needs: { type: 'text' },
    grooming_needs: { type: 'text' },
    training_notes: { type: 'text' },
    temperament: { type: 'text[]' },
    medical_notes: { type: 'text' },
    behavioral_notes: { type: 'text' },
    surrender_reason: { type: 'text' },
    intake_date: { type: 'timestamptz' },
    vaccination_status: { type: 'pet_vaccination_status', notNull: true, default: 'unknown' },
    vaccination_date: { type: 'timestamptz' },
    spay_neuter_status: { type: 'pet_spay_neuter_status', notNull: true, default: 'unknown' },
    spay_neuter_date: { type: 'timestamptz' },
    last_vet_checkup: { type: 'timestamptz' },
    location: { type: 'public.geometry(Point)' },
    available_since: { type: 'timestamptz' },
    adopted_date: { type: 'timestamptz' },
    foster_start_date: { type: 'timestamptz' },
    foster_end_date: { type: 'timestamptz' },
    view_count: { type: 'integer', notNull: true, default: 0 },
    favorite_count: { type: 'integer', notNull: true, default: 0 },
    application_count: { type: 'integer', notNull: true, default: 0 },
    search_vector: { type: 'tsvector' },
    tags: { type: 'text[]' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
  });

  // Index names mirror the monolith so dual-stack debugging stays legible.
  pgm.createIndex('pets', 'rescue_id', { name: 'pets_rescue_id_idx' });
  pgm.createIndex('pets', 'status', { name: 'pets_status_idx' });
  pgm.createIndex('pets', 'type', { name: 'pets_type_idx' });
  pgm.createIndex('pets', 'size', { name: 'pets_size_idx' });
  pgm.createIndex('pets', 'age_group', { name: 'pets_age_group_idx' });
  pgm.createIndex('pets', 'gender', { name: 'pets_gender_idx' });
  pgm.createIndex('pets', 'breed_id', { name: 'pets_breed_id_idx' });
  pgm.createIndex('pets', 'secondary_breed_id', { name: 'pets_secondary_breed_id_idx' });
  pgm.createIndex('pets', 'featured', { name: 'pets_featured_idx' });
  pgm.createIndex('pets', 'priority_listing', { name: 'pets_priority_idx' });
  pgm.createIndex('pets', 'created_at', { name: 'pets_created_at_idx' });
  pgm.createIndex('pets', 'available_since', { name: 'pets_available_since_idx' });
  // Partial unique — only one non-null microchip_id per row (the
  // redundant looser pets_microchip_id_key constraint comes from the
  // column-level unique above; both shapes appear in the monolith).
  pgm.createIndex('pets', 'microchip_id', {
    name: 'pets_microchip_unique',
    unique: true,
    where: 'microchip_id IS NOT NULL',
  });
  pgm.createIndex('pets', 'search_vector', { name: 'pets_search_vector_gin_idx', method: 'gin' });
  pgm.createIndex('pets', 'location', { name: 'pets_location_gist_idx', method: 'gist' });
  pgm.createIndex('pets', ['status', 'rescue_id'], { name: 'pets_status_rescue_idx' });
  pgm.createIndex('pets', ['status', 'type', 'size'], { name: 'pets_status_type_size_idx' });
  pgm.createIndex('pets', 'deleted_at', { name: 'pets_deleted_at_idx' });
  pgm.createIndex('pets', 'created_by', { name: 'pets_created_by_idx' });
  pgm.createIndex('pets', 'updated_by', { name: 'pets_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('pets');
  pgm.dropType('pet_status');
  pgm.dropType('pet_type');
  pgm.dropType('pet_gender');
  pgm.dropType('pet_size');
  pgm.dropType('pet_age_group');
  pgm.dropType('pet_energy_level');
  pgm.dropType('pet_vaccination_status');
  pgm.dropType('pet_spay_neuter_status');
};
