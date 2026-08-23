import type { MigrationBuilder } from 'node-pg-migrate';

// ADS-1229: store a SHA-256 hash of the staff-invitation bearer token
// instead of the raw value, mirroring ADS-883's auth.users
// verification_token_hash / reset_token_hash pattern — a DB read alone
// should never yield a usable invitation credential.
//
// Existing PENDING invitations have no token to hash (the raw value is
// gone once the column below is dropped), so they're marked used rather
// than left with a NULL hash that could never validate but would still
// show as "pending" in the admin StaffTab.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('invitations', {
    token_hash: { type: 'varchar(64)', unique: true },
  });

  pgm.sql(`UPDATE rescue.invitations SET used = true WHERE used = false`);

  pgm.dropColumns('invitations', ['token']);
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('invitations', {
    token: { type: 'varchar(255)', unique: true },
  });

  pgm.dropColumns('invitations', ['token_hash']);
};
