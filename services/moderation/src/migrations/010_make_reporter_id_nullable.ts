import type { MigrationBuilder } from 'node-pg-migrate';

// Make reports.reporter_id nullable so GDPR erasure can anonymise it.
//
// The baseline (001) declared reporter_id NOT NULL, but gdpr/erase.ts
// anonymises a departing user's filed reports by setting
// reporter_id = NULL (keeping the row so the reported party's history
// stays intact). With the NOT NULL constraint that UPDATE throws a
// constraint violation and tears down the whole erasure saga for any
// user who has ever filed a report.
//
// Dropping NOT NULL is the minimal fix that matches the erase intent
// (anonymise, don't reassign): we can't reassign to the SYSTEM sentinel
// without colliding with the system-autoreport unique index (009) and
// mislabelling the row as an auto-report.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.alterColumn('reports', 'reporter_id', { notNull: false });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.alterColumn('reports', 'reporter_id', { notNull: true });
};
