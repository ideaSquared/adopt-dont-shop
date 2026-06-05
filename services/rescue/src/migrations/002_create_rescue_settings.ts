import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — rescue_settings.
//
// Direct port of service.backend's 00-baseline-013-rescue-settings.ts.
// 1:1 typed preference table for `rescues`. rescue_id is BOTH the PK
// and the INTRA-schema FK → rescues.rescue_id (ON DELETE CASCADE —
// settings die with their parent).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('rescue_settings', {
    rescue_id: {
      type: 'uuid',
      primaryKey: true,
      references: 'rescues(rescue_id)',
      onDelete: 'CASCADE',
    },
    auto_approve_applications: { type: 'boolean', notNull: true, default: false },
    require_home_visit: { type: 'boolean', notNull: true, default: true },
    require_references: { type: 'boolean', notNull: true, default: true },
    min_adopter_age: { type: 'integer', notNull: true, default: 18 },
    allow_out_of_area_adoptions: { type: 'boolean', notNull: true, default: false },
    application_expiry_days: { type: 'integer', notNull: true, default: 30 },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('rescue_settings', 'created_by', { name: 'rescue_settings_created_by_idx' });
  pgm.createIndex('rescue_settings', 'updated_by', { name: 'rescue_settings_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('rescue_settings');
};
