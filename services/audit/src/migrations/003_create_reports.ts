import type { MigrationBuilder } from 'node-pg-migrate';

// Reports state — saved_reports + report_templates.
//
// Port of the monolith's service.backend/src/models/{SavedReport,
// ReportTemplate}.ts. The compute engine (analytics aggregations) stays
// in the monolith for now; service.audit owns the persistent shape so
// the admin SPA can save / list / delete report configs without hitting
// the monolith for every CRUD.
//
// Config is a free-form JSONB blob — the SPA validates against the
// monolith's ReportConfig schema and persists it as-is here. Keeping
// the schema flexible means a future widget type doesn't require a
// migration on the audit service.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('report_template_category', [
    'adoption',
    'engagement',
    'operations',
    'fundraising',
    'custom',
  ]);

  pgm.createTable('report_templates', {
    template_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    category: { type: 'report_template_category', notNull: true },
    config: { type: 'jsonb', notNull: true },
    is_system: { type: 'boolean', notNull: true, default: false },
    rescue_id: { type: 'uuid' },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });
  pgm.createIndex('report_templates', 'category', { name: 'report_templates_category_idx' });
  pgm.createIndex('report_templates', 'rescue_id', { name: 'report_templates_rescue_idx' });
  pgm.createIndex('report_templates', 'is_system', { name: 'report_templates_system_idx' });

  pgm.createTable('saved_reports', {
    saved_report_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true },
    rescue_id: { type: 'uuid' },
    template_id: { type: 'uuid' },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    config: { type: 'jsonb', notNull: true },
    is_archived: { type: 'boolean', notNull: true, default: false },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });
  pgm.createIndex('saved_reports', ['rescue_id', 'user_id'], {
    name: 'saved_reports_rescue_user_idx',
  });
  pgm.createIndex('saved_reports', 'template_id', { name: 'saved_reports_template_idx' });
  pgm.createIndex('saved_reports', 'is_archived', { name: 'saved_reports_archived_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('saved_reports');
  pgm.dropTable('report_templates');
  pgm.dropType('report_template_category');
};
