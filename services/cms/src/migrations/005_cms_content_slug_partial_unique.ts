import type { MigrationBuilder } from 'node-pg-migrate';

// ADS-1182 — slug uniqueness must span only live rows.
//
// Migration 001 declared `slug` with a column-level `unique: true`, which
// Postgres enforces over EVERY row (auto-named constraint cms_content_slug_key).
// Because deletes are soft (deleteContent sets deleted_at), a slug freed by a
// soft delete still occupied that index: generateSlug and reads filter
// `deleted_at IS NULL` and report the slug free, but createContent's INSERT then
// tripped the all-rows constraint (23505 → ALREADY_EXISTS), permanently
// reserving the slug.
//
// Fix: drop the all-rows UNIQUE constraint and replace it with a PARTIAL unique
// index over live rows only, so the DB agrees with the handlers — a slug is
// unique among non-deleted rows and becomes reusable once its row is
// soft-deleted.

const LIVE_SLUG_INDEX = 'cms_content_slug_live_unique_idx';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropConstraint('cms_content', 'cms_content_slug_key', { ifExists: true });
  pgm.createIndex('cms_content', 'slug', {
    name: LIVE_SLUG_INDEX,
    unique: true,
    where: 'deleted_at IS NULL',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('cms_content', 'slug', { name: LIVE_SLUG_INDEX, ifExists: true });
  pgm.addConstraint('cms_content', 'cms_content_slug_key', { unique: 'slug' });
};
