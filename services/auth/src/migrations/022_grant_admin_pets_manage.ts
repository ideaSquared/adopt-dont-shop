import type { MigrationBuilder } from 'node-pg-migrate';

// Grant the admin role platform-wide pet management (`pets.manage:any`).
//
// The admin Pets page bulk actions (publish / unpublish / archive) fan out
// to the pets service's Update / UpdateStatus / Delete RPCs, which are
// rescue-scoped: a caller must own the pet's rescue, and only super_admin
// bypassed that. `pets.manage:any` is the write-side counterpart of the
// existing `pets.read:any` — the pets handlers treat it as a cross-rescue
// override. Seeded here and granted to admin so platform admins (not just
// super_admin) can run the bulk actions. super_admin already holds every
// permission via the role short-circuit; granting it here too keeps the
// GetMe permission surface accurate.
const PERMISSION = 'pets.manage:any';
const ROLES = ['admin', 'super_admin'];

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(
    `INSERT INTO auth.permissions (permission_name) VALUES ('${PERMISSION}')
     ON CONFLICT (permission_name) DO NOTHING`
  );
  for (const role of ROLES) {
    pgm.sql(`
      INSERT INTO auth.role_permissions (role_id, permission_id)
      SELECT r.role_id, p.permission_id
      FROM auth.roles r
      CROSS JOIN auth.permissions p
      WHERE r.role_name = '${role}' AND p.permission_name = '${PERMISSION}'
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);
  }
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(
    `DELETE FROM auth.role_permissions
     WHERE permission_id = (
       SELECT permission_id FROM auth.permissions WHERE permission_name = '${PERMISSION}'
     )`
  );
  pgm.sql(`DELETE FROM auth.permissions WHERE permission_name = '${PERMISSION}'`);
};
