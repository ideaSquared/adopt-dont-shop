import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — role_permissions.
//
// Direct port of service.backend's 00-baseline-004-role-permissions.ts.
// Junction table for the role/permission many-to-many. Composite PK
// (role_id, permission_id). Both columns are intra-schema FKs to
// roles.role_id / permissions.permission_id — those stay enforced
// because they're WITHIN the auth schema (the no-cross-schema-joins rule
// only bans references OUT to other services' schemas).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('role_permissions', {
    role_id: {
      type: 'integer',
      notNull: true,
      references: 'roles(role_id)',
      onDelete: 'CASCADE',
    },
    permission_id: {
      type: 'integer',
      notNull: true,
      references: 'permissions(permission_id)',
      onDelete: 'CASCADE',
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('role_permissions', 'role_permissions_pkey', {
    primaryKey: ['role_id', 'permission_id'],
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('role_permissions');
};
