import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — foster_placements.
//
// Direct port of service.backend's 03-create-foster-placements.ts INTO
// the `rescue` schema. Tracks active/completed/cancelled foster runs
// per pet per rescue. Partial-unique constraint enforces "one ACTIVE
// placement per pet", soft-deletes excluded so historical rows don't
// block a re-foster after cancel/complete.
//
// rescue_id is INTRA-schema FK → rescues (ON DELETE CASCADE).
// foster_user_id → auth.users and pet_id → pets.pets are CROSS-schema
// pointers, FK-free in this extracted shape — the application-side
// invariants stay enforced via the gRPC handlers + the consuming
// services' own FK shapes.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('foster_placement_status', ['active', 'completed', 'cancelled']);

  pgm.createTable('foster_placements', {
    placement_id: { type: 'uuid', primaryKey: true },
    pet_id: { type: 'uuid', notNull: true },
    foster_user_id: { type: 'uuid', notNull: true },
    rescue_id: {
      type: 'uuid',
      notNull: true,
      references: 'rescues(rescue_id)',
      onDelete: 'CASCADE',
    },
    start_date: { type: 'timestamptz', notNull: true },
    end_date: { type: 'timestamptz' },
    status: { type: 'foster_placement_status', notNull: true, default: 'active' },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('foster_placements', 'pet_id', { name: 'foster_placements_pet_id_idx' });
  pgm.createIndex('foster_placements', 'foster_user_id', {
    name: 'foster_placements_foster_user_id_idx',
  });
  pgm.createIndex('foster_placements', 'rescue_id', { name: 'foster_placements_rescue_id_idx' });
  pgm.createIndex('foster_placements', 'status', { name: 'foster_placements_status_idx' });
  // Partial unique — at most ONE active placement per pet at a time.
  pgm.createIndex('foster_placements', 'pet_id', {
    name: 'foster_placements_one_active_per_pet',
    unique: true,
    where: "status = 'active' AND deleted_at IS NULL",
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('foster_placements');
  pgm.dropType('foster_placement_status');
};
