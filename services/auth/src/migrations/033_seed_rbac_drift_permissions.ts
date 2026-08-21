import type { MigrationBuilder } from 'node-pg-migrate';

// Fix RBAC seed <-> handler permission drift (ADS-1235).
//
// Several gRPC handlers gate on permission strings that were never added to
// auth.permissions or granted to any role in 016_seed_core_rbac — the
// handlers bypassed the type-checker with `'...' as Permission` casts, so
// every non-super_admin caller got PERMISSION_DENIED (fail-closed, not a
// security hole: super_admin's authz short-circuit masked the gap).
//
// The permission -> role grants below mirror each handler's own documented
// intent (proto RPC comments / handler file header comments):
//
//   admin.users.*               admin — the admin console's user-management
//                                surface (auth.proto: "Admin-facing surface
//                                the monolith served at /api/v1/users/*").
//   admin.users.broadcast       EXCLUDED from role grants on purpose: the
//                                only caller is the notifications service's
//                                signed system principal
//                                (services/notifications/src/grpc/
//                                auth-client.ts), which stamps the
//                                permission directly in gRPC metadata
//                                rather than resolving it from these
//                                tables — same pattern as 026's
//                                pets.favoriters.list:any. The permission
//                                row is still seeded so auth.permissions
//                                stays the complete registry.
//   cms.content.* / cms.menu.*  admin — services/cms/src/grpc/handlers.ts:
//                                "The seeded admin/super_admin roles have
//                                all of these."
//   email.templates.*           admin — services/notifications/src/grpc/
//                                email-template-handlers.ts: admin CRUD
//                                over the templates SendEmail renders.
//   admin.field_permissions.*   admin — auth.proto: "Admin-only."
//   auth.privacy-prefs.read /
//   auth.privacy-prefs.update   every user-facing role. Unlike the other
//                                permissions here, this is NOT admin-only:
//                                privacy-prefs-handlers.ts gates self-access
//                                on the bare permission unconditionally, and
//                                the proto documents the row as 1:1 with
//                                users (self-service by design) — so every
//                                role needs it just to manage its own row.
//   auth.privacy-prefs.*:any    admin — the cross-user escape hatch,
//                                mirroring the existing pets.read:any /
//                                pets.manage:any (022) pattern.
//   chat.message.delete:any     moderator + admin — chat.proto: "Caller
//                                MUST be the message's sender OR hold
//                                chat.message.delete:any (moderators /
//                                admins)."
//
// super_admin is granted every role-scoped permission below explicitly
// (excluding admin.users.broadcast) — matching 016's rationale: the authz
// short-circuit means super_admin doesn't NEED the row to pass a gate, but
// GetMe surfaces principal.permissions for UI affordances, so the DB record
// should stay accurate.
//
// Idempotent: permission INSERTs and grant INSERT...SELECTs are all
// ON CONFLICT DO NOTHING, safe to run on every boot.

const ADMIN_ONLY = ['admin', 'super_admin'];
const ALL_ROLES = ['adopter', 'rescue_staff', 'admin', 'moderator', 'super_admin', 'support_agent'];

const GRANTS: Record<string, string[]> = {
  'admin.users.search': ADMIN_ONLY,
  'admin.users.read': ADMIN_ONLY,
  'admin.users.update': ADMIN_ONLY,
  'admin.users.create': ADMIN_ONLY,
  'admin.users.deactivate': ADMIN_ONLY,
  'admin.users.reactivate': ADMIN_ONLY,
  'admin.users.bulk_update': ADMIN_ONLY,
  'cms.content.read': ADMIN_ONLY,
  'cms.content.create': ADMIN_ONLY,
  'cms.content.update': ADMIN_ONLY,
  'cms.content.delete': ADMIN_ONLY,
  'cms.content.publish': ADMIN_ONLY,
  'cms.menu.read': ADMIN_ONLY,
  'cms.menu.create': ADMIN_ONLY,
  'cms.menu.update': ADMIN_ONLY,
  'cms.menu.delete': ADMIN_ONLY,
  'email.templates.read': ADMIN_ONLY,
  'email.templates.create': ADMIN_ONLY,
  'email.templates.update': ADMIN_ONLY,
  'email.templates.delete': ADMIN_ONLY,
  'admin.field_permissions.read': ADMIN_ONLY,
  'admin.field_permissions.write': ADMIN_ONLY,
  'auth.privacy-prefs.read': ALL_ROLES,
  'auth.privacy-prefs.update': ALL_ROLES,
  'auth.privacy-prefs.read:any': ADMIN_ONLY,
  'auth.privacy-prefs.update:any': ADMIN_ONLY,
  'chat.message.delete:any': ['moderator', 'admin', 'super_admin'],
};

// Registry-only: seeded so auth.permissions stays the complete list of
// known permission strings, but deliberately granted to no role — see the
// admin.users.broadcast note in the header comment above.
const REGISTRY_ONLY_PERMISSIONS = ['admin.users.broadcast'];

const ALL_PERMISSIONS = [...new Set([...Object.keys(GRANTS), ...REGISTRY_ONLY_PERMISSIONS])].sort();

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  // 1. Permissions — every string this migration introduces.
  for (const permission of ALL_PERMISSIONS) {
    pgm.sql(
      `INSERT INTO auth.permissions (permission_name) VALUES ('${permission}') ON CONFLICT (permission_name) DO NOTHING`
    );
  }

  // 2. Grants — resolve role_id + permission_id by name so the migration is
  //    independent of the serial ids.
  for (const [permission, roles] of Object.entries(GRANTS)) {
    for (const role of roles) {
      pgm.sql(`
        INSERT INTO auth.role_permissions (role_id, permission_id)
        SELECT r.role_id, p.permission_id
        FROM auth.roles r
        CROSS JOIN auth.permissions p
        WHERE r.role_name = '${role}' AND p.permission_name = '${permission}'
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `);
    }
  }
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  // Reverse the grants this migration added. Reference rows in auth.roles /
  // auth.permissions are left in place — they carry no privilege on their
  // own (mirrors 016's down() rationale).
  for (const [permission, roles] of Object.entries(GRANTS)) {
    for (const role of roles) {
      pgm.sql(`
        DELETE FROM auth.role_permissions rp
        USING auth.roles r, auth.permissions p
        WHERE rp.role_id = r.role_id
          AND rp.permission_id = p.permission_id
          AND r.role_name = '${role}'
          AND p.permission_name = '${permission}'
      `);
    }
  }
};
