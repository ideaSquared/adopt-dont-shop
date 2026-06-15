import type { MigrationBuilder } from 'node-pg-migrate';

// Reconcile the two revocation columns on refresh_tokens.
//
// 006 created `is_revoked` (used by the sessions handlers); 010 added
// `revoked_at` (used by the login / refresh / logout handlers). The two
// columns tracked the same fact independently, so a row could be revoked
// under one column and active under the other. In particular a session
// revoked via RevokeSession set `is_revoked` but not `revoked_at`, and the
// refresh path only checked `revoked_at` — so a revoked session kept
// minting fresh tokens. The handlers now write BOTH columns and read BOTH;
// this migration backfills existing rows so neither view is stale:
//   - any row with a non-null revoked_at is also is_revoked = true
//   - any row already is_revoked = true gets a revoked_at stamp so the
//     refresh path's `revoked_at IS NULL` predicate agrees
//
// A partial index on the active head rows speeds the sessions list and the
// refresh lookup, which both filter on (is_revoked = false).
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(`
    UPDATE auth.refresh_tokens
    SET is_revoked = true
    WHERE revoked_at IS NOT NULL AND is_revoked = false
  `);
  pgm.sql(`
    UPDATE auth.refresh_tokens
    SET revoked_at = updated_at
    WHERE is_revoked = true AND revoked_at IS NULL
  `);
  pgm.createIndex('refresh_tokens', ['user_id', 'family_id'], {
    name: 'refresh_tokens_active_head_idx',
    where: 'is_revoked = false',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  // The backfill only reconciled two columns that already existed; the
  // pre-backfill split-brain state is not recoverable and reintroducing it
  // would be a regression, so down only reverses the structural change.
  pgm.dropIndex('refresh_tokens', ['user_id', 'family_id'], {
    name: 'refresh_tokens_active_head_idx',
  });
};
