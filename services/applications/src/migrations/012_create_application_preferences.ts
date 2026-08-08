import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — application_preferences.
//
// One row per adopter holding the SPA's quick-apply / auto-populate /
// reminder feature toggles (ADS-1140). Distinct from
// application_defaults (migration 009), which stores the reusable
// form-answer data — this table stores preferences ABOUT how that data
// is used. Same JSONB-blob shape and merge-write handler pattern as
// application_defaults: the gRPC surface (GetApplicationPreferences /
// UpdateApplicationPreferences) reads/merges it as JSON since its shape
// is owned by the SPA, not this service. user_id is a cross-schema soft
// pointer (auth.users) — no DB REFERENCES per the schema-per-service
// rule.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('application_preferences', {
    user_id: { type: 'uuid', primaryKey: true },
    data: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('application_preferences');
};
