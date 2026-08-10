import type { MigrationBuilder } from 'node-pg-migrate';

// Per-user direct permission grants — auth.permission_grants (ADS-1141).
//
// Phase 1 of the per-permission grant model. Grants are ADDITIVE and GLOBAL: a
// row here adds one permission to a user on top of their role-derived set.
// There is no deny/override and no resource scope in v1. Effective permissions
// (loadPrincipal) = role-derived ∪ active grants, where a grant is active when
// revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()) — evaluated
// lazily at request time, so expiry/revocation need no background sweeper.
//
// permission_id FKs the string permission registry (auth.permissions) so a
// grant can only reference a known permission. user_id mirrors user_roles: an
// intra-schema FK with ON DELETE CASCADE. granted_by mirrors
// user_roles.assigned_by (nullable — a grant may originate from the system).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('permission_grants', {
    grant_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
    },
    permission_id: {
      type: 'integer',
      notNull: true,
      references: 'permissions(permission_id)',
    },
    granted_by: { type: 'uuid' },
    granted_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    expires_at: { type: 'timestamptz' },
    reason: { type: 'text' },
    revoked_at: { type: 'timestamptz' },
  });

  // One ACTIVE grant per (user, permission): a partial unique index scoped to
  // non-revoked rows, so the same permission can be granted again after a prior
  // grant is revoked.
  pgm.createIndex('permission_grants', ['user_id', 'permission_id'], {
    unique: true,
    where: 'revoked_at IS NULL',
    name: 'permission_grants_active_unique',
  });
  // Lookup path for loadPrincipal's per-user active-grant union.
  pgm.createIndex('permission_grants', 'user_id', {
    name: 'permission_grants_user_id_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('permission_grants');
};
