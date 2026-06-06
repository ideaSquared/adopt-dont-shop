import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — moderation_evidence.
//
// Direct port of service.backend's 00-baseline-048-moderation-evidence.ts.
// Polymorphic via (parent_type, parent_id) — no DB-level FK to a single
// parent table by design. parent_id is uuid because both report_id and
// action_id are uuids. (Distinct from reports.reported_entity_id which
// is varchar because it points across schemas where ids can be other
// shapes.)
//
// `paranoid: false` — no deleted_at column.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('moderation_evidence_parent_type', ['report', 'moderator_action']);
  pgm.createType('moderation_evidence_type', ['screenshot', 'url', 'text', 'file']);

  pgm.createTable('moderation_evidence', {
    evidence_id: { type: 'uuid', primaryKey: true },
    parent_type: { type: 'moderation_evidence_parent_type', notNull: true },
    parent_id: { type: 'uuid', notNull: true },
    type: { type: 'moderation_evidence_type', notNull: true },
    content: { type: 'text', notNull: true },
    description: { type: 'text' },
    uploaded_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('moderation_evidence', ['parent_type', 'parent_id'], {
    name: 'moderation_evidence_parent_idx',
  });
  pgm.createIndex('moderation_evidence', 'created_by', {
    name: 'moderation_evidence_created_by_idx',
  });
  pgm.createIndex('moderation_evidence', 'updated_by', {
    name: 'moderation_evidence_updated_by_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('moderation_evidence');
  pgm.dropType('moderation_evidence_parent_type');
  pgm.dropType('moderation_evidence_type');
};
