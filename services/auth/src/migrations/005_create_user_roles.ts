import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — user_roles.
//
// Direct port of service.backend's 00-baseline-005-user-roles.ts.
// Junction table for the user/role many-to-many. Composite PK
// (user_id, role_id). Both columns are intra-schema FKs to
// users.user_id / roles.role_id — kept enforced because they're within
// the auth schema.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('user_roles', {
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
    },
    role_id: {
      type: 'integer',
      notNull: true,
      references: 'roles(role_id)',
      onDelete: 'CASCADE',
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('user_roles', 'user_roles_pkey', {
    primaryKey: ['user_id', 'role_id'],
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('user_roles');
};
