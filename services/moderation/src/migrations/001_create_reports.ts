import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — reports.
//
// Direct port of service.backend's 00-baseline-041-reports.ts INTO the
// `moderation` schema. Cross-schema FK targets (reporter_id /
// reported_user_id / assigned_moderator / resolved_by / escalated_to /
// created_by / updated_by reference auth.users) are declared as plain
// uuid — no DB REFERENCES, schema-per-service rule keeps integrity
// application-side via gRPC. evidence lives in moderation_evidence
// (polymorphic).
//
// reported_entity_id is a STRING in the monolith because the polymorphic
// target can be a uuid (user, rescue, etc.) or any other id shape.
// Carrying that fidelity here.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('report_entity_type', [
    'user',
    'rescue',
    'pet',
    'application',
    'message',
    'conversation',
  ]);
  pgm.createType('report_category', [
    'inappropriate_content',
    'spam',
    'harassment',
    'false_information',
    'scam',
    'animal_welfare',
    'identity_theft',
    'other',
  ]);
  pgm.createType('report_severity', ['low', 'medium', 'high', 'critical']);
  pgm.createType('report_status', [
    'pending',
    'under_review',
    'resolved',
    'dismissed',
    'escalated',
  ]);

  pgm.createTable('reports', {
    report_id: { type: 'uuid', primaryKey: true },
    reporter_id: { type: 'uuid', notNull: true },
    reported_entity_type: { type: 'report_entity_type', notNull: true },
    reported_entity_id: { type: 'varchar(255)', notNull: true },
    reported_user_id: { type: 'uuid' },
    category: { type: 'report_category', notNull: true },
    severity: { type: 'report_severity', notNull: true, default: 'medium' },
    status: { type: 'report_status', notNull: true, default: 'pending' },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text', notNull: true },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
    assigned_moderator: { type: 'uuid' },
    assigned_at: { type: 'timestamptz' },
    resolved_by: { type: 'uuid' },
    resolved_at: { type: 'timestamptz' },
    resolution: { type: 'varchar(100)' },
    resolution_notes: { type: 'text' },
    escalated_to: { type: 'uuid' },
    escalated_at: { type: 'timestamptz' },
    escalation_reason: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.createIndex('reports', 'reporter_id', { name: 'reports_reporter_id_idx' });
  pgm.createIndex('reports', ['reported_entity_type', 'reported_entity_id'], {
    name: 'reports_reported_entity_idx',
  });
  pgm.createIndex('reports', 'reported_user_id', { name: 'reports_reported_user_id_idx' });
  pgm.createIndex('reports', 'category', { name: 'reports_category_idx' });
  pgm.createIndex('reports', 'status', { name: 'reports_status_idx' });
  pgm.createIndex('reports', 'severity', { name: 'reports_severity_idx' });
  pgm.createIndex('reports', 'assigned_moderator', { name: 'reports_assigned_moderator_idx' });
  pgm.createIndex('reports', 'resolved_by', { name: 'reports_resolved_by_idx' });
  pgm.createIndex('reports', 'escalated_to', { name: 'reports_escalated_to_idx' });
  pgm.createIndex('reports', 'created_at', { name: 'reports_created_at_idx' });
  pgm.createIndex('reports', 'created_by', { name: 'reports_created_by_idx' });
  pgm.createIndex('reports', 'updated_by', { name: 'reports_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('reports');
  pgm.dropType('report_entity_type');
  pgm.dropType('report_category');
  pgm.dropType('report_severity');
  pgm.dropType('report_status');
};
