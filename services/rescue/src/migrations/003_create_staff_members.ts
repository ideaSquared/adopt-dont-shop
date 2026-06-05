import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — staff_members.
//
// Direct port of service.backend's 00-baseline-010-staff-members.ts INTO
// the `rescue` schema. The join row that links a user (auth.users) to a
// rescue with a verification + onboarding trail.
//
// rescue_id is the INTRA-schema FK → rescues (ON DELETE CASCADE — when a
// rescue is removed its staff rows go with it). user_id / verified_by /
// added_by / created_by / updated_by are CROSS-schema pointers into
// auth.users and stay FK-free (the no-cross-schema-joins rule). The
// Phase 4.4 subscriber on `auth.userCreated` keeps this row denormalised
// when a user signs up via an invitation.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('staff_members', {
    staff_member_id: { type: 'uuid', primaryKey: true },
    rescue_id: {
      type: 'uuid',
      notNull: true,
      references: 'rescues(rescue_id)',
      onDelete: 'CASCADE',
    },
    user_id: { type: 'uuid', notNull: true },
    title: { type: 'varchar(255)' },
    is_verified: { type: 'boolean', notNull: true, default: false },
    verified_by: { type: 'uuid' },
    verified_at: { type: 'timestamptz' },
    added_by: { type: 'uuid', notNull: true },
    added_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('staff_members', 'rescue_id', { name: 'staff_members_rescue_id_idx' });
  pgm.createIndex('staff_members', 'user_id', { name: 'staff_members_user_id_idx' });
  pgm.createIndex('staff_members', 'verified_by', { name: 'staff_members_verified_by_idx' });
  pgm.createIndex('staff_members', 'added_by', { name: 'staff_members_added_by_idx' });
  pgm.createIndex('staff_members', 'deleted_at', { name: 'staff_members_deleted_at_idx' });
  pgm.createIndex('staff_members', 'created_by', { name: 'staff_members_created_by_idx' });
  pgm.createIndex('staff_members', 'updated_by', { name: 'staff_members_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('staff_members');
};
