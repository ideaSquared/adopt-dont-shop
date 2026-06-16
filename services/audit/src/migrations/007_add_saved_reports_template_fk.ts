import type { MigrationBuilder } from 'node-pg-migrate';

// saved_reports.template_id was declared `uuid` with only an index — no FK
// to report_templates (ADS-785). A row could silently reference a
// non-existent or hard-deleted template, leaving the admin UI to guess.
//
// Add the FK with ON DELETE SET NULL so deleting a template detaches its
// saved reports rather than orphaning them. Before adding the constraint we
// NULL any rows that already point at a template that no longer exists,
// otherwise the ALTER would fail validation against existing data.
//
// rescue_id and user_id are intentionally NOT FK'd: they reference rows in
// other services' schemas (rescue.*, auth.*), and cross-schema/cross-service
// FKs are deliberately avoided here — service.audit owns only its own tables.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  // Pre-migration cleanup: detach any orphaned references so the FK validates.
  pgm.sql(`
    UPDATE saved_reports sr
    SET template_id = NULL
    WHERE sr.template_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM report_templates rt WHERE rt.template_id = sr.template_id
      )
  `);

  pgm.addConstraint('saved_reports', 'saved_reports_template_id_fk', {
    foreignKeys: {
      columns: 'template_id',
      references: 'report_templates(template_id)',
      onDelete: 'SET NULL',
    },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropConstraint('saved_reports', 'saved_reports_template_id_fk');
};
