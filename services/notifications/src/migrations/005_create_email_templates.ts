import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — email_templates + email_template_versions.
//
// Direct port of service.backend's 00-baseline-037-email-templates.ts
// and 00-baseline-038-email-template-versions.ts. Templates are the
// authoring surface; versions are the immutable snapshot history.
//
// FKs (parent_template_id self-ref, last_modified_by → auth.users,
// created_by/updated_by → auth.users) NOT declared — schema-per-service
// rule prevents cross-schema FKs. Application-level enforcement.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('email_template_type', [
    'transactional',
    'notification',
    'marketing',
    'system',
    'administrative',
  ]);
  pgm.createType('email_template_category', [
    'welcome',
    'password_reset',
    'email_verification',
    'application_update',
    'adoption_confirmation',
    'rescue_verification',
    'staff_invitation',
    'notification_digest',
    'reminder',
    'announcement',
    'newsletter',
    'system_alert',
  ]);
  pgm.createType('email_template_status', ['draft', 'active', 'inactive', 'archived']);

  pgm.createTable('email_templates', {
    template_id: { type: 'uuid', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true, unique: true },
    description: { type: 'text' },
    type: { type: 'email_template_type', notNull: true },
    category: { type: 'email_template_category', notNull: true },
    status: { type: 'email_template_status', notNull: true, default: 'draft' },
    subject: { type: 'varchar(500)', notNull: true },
    html_content: { type: 'text', notNull: true },
    text_content: { type: 'text' },
    variables: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    locale: { type: 'varchar(10)', notNull: true, default: 'en' },
    parent_template_id: { type: 'uuid' },
    current_version: { type: 'integer', notNull: true, default: 1 },
    is_default: { type: 'boolean', notNull: true, default: false },
    priority: { type: 'integer', notNull: true, default: 0 },
    tags: { type: 'text[]', notNull: true, default: pgm.func('ARRAY[]::text[]') },
    last_modified_by: { type: 'uuid' },
    last_used_at: { type: 'timestamptz' },
    usage_count: { type: 'integer', notNull: true, default: 0 },
    test_emails_sent: { type: 'integer', notNull: true, default: 0 },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('email_templates', 'type', { name: 'email_templates_type_idx' });
  pgm.createIndex('email_templates', 'category', { name: 'email_templates_category_idx' });
  pgm.createIndex('email_templates', 'status', { name: 'email_templates_status_idx' });
  pgm.createIndex('email_templates', 'locale', { name: 'email_templates_locale_idx' });
  pgm.createIndex('email_templates', 'is_default', { name: 'email_templates_is_default_idx' });
  pgm.createIndex('email_templates', 'parent_template_id', {
    name: 'email_templates_parent_template_id_idx',
  });
  pgm.createIndex('email_templates', 'last_used_at', { name: 'email_templates_last_used_at_idx' });
  pgm.createIndex('email_templates', 'tags', { method: 'gin', name: 'email_templates_tags_idx' });
  pgm.createIndex('email_templates', 'deleted_at', { name: 'email_templates_deleted_at_idx' });

  // email_template_versions — immutable history snapshots.
  pgm.createTable('email_template_versions', {
    version_id: { type: 'uuid', primaryKey: true },
    template_id: {
      type: 'uuid',
      notNull: true,
      references: '"email_templates"',
      onDelete: 'CASCADE',
    },
    version_number: { type: 'integer', notNull: true },
    subject: { type: 'varchar(500)', notNull: true },
    html_content: { type: 'text', notNull: true },
    text_content: { type: 'text' },
    variables: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    change_summary: { type: 'text' },
    created_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('email_template_versions', ['template_id', 'version_number'], {
    name: 'email_template_versions_template_id_version_unique',
    unique: true,
  });
  pgm.createIndex('email_template_versions', 'template_id', {
    name: 'email_template_versions_template_id_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('email_template_versions');
  pgm.dropTable('email_templates');
  pgm.dropType('email_template_status');
  pgm.dropType('email_template_category');
  pgm.dropType('email_template_type');
};
