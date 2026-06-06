import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — application_drafts.
//
// Port of service.backend's 08-create-application-drafts.ts. Backend-
// resident draft persistence — moves application drafts off localStorage
// so users can resume from any device. Semantics: last-write-wins; each
// (user_id, pet_id) pair has at most one draft (UNIQUE constraint).
//
// answers is JSONB free-form per-rescue question answers (same shape
// the application read model carries at submit time).
//
// expires_at enforces a TTL — the service stamps now() + 30 days on
// every upsert. A daily cron eventually deletes rows where
// expires_at < now(). Idx on expires_at backs the purge query.
//
// user_id / pet_id are cross-schema soft pointers to auth.users /
// pets.pets — no DB REFERENCES (schema-per-service rule). The
// monolith DID enforce these as FKs with CASCADE; cross-schema
// enforcement is application-side here. Service handler must reject
// upserts for deleted users / pets.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('application_drafts', {
    draft_id: { type: 'uuid', primaryKey: true },
    user_id: { type: 'uuid', notNull: true },
    pet_id: { type: 'uuid', notNull: true },
    answers: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
    expires_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('application_drafts', ['user_id', 'pet_id'], {
    unique: true,
    name: 'application_drafts_user_pet_unique',
  });
  pgm.createIndex('application_drafts', 'expires_at', {
    name: 'application_drafts_expires_at_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('application_drafts');
};
