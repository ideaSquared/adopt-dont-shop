import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — application_reference_checks.
//
// Minimal-viable reference-check workflow (ADS-1140): rescue staff
// record the contact outcome (pending → contacted → completed |
// failed) for a referee named on an application. The referee list
// itself stays the event-sourced Application.references_json (name /
// email / relationship, wholesale-replaced via SaveDraftAnswers) — this
// table only tracks operational status ABOUT a referee, seeded lazily
// from that list the first time UpdateReferenceCheck touches it. Plain
// non-aggregate data, so a table + raw-SQL handler (not a domain
// command) per the applications service's architecture split.
//
// application_id is an intra-schema FK (CASCADE) — both tables live in
// the applications schema. reference_id mirrors the frontend's
// array-index id scheme ("ref-0", "ref-1", …) so a PATCH round-trips
// against the same key the SPA derived from the referee list.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('reference_check_status', ['pending', 'contacted', 'completed', 'failed']);

  pgm.createTable('application_reference_checks', {
    application_id: {
      type: 'uuid',
      notNull: true,
      references: 'applications(application_id)',
      onDelete: 'CASCADE',
    },
    reference_id: { type: 'text', notNull: true },
    name: { type: 'text', notNull: true, default: '' },
    email: { type: 'text', notNull: true, default: '' },
    relationship: { type: 'text', notNull: true, default: '' },
    status: { type: 'reference_check_status', notNull: true, default: 'pending' },
    notes: { type: 'text' },
    contacted_at: { type: 'timestamptz' },
    contacted_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('application_reference_checks', 'application_reference_checks_pkey', {
    primaryKey: ['application_id', 'reference_id'],
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('application_reference_checks');
  pgm.dropType('reference_check_status');
};
