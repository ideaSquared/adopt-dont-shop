import type { MigrationBuilder } from 'node-pg-migrate';

// Cross-instance scheduled-run claims for service.auth's scheduler.
//
// Same table as services/audit/src/migrations/010_create_scheduled_job_runs.ts
// and services/notifications (ADS-1052/ADS-1325). Each intended run of a job
// is a row keyed by (job_name, scheduled_for), the interval-quantised slot; a
// replica claims a slot with INSERT ... ON CONFLICT DO NOTHING, and the
// primary key makes the claim atomic, so exactly one replica runs a given slot.
// Used by the suspension-expiry job.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('scheduled_job_runs', {
    job_name: { type: 'text', notNull: true },
    scheduled_for: { type: 'timestamptz', notNull: true },
    claimed_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('scheduled_job_runs', 'scheduled_job_runs_pkey', {
    primaryKey: ['job_name', 'scheduled_for'],
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('scheduled_job_runs');
};
