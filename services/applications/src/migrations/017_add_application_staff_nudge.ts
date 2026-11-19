import type { MigrationBuilder } from 'node-pg-migrate';

// Staff inactivity nudge (ADS-1463, AC #2).
//
// last_nudged_at lets the stale-application job
// (src/jobs/application-staff-nudge.ts) tell "already nudged" apart from
// "never nudged" so a long-open application is only ever reminded once,
// instead of every job tick. Nullable, expand-only: existing rows default
// to NULL (never nudged).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumn('applications', {
    last_nudged_at: { type: 'timestamptz' },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropColumn('applications', 'last_nudged_at');
};
