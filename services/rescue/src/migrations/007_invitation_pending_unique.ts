import type { MigrationBuilder } from 'node-pg-migrate';

// Dedupe pending invitations.
//
// Re-inviting an email that already has a PENDING invitation must NOT
// create a second row — the invite handler refreshes the existing row
// (rotates token, extends expiry, updates title) instead. This partial
// unique index makes that invariant enforceable at the database level
// and gives the handler a single (rescue_id, lower(email)) conflict
// target to upsert against.
//
// "Pending" = not yet accepted (`used = false`). Accepted invites
// (`used = true`) drop out of the index so a fresh invite to the same
// email is always allowed. Email is lower-cased so casing variants of
// the same address collapse to one pending row.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createIndex('invitations', ['rescue_id', 'lower(email)'], {
    name: 'invitations_one_pending_per_email',
    unique: true,
    where: 'used = false',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('invitations', ['rescue_id', 'lower(email)'], {
    name: 'invitations_one_pending_per_email',
  });
};
