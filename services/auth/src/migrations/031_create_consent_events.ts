import type { MigrationBuilder } from 'node-pg-migrate';

// Append-only legal-consent store (ADS-1137).
//
// Backs the post-login re-acceptance modal + the cookie banner. One row
// per accepted document version — never updated, never deleted (a new
// acceptance is a new row). "What has the user accepted most recently?"
// is a DISTINCT ON (document_type) ... ORDER BY created_at DESC read; the
// gateway compares that against its currently-published *_VERSION
// constants to decide what's pending re-acceptance.
//
// Keyed on user_id — consent is captured post-login (a logged-out
// visitor's cookie choice is stored client-side and replayed once they
// authenticate). document_type is a small closed set, so a pg enum keeps
// the column honest.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('consent_document_type', ['terms', 'privacy', 'cookies']);

  pgm.createTable('consent_events', {
    consent_event_id: { type: 'uuid', primaryKey: true },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
    },
    document_type: { type: 'consent_document_type', notNull: true },
    version: { type: 'text', notNull: true },
    // Only meaningful for the cookies document — the analytics opt-in the
    // banner captures alongside the policy version.
    analytics_consent: { type: 'boolean' },
    ip_address: { type: 'text' },
    user_agent: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // Latest-acceptance-per-document lookup: DISTINCT ON (document_type)
  // scanning newest-first within each (user, type) partition.
  pgm.createIndex('consent_events', ['user_id', 'document_type', 'created_at'], {
    name: 'consent_events_user_type_recent_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('consent_events');
  pgm.dropType('consent_document_type');
};
