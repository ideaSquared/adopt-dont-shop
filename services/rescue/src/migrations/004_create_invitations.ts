import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — invitations.
//
// Direct port of service.backend's 00-baseline-011-invitations.ts INTO
// the `rescue` schema. The pending-staff-invitation row — captures the
// email + signed token until the invitee accepts and a real
// `staff_members` row gets minted. NOT paranoid (no deleted_at) — the
// monolith hard-deletes on accept; we preserve that contract.
//
// rescue_id is INTRA-schema FK → rescues (ON DELETE CASCADE). user_id /
// invited_by / created_by / updated_by → auth.users are cross-schema,
// FK-free.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('invitations', {
    invitation_id: { type: 'uuid', primaryKey: true },
    email: { type: 'varchar(255)', notNull: true },
    token: { type: 'varchar(255)', notNull: true, unique: true },
    rescue_id: {
      type: 'uuid',
      notNull: true,
      references: 'rescues(rescue_id)',
      onDelete: 'CASCADE',
    },
    user_id: { type: 'uuid' },
    title: { type: 'varchar(100)' },
    invited_by: { type: 'uuid' },
    expiration: { type: 'timestamptz', notNull: true },
    used: { type: 'boolean', default: false },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // token already has the column-level unique constraint above; the
  // explicit invitations_token_unique index mirrors the monolith's
  // legacy migration that re-added the same thing (the monolith
  // tracks it as a known duplicate; we keep just the index to keep
  // the schema clean without losing the index name).
  pgm.createIndex('invitations', 'rescue_id', { name: 'invitations_rescue_id_idx' });
  pgm.createIndex('invitations', 'user_id', { name: 'invitations_user_id_idx' });
  pgm.createIndex('invitations', 'email', { name: 'invitations_email_idx' });
  pgm.createIndex('invitations', 'invited_by', { name: 'invitations_invited_by_idx' });
  pgm.createIndex('invitations', 'created_by', { name: 'invitations_created_by_idx' });
  pgm.createIndex('invitations', 'updated_by', { name: 'invitations_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('invitations');
};
