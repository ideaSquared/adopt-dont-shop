import type { MigrationBuilder } from 'node-pg-migrate';

// Seed the core RBAC grant matrix (ADS-863).
//
// Before this migration only `auth.users` carried role information (via the
// `user_type` column). `auth.roles`, `auth.permissions`, `auth.role_permissions`
// and `auth.user_roles` were all empty, so `loadPrincipal` resolved an empty
// permission set for every non-super_admin user and EVERY permission-gated
// handler returned PERMISSION_DENIED (403). super_admin only worked because
// authz short-circuits for it.
//
// This seeds, idempotently (ON CONFLICT DO NOTHING):
//   1. one `auth.roles` row per `user_type`
//   2. the permission rows each role needs
//   3. the role -> permission grants below
//
// The grants are least-privilege per role and cover the operations each role
// performs in the apps. Rescue-scoped WRITES additionally require the
// principal's `rescueId` to match the target rescue — that propagation is a
// separate concern and does not belong in this grant seed.
//
// Note: `loadPrincipal` resolves a user's permissions from their primary
// `user_type` role (and any extra `user_roles`), so seeding these grants is
// sufficient — no per-user `user_roles` rows are required for the base role.

const ROLE_NAMES = [
  'adopter',
  'rescue_staff',
  'admin',
  'moderator',
  'super_admin',
  'support_agent',
] as const;

// Grants per role (excluding super_admin, which receives the full union).
const BASE_GRANTS: Record<string, string[]> = {
  // Adopters browse pets, manage their own applications, message rescues,
  // rate, and manage their own profile. Ownership (own application / own
  // profile) is enforced separately by the handlers' scope checks.
  adopter: [
    'pets.read',
    'pets.list',
    'applications.create',
    'applications.read',
    'applications.list',
    'applications.update',
    'chats.read',
    'chats.create',
    'chats.list',
    'messages.read',
    'messages.create',
    'ratings.create',
    'ratings.read',
    'notifications.read',
    'users.read',
    'users.update',
  ],
  // Rescue staff manage their rescue's pets and applications, message
  // applicants, and read staff/rescue settings. Rescue-tenancy is enforced
  // by the handlers' rescueId scope check on top of these grants.
  rescue_staff: [
    'pets.create',
    'pets.read',
    'pets.list',
    'pets.update',
    'pets.delete',
    'pets.archive',
    'applications.read',
    'applications.list',
    'applications.update',
    'applications.review',
    'applications.approve',
    'applications.reject',
    'staff.read',
    'staff.list',
    'rescues.read',
    'rescues.update',
    'chats.read',
    'chats.create',
    'chats.list',
    'messages.read',
    'messages.create',
    'notifications.read',
    'users.read',
  ],
  // Moderators work the moderation queues (the five namespaced permissions
  // seeded in 014) plus the report-review / suspend / content actions, and
  // need read access to the entities they moderate. admin.dashboard keeps
  // them inside the existing moderation gate.
  moderator: [
    'moderation.reports.view',
    'moderation.reports.manage',
    'moderation.reports.review',
    'moderation.sanctions.manage',
    'moderation.tickets.manage',
    'moderation.actions.manage',
    'moderation.users.suspend',
    'moderation.content.moderate',
    'admin.dashboard',
    'users.read',
    'pets.read',
    'applications.read',
    'chats.read',
    'messages.read',
    'notifications.read',
  ],
  // Non-super_admin admins: the admin console surfaces (dashboard, reports,
  // audit, config, feature flags, security) plus user administration and
  // cross-domain reads.
  admin: [
    'admin.dashboard',
    'admin.reports',
    'admin.audit_logs',
    'admin.system_settings',
    'admin.feature_flags',
    'admin.config.read',
    'admin.config.update',
    'admin.audit.read',
    'admin.data.export',
    'admin.security.read',
    'admin.security.manage',
    'users.read',
    'users.update',
    'users.create',
    'users.delete',
    'users.list',
    'users.suspend',
    'pets.read',
    'pets.list',
    'applications.read',
    'applications.list',
    'rescues.read',
    'rescues.list',
    'moderation.reports.view',
    'moderation.reports.manage',
    'notifications.read',
    'notifications.broadcast',
  ],
  // Support agents triage support tickets and read the context they need.
  support_agent: [
    'users.read',
    'applications.read',
    'chats.read',
    'messages.read',
    'notifications.read',
    'moderation.tickets.manage',
  ],
};

const ALL_PERMISSIONS = [...new Set(Object.values(BASE_GRANTS).flat())].sort();

// super_admin bypasses authz at the gate, but GetMe surfaces the permission
// set for UI affordances, so grant it the full union.
const GRANTS: Record<string, string[]> = {
  ...BASE_GRANTS,
  super_admin: ALL_PERMISSIONS,
};

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  // 1. Roles — one per user_type.
  for (const role of ROLE_NAMES) {
    pgm.sql(
      `INSERT INTO auth.roles (role_name) VALUES ('${role}') ON CONFLICT (role_name) DO NOTHING`
    );
  }

  // 2. Permissions — every distinct permission we grant.
  for (const permission of ALL_PERMISSIONS) {
    pgm.sql(
      `INSERT INTO auth.permissions (permission_name) VALUES ('${permission}') ON CONFLICT (permission_name) DO NOTHING`
    );
  }

  // 3. Grants — resolve role_id + permission_id by name so the migration is
  //    independent of the serial ids.
  for (const [role, permissions] of Object.entries(GRANTS)) {
    for (const permission of permissions) {
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
  // auth.permissions are left in place — they may be shared with other
  // migrations (e.g. 014's moderation permissions) and carry no privilege
  // on their own.
  for (const [role, permissions] of Object.entries(GRANTS)) {
    for (const permission of permissions) {
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
