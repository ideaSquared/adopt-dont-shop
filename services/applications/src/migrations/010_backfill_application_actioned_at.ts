import type { MigrationBuilder } from 'node-pg-migrate';

// Backfill — applications.actioned_at (ADS-1025).
//
// actioned_at existed on the applications table since 002 but was never
// written. From this change on, event-store.ts's projectReadModel stamps
// it whenever the fold transitions to approved/adopted, so the
// CountAdoptedAdopters attribution query can filter on "when the
// application reached its decision" — the rule its proto comment has
// always documented — instead of created_at.
//
// This migration backfills the rows that reached that decision BEFORE
// the projector started writing the column: for every application
// already sitting at approved/adopted with actioned_at still NULL, find
// the event in the application_events store whose type matches the
// application's current status (there is at most one 'approved' event
// and at most one 'adopted' event per aggregate — the domain doesn't
// allow re-deciding) and copy its occurred_at across.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(`
    UPDATE applications
       SET actioned_at = latest.occurred_at
      FROM (
        SELECT aggregate_id, event_type, occurred_at,
               ROW_NUMBER() OVER (
                 PARTITION BY aggregate_id, event_type ORDER BY version DESC
               ) AS rn
          FROM application_events
         WHERE event_type IN ('approved', 'adopted')
      ) AS latest
     WHERE applications.application_id = latest.aggregate_id
       AND applications.status = latest.event_type
       AND latest.rn = 1
       AND applications.status IN ('approved', 'adopted')
       AND applications.actioned_at IS NULL;
  `);
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  // Reverses the backfill by clearing actioned_at on approved/adopted
  // rows. Caveat: if the projector (event-store.ts) has by this point
  // already started writing actioned_at for NEW decisions, those live
  // values are cleared too — a column-level backfill migration can't
  // distinguish "backfilled by this migration" from "written by the
  // projector" after the fact.
  pgm.sql(`
    UPDATE applications
       SET actioned_at = NULL
     WHERE status IN ('approved', 'adopted');
  `);
};
