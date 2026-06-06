import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — home_visit_status_transitions.
//
// Append-only event log of home-visit status changes. Mirrors the
// monolith's 00-baseline-028 with the AFTER INSERT propagation
// trigger moved INTO the migration set (migration 006) so the DB
// owns the invariant — raw INSERT can't bypass the home_visits.status
// update.
//
// visit_id FK is intra-schema with CASCADE.
// transitioned_by is a soft pointer to auth.users; the monolith
// explicitly used `constraints: false` on this association so the
// actor reference survives user deletion. Same here.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('home_visit_status_transitions', {
    transition_id: { type: 'uuid', primaryKey: true },
    visit_id: {
      type: 'uuid',
      notNull: true,
      references: 'home_visits(visit_id)',
      onDelete: 'CASCADE',
    },
    from_status: { type: 'home_visit_status' },
    to_status: { type: 'home_visit_status', notNull: true },
    transitioned_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    transitioned_by: { type: 'uuid' },
    reason: { type: 'text' },
    metadata: { type: 'jsonb' },
  });

  pgm.createIndex('home_visit_status_transitions', ['visit_id', 'transitioned_at'], {
    name: 'home_visit_status_transitions_visit_id_at_idx',
  });
  pgm.createIndex('home_visit_status_transitions', 'transitioned_by', {
    name: 'home_visit_status_transitions_transitioned_by_idx',
    where: 'transitioned_by IS NOT NULL',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('home_visit_status_transitions');
};
