// Staff inactivity nudge (ADS-1463, AC #2).
//
// An application sitting open (submitted but not yet decided) with no
// action for `inactivityDays` gets one applications.staffNudgeDue event,
// which service.notifications fans out to the rescue's staff the same way
// it already does for rescue.verified. Each batch stamps last_nudged_at on
// the rows it nudges (migration 017) in the same transaction as the
// publish, so an application is only ever nudged once — per-rescue
// configurability of the threshold, and repeat reminders, are left for a
// follow-up, same as the fixed-default first step already taken for the
// adopter acknowledgement copy.

import { withTransaction } from '@adopt-dont-shop/events';

import type { HandlerDeps } from '../grpc/adapter.js';

// Open, not-yet-decided states — mirrors the lifecycle in
// migrations/002_create_applications.ts. draft/approved/rejected/
// withdrawn/adopted are excluded: a draft was never submitted, and the
// rest already reached a decision (actioned_at is set).
const OPEN_STATUSES = [
  'submitted',
  'under_review',
  'home_visit_scheduled',
  'home_visit_completed',
] as const;

export type ApplicationStaffNudgeOptions = {
  // Days with no action before an open application is nudged.
  inactivityDays: number;
  // Max rows nudged per transaction. Bounds lock/transaction duration.
  batchSize: number;
};

export type ApplicationStaffNudgeResult = {
  nudgedCount: number;
};

type NudgedRow = {
  application_id: string;
  rescue_id: string;
  pet_id: string;
  user_id: string;
  updated_at: string;
};

export async function sendApplicationStaffNudges(
  deps: HandlerDeps,
  opts: ApplicationStaffNudgeOptions
): Promise<ApplicationStaffNudgeResult> {
  let nudgedCount = 0;

  for (;;) {
    const batchNudged = await withTransaction(deps, async ({ client, publish }) => {
      // SELECT + stamp in one statement: the row-level lock an UPDATE takes
      // means a second replica racing the same tick blocks on these rows,
      // then re-checks last_nudged_at IS NULL once unblocked (not an issue
      // in practice — the scheduler's claimRun already restricts the job to
      // one replica per tick, this is just defence in depth).
      const { rows } = await client.query<NudgedRow>(
        `UPDATE applications
            SET last_nudged_at = now()
          WHERE application_id IN (
                  SELECT application_id
                    FROM applications
                   WHERE status = ANY($1::application_status[])
                     AND deleted_at IS NULL
                     AND actioned_at IS NULL
                     AND last_nudged_at IS NULL
                     -- Inactivity, not age: projectReadModel refreshes
                     -- updated_at on every domain command (submit, review,
                     -- home visit, …), and never writes submitted_at, so
                     -- that column is NULL for every service-made row.
                     AND updated_at < now() - ($2 || ' days')::interval
                   ORDER BY updated_at
                   LIMIT $3
                )
          RETURNING application_id, rescue_id, pet_id, user_id, updated_at`,
        [OPEN_STATUSES, opts.inactivityDays, opts.batchSize]
      );

      for (const row of rows) {
        publish({
          type: 'applications.staffNudgeDue',
          id: `applications.staffNudgeDue.${row.application_id}`,
          payload: {
            applicationId: row.application_id,
            rescueId: row.rescue_id,
            petId: row.pet_id,
            adopterId: row.user_id,
            lastActivityAt: new Date(row.updated_at).toISOString(),
            inactivityDays: opts.inactivityDays,
          },
        });
      }

      return rows.length;
    });

    nudgedCount += batchNudged;
    if (batchNudged < opts.batchSize) {
      break;
    }
  }

  return { nudgedCount };
}
