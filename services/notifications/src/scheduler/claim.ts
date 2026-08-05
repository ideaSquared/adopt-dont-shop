// Cross-instance scheduled-run claim (ADS-1052).
//
// The scheduler runs per-replica with an in-memory nextRunAt, so with >1
// replica each would independently fire the weekly digest — duplicate
// emails. `claimScheduledRun` makes a given (job, scheduled-slot) run
// exclusive across replicas: the first replica to INSERT the slot row wins
// and runs the job; every other replica's INSERT hits the primary-key
// conflict, is a no-op, and skips.
//
// INSERT ... ON CONFLICT DO NOTHING is the atomic claim — Postgres
// serialises the concurrent inserts on the primary key, so exactly one of
// two concurrent claimants sees rowCount === 1. (The email queue uses
// FOR UPDATE SKIP LOCKED to drain a queue of many rows; a single-slot claim
// is cleaner as an idempotent insert — no pre-seeded rows to lock.)

import type { Pool, PoolClient } from 'pg';

export type DbConn = Pool | PoolClient;

export const claimScheduledRun = async (
  conn: DbConn,
  jobName: string,
  scheduledFor: Date
): Promise<boolean> => {
  const res = await conn.query(
    `INSERT INTO scheduled_job_runs (job_name, scheduled_for)
     VALUES ($1, $2)
     ON CONFLICT (job_name, scheduled_for) DO NOTHING`,
    [jobName, scheduledFor]
  );
  return res.rowCount === 1;
};
