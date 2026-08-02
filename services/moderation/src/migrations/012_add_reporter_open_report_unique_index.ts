import type { MigrationBuilder } from 'node-pg-migrate';

// Per-reporter dedup for user-filed reports (ADS-1019).
//
// 009 added a SYSTEM-scoped unique arbiter so redelivered auto-reports don't
// duplicate, but deliberately left user reports un-deduped — which let one
// account insert unbounded reports against the same entity, flooding the
// moderator queue and manufacturing an apparent repeat-offender pattern.
//
// This adds the mirror constraint for real users: at most one OPEN report per
// (reporter_id, reported_entity_type, reported_entity_id). Scoped to open
// statuses (pending / under_review / escalated) so a reporter may file again
// once their earlier report is resolved or dismissed. FileReport's ON CONFLICT
// targets exactly this partial index.

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const OPEN_STATUSES = "('pending', 'under_review', 'escalated')";
const REPORTER_OPEN_UNIQUE = 'reports_reporter_open_report_uniq';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  // Dedupe pre-existing open duplicates so the unique index can be built:
  // keep the earliest-created open report per (reporter, entity) and delete
  // the rest. report_status_transitions cascade on delete (002).
  pgm.sql(`
    DELETE FROM reports r
    WHERE r.reporter_id <> '${SYSTEM_USER_ID}'
      AND r.status IN ${OPEN_STATUSES}
      AND EXISTS (
        SELECT 1 FROM reports keep
        WHERE keep.reporter_id = r.reporter_id
          AND keep.reported_entity_type = r.reported_entity_type
          AND keep.reported_entity_id = r.reported_entity_id
          AND keep.reporter_id <> '${SYSTEM_USER_ID}'
          AND keep.status IN ${OPEN_STATUSES}
          AND (
            keep.created_at < r.created_at
            OR (keep.created_at = r.created_at AND keep.report_id < r.report_id)
          )
      )
  `);

  pgm.createIndex('reports', ['reporter_id', 'reported_entity_type', 'reported_entity_id'], {
    name: REPORTER_OPEN_UNIQUE,
    unique: true,
    where: `reporter_id <> '${SYSTEM_USER_ID}' AND status IN ${OPEN_STATUSES}`,
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('reports', ['reporter_id', 'reported_entity_type', 'reported_entity_id'], {
    name: REPORTER_OPEN_UNIQUE,
  });
};
