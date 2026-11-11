import type { MigrationBuilder } from 'node-pg-migrate';

// Application chats — one live chat per application and participant pair.
//
// OpenChat looked for an existing chat and then inserted, with nothing to stop
// two concurrent opens (a double-click, or adopter and staff at once) from both
// missing the lookup and creating two chats. The pair lives in chat_participants,
// so a unique index on `chats` needs the pair on the row: `participant_pair_key`
// is the two user ids sorted and joined with ':' (set by OpenChat on insert).
//
// Safe on existing data, with no deletes and no rewrites:
//   - the column is nullable and NOT backfilled, so every pre-existing chat
//     (including any duplicates already in production) has a NULL key and sits
//     outside the partial index — the index build cannot fail on them and they
//     stay readable. OpenChat still finds an existing chat through its lookup,
//     so legacy chats keep being reused; the index only guards new inserts.
//   - soft-deleted chats are excluded, so reopening after a delete still works.
// Expand-phase only: nothing is dropped or made NOT NULL.
//
// Non-concurrent index build: the runner wraps each migration in a transaction
// (CREATE INDEX CONCURRENTLY cannot run there) and the partial index matches
// only rows with a non-NULL key — none at build time — so the lock is trivial.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('chats', { participant_pair_key: { type: 'text' } });
  pgm.createIndex('chats', ['application_id', 'participant_pair_key'], {
    unique: true,
    name: 'chats_application_pair_unique',
    where: 'application_id IS NOT NULL AND participant_pair_key IS NOT NULL AND deleted_at IS NULL',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('chats', ['application_id', 'participant_pair_key'], {
    name: 'chats_application_pair_unique',
  });
  pgm.dropColumns('chats', ['participant_pair_key']);
};
