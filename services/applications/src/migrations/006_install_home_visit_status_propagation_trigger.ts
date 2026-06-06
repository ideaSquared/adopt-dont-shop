import type { MigrationBuilder } from 'node-pg-migrate';

// AFTER INSERT trigger that propagates home_visit_status_transitions.to_status
// back to home_visits.status, replacing the monolith's
// installStatusTransitionTrigger afterSync hook for HomeVisitStatusTransition.
// The DB owns the invariant — raw INSERT into the transitions table
// automatically updates the parent visit's status (and updated_at),
// eliminating the service-side two-write coordination the monolith
// required.
//
// Same pattern as moderation's report_status_transitions trigger
// (#886, migration 003) and the monolith's behaviour for both.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION home_visits_propagate_status_transition() RETURNS TRIGGER AS $$
    BEGIN
      UPDATE home_visits
      SET status = NEW.to_status,
          updated_at = now()
      WHERE visit_id = NEW.visit_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    CREATE TRIGGER home_visit_status_transitions_propagate
    AFTER INSERT ON home_visit_status_transitions
    FOR EACH ROW
    EXECUTE FUNCTION home_visits_propagate_status_transition();
  `);
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(
    'DROP TRIGGER IF EXISTS home_visit_status_transitions_propagate ON home_visit_status_transitions;'
  );
  pgm.sql('DROP FUNCTION IF EXISTS home_visits_propagate_status_transition();');
};
