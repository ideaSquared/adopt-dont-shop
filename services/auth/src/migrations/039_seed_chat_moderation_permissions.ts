import type { MigrationBuilder } from 'node-pg-migrate';

// Replace service.chat's hard-coded role-name checks with permissions.
//
// DeleteChat / UpdateChatStatus used to authorise on `chats.read` plus
// `roles.includes('rescue_staff' | 'moderator' | 'admin' | 'super_admin')`, so
// a custom role could neither be granted nor denied the ability. They now gate
// on:
//
//   chats.update       rescue-scoped: delete / lock a chat of the caller's own
//                      rescue. Already in lib.types (CHAT_UPDATE) but never
//                      granted to any role; granted here to rescue_staff so
//                      default rescue staff keep today's ability.
//   chat.moderate:any  platform-wide: delete / lock ANY chat, read any chat,
//                      cross-chat stats. Granted to the platform roles that
//                      previously matched by name (moderator, admin).
//
// super_admin is granted both so GetMe surfaces them (the authz short-circuit
// means it does not need the rows to pass a gate) — same rationale as 033.
//
// Idempotent: ON CONFLICT DO NOTHING on every insert.

const GRANTS: Record<string, string[]> = {
  'chats.update': ['rescue_staff', 'super_admin'],
  'chat.moderate:any': ['moderator', 'admin', 'super_admin'],
};

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  for (const permission of Object.keys(GRANTS)) {
    pgm.sql(
      `INSERT INTO auth.permissions (permission_name) VALUES ('${permission}') ON CONFLICT (permission_name) DO NOTHING`
    );
  }
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
  // Remove the grants; permission rows stay as inert registry data (see 033/035).
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
