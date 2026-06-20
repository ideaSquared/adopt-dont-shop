import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — application_defaults.
//
// One row per adopter holding the reusable personal/living-situation/
// pet-experience/references data used to pre-populate new applications.
// user_id is a cross-schema soft pointer (auth.users) — no DB REFERENCES
// per the schema-per-service rule. The whole defaults blob is stored as
// a single JSONB column; the gRPC surface (GetApplicationDefaults /
// UpdateApplicationDefaults) reads/merges it as JSON rather than
// exploding it into columns, since its shape is owned by the SPA, not
// this service.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('application_defaults', {
    user_id: { type: 'uuid', primaryKey: true },
    data: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('application_defaults');
};
