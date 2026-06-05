import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — ratings.
//
// Direct port of service.backend's 00-baseline-015-ratings.ts INTO the
// `pets` schema. Polymorphic review row (pet / rescue / user / application
// / experience). pet_id is the only INTRA-schema FK kept (→ pets.pet_id,
// ON DELETE SET NULL — a deleted pet shouldn't erase the reviewer's
// rating history). reviewer_id / reviewee_id → auth.users, rescue_id →
// rescue schema, application_id → applications schema: all CROSS-schema,
// left FK-free.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('rating_type', ['pet', 'rescue', 'user', 'application', 'experience']);
  pgm.createType('rating_category', [
    'overall',
    'communication',
    'process',
    'care',
    'follow_up',
    'value',
    'recommendation',
  ]);

  pgm.createTable('ratings', {
    rating_id: { type: 'uuid', primaryKey: true },
    reviewer_id: { type: 'uuid', notNull: true },
    reviewee_id: { type: 'uuid' },
    pet_id: {
      type: 'uuid',
      references: 'pets(pet_id)',
      onDelete: 'SET NULL',
    },
    rescue_id: { type: 'uuid' },
    application_id: { type: 'uuid' },
    rating_type: { type: 'rating_type', notNull: true },
    category: { type: 'rating_category', notNull: true },
    score: { type: 'integer', notNull: true },
    title: { type: 'varchar(200)' },
    review_text: { type: 'text' },
    pros: { type: 'jsonb' },
    cons: { type: 'jsonb' },
    helpful_count: { type: 'integer', notNull: true, default: 0 },
    reported_count: { type: 'integer', notNull: true, default: 0 },
    is_verified: { type: 'boolean', notNull: true, default: false },
    is_anonymous: { type: 'boolean', notNull: true, default: false },
    is_featured: { type: 'boolean', notNull: true, default: false },
    is_moderated: { type: 'boolean', notNull: true, default: false },
    moderation_notes: { type: 'text' },
    response_text: { type: 'text' },
    response_date: { type: 'timestamptz' },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('ratings', ['rating_type', 'category'], {
    name: 'ratings_rating_type_category',
  });
  pgm.createIndex('ratings', 'pet_id', { name: 'ratings_pet_id_idx' });
  pgm.createIndex('ratings', 'rescue_id', { name: 'ratings_rescue_id_idx' });
  pgm.createIndex('ratings', 'reviewer_id', { name: 'ratings_reviewer_id_idx' });
  pgm.createIndex('ratings', 'reviewee_id', { name: 'ratings_reviewee_id_idx' });
  pgm.createIndex('ratings', 'application_id', { name: 'ratings_application_id_idx' });
  pgm.createIndex('ratings', 'score', { name: 'ratings_score' });
  pgm.createIndex('ratings', 'is_featured', { name: 'ratings_is_featured' });
  pgm.createIndex('ratings', 'is_moderated', { name: 'ratings_is_moderated' });
  pgm.createIndex('ratings', 'created_at', { name: 'ratings_created_at' });
  pgm.createIndex('ratings', 'created_by', { name: 'ratings_created_by_idx' });
  pgm.createIndex('ratings', 'updated_by', { name: 'ratings_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('ratings');
  pgm.dropType('rating_type');
  pgm.dropType('rating_category');
};
