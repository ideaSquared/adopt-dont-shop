import type { MigrationBuilder } from 'node-pg-migrate';

// cms.cms_content — pages, blog posts, help articles. Direct port of
// service.backend's 00-baseline-060-cms-content.ts migration.
//
// version history is stored as a JSON blob on the row (matches the
// monolith's `versions` JSONB column) so we don't pay a join for the
// admin "show me what changed" view. metaKeywords is a TEXT[] for the
// same reason — Postgres handles small arrays cheaply, and the admin
// UI doesn't need to query by individual keywords.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('content_type', ['page', 'blog_post', 'help_article']);
  pgm.createType('content_status', ['draft', 'published', 'archived', 'scheduled']);

  pgm.createTable('cms_content', {
    content_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    title: { type: 'varchar(500)', notNull: true },
    slug: { type: 'varchar(500)', notNull: true, unique: true },
    content_type: { type: 'content_type', notNull: true },
    status: { type: 'content_status', notNull: true, default: 'draft' },
    content: { type: 'text', notNull: true, default: '' },
    excerpt: { type: 'text' },
    meta_title: { type: 'varchar(500)' },
    meta_description: { type: 'text' },
    meta_keywords: { type: 'text[]', notNull: true, default: '{}' },
    featured_image_url: { type: 'varchar(2000)' },
    published_at: { type: 'timestamptz' },
    scheduled_publish_at: { type: 'timestamptz' },
    scheduled_unpublish_at: { type: 'timestamptz' },
    versions: { type: 'jsonb', notNull: true, default: '[]' },
    current_version: { type: 'integer', notNull: true, default: 1 },
    author_id: { type: 'uuid', notNull: true },
    last_modified_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('cms_content', 'content_type', { name: 'cms_content_type_idx' });
  pgm.createIndex('cms_content', 'status', { name: 'cms_content_status_idx' });
  pgm.createIndex('cms_content', 'author_id', { name: 'cms_content_author_idx' });
  pgm.createIndex('cms_content', 'published_at', { name: 'cms_content_published_at_idx' });
  pgm.createIndex('cms_content', 'scheduled_publish_at', {
    name: 'cms_content_scheduled_publish_at_idx',
  });
  pgm.createIndex('cms_content', 'deleted_at', { name: 'cms_content_deleted_at_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('cms_content');
  pgm.dropType('content_status');
  pgm.dropType('content_type');
};
