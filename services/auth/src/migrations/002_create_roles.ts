import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — roles.
//
// Direct port of service.backend's 00-baseline-002-roles.ts. Reference
// data (no soft-delete). The model maps `name` to the column `role_name`,
// so the DDL column stays `role_name`. `role_id` is a SERIAL integer PK.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('roles', {
    role_id: { type: 'serial', primaryKey: true },
    role_name: { type: 'varchar(255)', notNull: true, unique: true },
    description: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('roles');
};
