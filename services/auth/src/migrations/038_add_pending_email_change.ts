import type { MigrationBuilder } from 'node-pg-migrate';

// Verified email change.
//
// RequestEmailChange stores the address the user wants to move to in
// pending_email, plus the SHA-256 hash of a single-use confirmation token and
// its expiry (same hash-before-persist pattern as verification_token_hash,
// ADS-883). ConfirmEmailChange swaps email to pending_email and clears all
// three. Nothing reads these columns until the change is confirmed, so the
// account email never moves on an unconfirmed request.
//
// All three are nullable with no default: existing rows have no change in
// flight and the currently deployed code never touches them (expand phase
// only). pending_email is citext like email, so the "is this address taken"
// comparisons stay case-insensitive.
//
// The partial index keeps the confirm lookup (WHERE email_change_token_hash =
// $1) cheap: only the few rows with a change in flight carry a token.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('users', {
    pending_email: { type: 'public.citext' },
    email_change_token_hash: { type: 'varchar(64)' },
    email_change_expires_at: { type: 'timestamptz' },
  });
  pgm.createIndex('users', 'email_change_token_hash', {
    name: 'users_email_change_token_hash_idx',
    where: 'email_change_token_hash IS NOT NULL',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('users', 'email_change_token_hash', {
    name: 'users_email_change_token_hash_idx',
  });
  pgm.dropColumns('users', ['pending_email', 'email_change_token_hash', 'email_change_expires_at']);
};
