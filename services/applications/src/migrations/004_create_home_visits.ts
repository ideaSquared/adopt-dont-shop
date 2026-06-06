import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — home_visits.
//
// Direct port of service.backend's 00-baseline-027-home-visits.ts.
// application_id FK is intra-schema with CASCADE — dropping an
// application drops its visits. assigned_staff / created_by /
// updated_by are cross-schema soft pointers to auth.users.
//
// Two enums: status (scheduled → in_progress → completed | cancelled)
// and outcome (approved | rejected | conditional). The status state
// machine is propagated from home_visit_status_transitions via the
// trigger installed in migration 006.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('home_visit_status', ['scheduled', 'in_progress', 'completed', 'cancelled']);
  pgm.createType('home_visit_outcome', ['approved', 'rejected', 'conditional']);

  pgm.createTable('home_visits', {
    visit_id: { type: 'uuid', primaryKey: true },
    application_id: {
      type: 'uuid',
      notNull: true,
      references: 'applications(application_id)',
      onDelete: 'CASCADE',
    },
    scheduled_date: { type: 'date', notNull: true },
    scheduled_time: { type: 'time', notNull: true },
    assigned_staff: { type: 'uuid' },
    status: { type: 'home_visit_status', notNull: true, default: 'scheduled' },
    notes: { type: 'text' },
    outcome: { type: 'home_visit_outcome' },
    outcome_notes: { type: 'text' },
    reschedule_reason: { type: 'text' },
    cancelled_reason: { type: 'text' },
    completed_at: { type: 'timestamptz' },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    version: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.createIndex('home_visits', 'application_id', { name: 'home_visits_application_id_idx' });
  pgm.createIndex('home_visits', 'status', { name: 'home_visits_status_idx' });
  pgm.createIndex('home_visits', 'assigned_staff', { name: 'home_visits_assigned_staff_idx' });
  pgm.createIndex('home_visits', 'scheduled_date', { name: 'home_visits_scheduled_date_idx' });
  pgm.createIndex('home_visits', 'created_by', { name: 'home_visits_created_by_idx' });
  pgm.createIndex('home_visits', 'updated_by', { name: 'home_visits_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('home_visits');
  pgm.dropType('home_visit_status');
  pgm.dropType('home_visit_outcome');
};
