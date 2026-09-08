import type { MigrationBuilder } from 'node-pg-migrate';

// Cross-instance scheduled-run claims (ADS-1320, mirrors
// services/notifications/src/migrations/010_create_scheduled_job_runs.ts).
//
// The tick scheduler (src/scheduler/) runs per-replica; without a shared
// claim, every replica would run the application-drafts retention purge on
// every interval. Each intended run is a row keyed by (job_name,
// scheduled_for) — the interval-quantised slot. A replica claims a slot
// with INSERT ... ON CONFLICT DO NOTHING; the primary key makes the claim
// atomic, so exactly one replica runs a given slot.

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
