import type { MigrationBuilder } from 'node-pg-migrate';

// AFTER INSERT trigger that propagates report_status_transitions.to_status
// back to reports.status, replacing the monolith's
// installStatusTransitionTrigger afterSync hook. The DB owns the
// invariant — raw INSERT into report_status_transitions automatically
// updates the parent report's status (and updated_at), eliminating the
// service-side two-write coordination the monolith required.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION reports_propagate_status_transition() RETURNS TRIGGER AS $$
    BEGIN
      UPDATE reports
      SET status = NEW.to_status,
          updated_at = now()
      WHERE report_id = NEW.report_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    CREATE TRIGGER report_status_transitions_propagate
    AFTER INSERT ON report_status_transitions
    FOR EACH ROW
    EXECUTE FUNCTION reports_propagate_status_transition();
  `);
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(
    'DROP TRIGGER IF EXISTS report_status_transitions_propagate ON report_status_transitions;'
  );
  pgm.sql('DROP FUNCTION IF EXISTS reports_propagate_status_transition();');
};
