import type { MigrationBuilder } from 'node-pg-migrate';

// ADS-883: store SHA-256 hashes of password-reset and email-verification
// tokens instead of the raw bearer strings.
//
// Keeping raw tokens in the DB means a single DB read is a ready-made
// account-takeover credential. Hashing mirrors the pattern already used for
// invitation tokens in auth.user_invitations (admin-handlers.ts).
//
// Existing tokens in the raw columns are invalidated by the column drop —
// any in-flight reset/verify links will fail and the user must re-request,
// which is acceptable given the security gain.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('users', {
    verification_token_hash: { type: 'varchar(64)' },
    reset_token_hash: { type: 'varchar(64)' },
  });

  // Replace the old raw-token indexes (013_index_user_lookup_tokens.ts).
  pgm.dropIndex('users', 'verification_token', { name: 'users_verification_token_idx' });
  pgm.dropIndex('users', 'reset_token', { name: 'users_reset_token_idx' });

  pgm.createIndex('users', 'verification_token_hash', {
    name: 'users_verification_token_hash_idx',
    where: 'verification_token_hash IS NOT NULL',
  });
  pgm.createIndex('users', 'reset_token_hash', {
    name: 'users_reset_token_hash_idx',
    where: 'reset_token_hash IS NOT NULL',
  });

  pgm.dropColumns('users', ['verification_token', 'reset_token']);
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('users', {
    verification_token: { type: 'varchar(255)' },
    reset_token: { type: 'varchar(255)' },
  });

  pgm.dropIndex('users', 'verification_token_hash', {
    name: 'users_verification_token_hash_idx',
  });
  pgm.dropIndex('users', 'reset_token_hash', { name: 'users_reset_token_hash_idx' });

  pgm.createIndex('users', 'verification_token', {
    name: 'users_verification_token_idx',
    where: 'verification_token IS NOT NULL',
  });
  pgm.createIndex('users', 'reset_token', {
    name: 'users_reset_token_idx',
    where: 'reset_token IS NOT NULL',
  });

  pgm.dropColumns('users', ['verification_token_hash', 'reset_token_hash']);
};
