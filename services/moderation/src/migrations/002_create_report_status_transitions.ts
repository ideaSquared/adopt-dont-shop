import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — report_status_transitions.
//
// Direct port of service.backend's 00-baseline-042-report-status-transitions.ts.
// No created_at/updated_at/deleted_at — only `transitioned_at` tracks the
// event time. report_id FK is intra-schema with CASCADE; transitioned_by
// is a soft pointer to auth.users.
//
// The monolith's AFTER INSERT trigger that propagates to_status to
// reports.status ships in migration 003 here so the DB owns the
// invariant.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('report_status_transitions', {
    transition_id: { type: 'uuid', primaryKey: true },
    report_id: {
      type: 'uuid',
      notNull: true,
      references: 'reports(report_id)',
      onDelete: 'CASCADE',
    },
    from_status: { type: 'report_status' },
    to_status: { type: 'report_status', notNull: true },
    transitioned_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    transitioned_by: { type: 'uuid' },
    reason: { type: 'text' },
    metadata: { type: 'jsonb' },
  });

  pgm.createIndex('report_status_transitions', ['report_id', 'transitioned_at'], {
    name: 'report_status_transitions_report_id_at_idx',
  });
  pgm.createIndex('report_status_transitions', 'transitioned_by', {
    name: 'report_status_transitions_transitioned_by_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('report_status_transitions');
};
