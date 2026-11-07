import type { MigrationBuilder } from 'node-pg-migrate';

// Narrow permission for moderation sanctions.
//
// service.moderation suspends or bans a user through AuthService.ApplyUserSanction,
// which is guarded only by `moderation.users.sanction`. That keeps moderators
// away from the broad admin.users.update / admin.users.deactivate /
// admin.security.manage permissions they would otherwise need for the same
// effect. The permission is granted to the moderator, admin and super_admin
// roles (the roles that can act on reports) and is also stamped directly on
// service.moderation's signed service principal.
//
// Idempotent: ON CONFLICT DO NOTHING on both inserts.

const PERMISSION = 'moderation.users.sanction';
const ROLES = ['moderator', 'admin', 'super_admin'];

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(
    `INSERT INTO auth.permissions (permission_name) VALUES ('${PERMISSION}') ON CONFLICT (permission_name) DO NOTHING`
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
  // Remove the grants; the permission row is left as inert registry data,
  // like 016/033/034.
  for (const role of ROLES) {
    pgm.sql(`
      DELETE FROM auth.role_permissions rp
      USING auth.roles r, auth.permissions p
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
        AND r.role_name = '${role}'
        AND p.permission_name = '${PERMISSION}'
    `);
  }
};
