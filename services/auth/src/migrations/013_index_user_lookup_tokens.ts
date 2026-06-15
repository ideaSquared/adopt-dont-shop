import type { MigrationBuilder } from 'node-pg-migrate';

// Index the single-use credential tokens that the account handlers look
// users up by. VerifyEmail does `WHERE verification_token = $1` and
// ResetPassword does `WHERE reset_token = $1` — both were unindexed
// (001 only indexed email/status/user_type/created_at/deleted_at), so each
// email-verification and password-reset was a full table scan on auth.users.
//
// Partial indexes (token IS NOT NULL): the columns are NULL for the vast
// majority of rows (a token only exists during an in-flight verify/reset),
// so a partial index stays tiny and the planner uses it for the equality
// lookup.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createIndex('users', 'verification_token', {
    name: 'users_verification_token_idx',
    where: 'verification_token IS NOT NULL',
  });
  pgm.createIndex('users', 'reset_token', {
    name: 'users_reset_token_idx',
    where: 'reset_token IS NOT NULL',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('users', 'reset_token', { name: 'users_reset_token_idx' });
  pgm.dropIndex('users', 'verification_token', { name: 'users_verification_token_idx' });
};
