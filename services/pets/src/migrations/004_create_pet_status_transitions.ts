import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — pet_status_transitions.
//
// Direct port of service.backend's 00-baseline-018-pet-status-transitions.ts
// INTO the `pets` schema. Append-only event log behind the pet status
// state machine — the row-level audit trail Phase 3's event sourcing
// reads/writes. pet_id is an INTRA-schema FK to pets.pet_id (ON DELETE
// CASCADE matches the monolith's nullable belongsTo + SET NULL... but the
// monolith keeps pet_id nullable; we CASCADE here so a deleted pet takes
// its transition log with it, which is the cleaner lifecycle for an
// extracted service that owns both tables). transitioned_by is forensic
// metadata with no FK (survives user deletion).
//
// from_status / to_status reuse the pet_status enum created in 002 —
// unlike the monolith (which derived a distinct type per column), the
// extracted schema shares one canonical enum.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('pet_status_transitions', {
    transition_id: { type: 'uuid', primaryKey: true },
    pet_id: {
      type: 'uuid',
      notNull: true,
      references: 'pets(pet_id)',
      onDelete: 'CASCADE',
    },
    from_status: { type: 'pet_status' },
    to_status: { type: 'pet_status', notNull: true },
    transitioned_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    transitioned_by: { type: 'uuid' },
    reason: { type: 'text' },
    metadata: { type: 'jsonb' },
  });

  pgm.createIndex('pet_status_transitions', ['pet_id', 'transitioned_at'], {
    name: 'pet_status_transitions_pet_id_at_idx',
  });
  pgm.createIndex('pet_status_transitions', 'transitioned_by', {
    name: 'pet_status_transitions_transitioned_by_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('pet_status_transitions');
};
