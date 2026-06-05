import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — permissions.
//
// Direct port of service.backend's 00-baseline-003-permissions.ts.
// Reference data. `permission_name` holds the `<resource>.<action>`
// strings (lib.types.Permission). SERIAL integer PK.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('permissions', {
    permission_id: { type: 'serial', primaryKey: true },
    permission_name: { type: 'varchar(255)', notNull: true, unique: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('permissions');
};
