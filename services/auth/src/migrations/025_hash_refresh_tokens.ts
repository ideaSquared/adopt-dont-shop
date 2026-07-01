import type { MigrationBuilder } from 'node-pg-migrate';

// ADS-884: store SHA-256 hashes of refresh tokens instead of the raw bearer
// strings, mirroring the pattern 024 already applied to the users table's
// verification/reset tokens (ADS-883) and the jti-only auth.revoked_tokens /
// token_hash-only auth.user_invitations tables.
//
// Refresh tokens are long-lived bearer credentials — a single read of
// auth.refresh_tokens.token was a ready-made set of valid sessions. Insert
// and lookup sites now write/query only the hash (see grpc/handlers.ts);
// this migration adds the column and backfills existing rows so in-flight
// sessions survive the deploy. The raw `token` column and its unique index
// are left in place for now (no longer written by the app) and will be
// dropped in a follow-up migration once this has been live for a release
// cycle, in case of rollback.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('refresh_tokens', {
    token_hash: { type: 'varchar(64)' },
  });

  pgm.sql(`
    UPDATE auth.refresh_tokens
    SET token_hash = encode(sha256(token::bytea), 'hex')
    WHERE token IS NOT NULL AND token_hash IS NULL
  `);

  pgm.createIndex('refresh_tokens', 'token_hash', {
    name: 'refresh_tokens_token_hash_uq',
    unique: true,
    where: 'token_hash IS NOT NULL',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('refresh_tokens', 'token_hash', { name: 'refresh_tokens_token_hash_uq' });
  pgm.dropColumns('refresh_tokens', ['token_hash']);
};
