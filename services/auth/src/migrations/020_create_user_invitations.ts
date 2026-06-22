import type { MigrationBuilder } from 'node-pg-migrate';

// Invitation tokens for admin-created users. AdminCreateUser inserts a
// pending, credential-less auth.users row and one row here carrying a
// single-use token (stored as a SHA-256 hex digest, never the raw value).
// The invitee redeems the token to set their password and activate the
// account. `expires_at` bounds the token's lifetime; a redeemed or revoked
// invitation is marked via `status` rather than deleted, so the audit
// trail of who was invited (and by whom) survives.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('user_invitation_status', ['pending', 'accepted', 'revoked']);

  pgm.createTable('user_invitations', {
    invitation_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
    },
    // SHA-256 hex digest of the single-use token (64 chars). The raw token
    // only ever lives in the auth.userInvited event payload + the email.
    token_hash: { type: 'varchar(64)', notNull: true, unique: true },
    status: { type: 'user_invitation_status', notNull: true, default: 'pending' },
    invited_by: { type: 'uuid' },
    expires_at: { type: 'timestamptz', notNull: true },
    accepted_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('user_invitations', 'user_id', { name: 'user_invitations_user_id_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('user_invitations');
  pgm.dropType('user_invitation_status');
};
