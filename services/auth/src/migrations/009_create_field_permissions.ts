import type { MigrationBuilder } from 'node-pg-migrate';

// Field-level access overrides — auth.field_permissions.
//
// Direct port of service.backend's 00-baseline-009-field-permissions.ts.
// The lib.types `defaultFieldPermissions` config is the source of truth;
// this table only stores OVERRIDES on top of those defaults. Lookups are
// (resource, role, field_name) — unique together — so the runtime
// resolver builds the effective access map by overlaying the override
// row's access_level on top of the defaults map for that role.
//
// Sensitive fields (password, tokens, 2FA secrets) are NEVER stored as
// overrides — the service layer rejects writes for those at the API
// boundary, and the resolver enforces the SENSITIVE_FIELD_DENYLIST a
// second time after merging defaults + overrides.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('field_access_level', ['none', 'read', 'write']);
  pgm.createType('field_permission_resource', ['users', 'pets', 'applications', 'rescues']);

  pgm.createTable('field_permissions', {
    field_permission_id: 'id',
    resource: { type: 'field_permission_resource', notNull: true },
    field_name: { type: 'varchar(255)', notNull: true },
    role: { type: 'varchar(50)', notNull: true },
    access_level: { type: 'field_access_level', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('field_permissions', ['resource', 'field_name', 'role'], {
    unique: true,
    name: 'field_permissions_unique',
  });
  pgm.createIndex('field_permissions', 'resource', { name: 'field_permissions_resource_idx' });
  pgm.createIndex('field_permissions', 'role', { name: 'field_permissions_role_idx' });
  pgm.createIndex('field_permissions', ['resource', 'role'], {
    name: 'field_permissions_resource_role_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('field_permissions');
  pgm.dropType('field_permission_resource');
  pgm.dropType('field_access_level');
};
