import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — application_timeline_notes.
//
// Free-text notes rescue staff attach to an application's timeline
// (ADS-1139) — separate from the event-sourced status-transition
// timeline (application_events, folded by timeline.ts). The gateway
// composes the two into the SPA's combined timeline view. application_id
// is an intra-schema FK (CASCADE); created_by is a cross-schema soft
// pointer to auth.users.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('application_timeline_notes', {
    note_id: { type: 'uuid', primaryKey: true },
    application_id: {
      type: 'uuid',
      notNull: true,
      references: 'applications(application_id)',
      onDelete: 'CASCADE',
    },
    title: { type: 'text', notNull: true },
    description: { type: 'text', notNull: true, default: '' },
    note_type: { type: 'text', notNull: true, default: 'general' },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('application_timeline_notes', ['application_id', 'created_at'], {
    name: 'application_timeline_notes_application_id_created_at_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('application_timeline_notes');
};
