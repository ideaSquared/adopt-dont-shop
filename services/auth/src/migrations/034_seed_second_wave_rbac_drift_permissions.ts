import type { MigrationBuilder } from 'node-pg-migrate';

// Fix the second wave of RBAC seed <-> handler permission drift (ADS-1304).
//
// Same class of bug as 033/ADS-1235: several gRPC handlers gate on
// permission strings that were never added to the `Permission` union and
// never granted to any role, so the handlers bypassed the type-checker with
// `'...' as Permission` casts and every non-super_admin caller got
// PERMISSION_DENIED (fail-closed — super_admin's authz short-circuit masked
// the gap). `packages/lib.types/src/types/index.ts` now defines all of
// these as real `Permission` union members; this migration seeds the grants.
//
// The permission -> role grants below mirror each handler's own documented
// intent:
//
//   rescues.create               adopter — the public rescue self-
//                                registration endpoint (services/rescue/src/
//                                grpc/handlers.ts createRescue) is reachable
//                                by any authenticated user; adopter is the
//                                default role every signed-up user holds.
//   events.*                     rescue_staff — rescue-owned events
//                                (event-handlers.ts): every RPC is scoped by
//                                principal.rescueId, which only rescue_staff
//                                carries (super_admin bypasses the scope
//                                check entirely, same as pets/staff).
//   foster.*                     rescue_staff — same rescue-tenancy shape as
//                                events (staff-foster-handlers.ts gates each
//                                RPC with requirePermission(..., { rescueId }).
//   notifications.device-tokens.
//     {read,write}                every authenticated role — device-tokens
//                                handlers.ts: RegisterDeviceToken /
//                                ListDeviceTokens are self-scoped (a user
//                                manages their own push tokens); the plain
//                                permission is the self-scope half.
//   notifications.device-tokens.
//     {read,write}:any            admin — the cross-user escape hatch.
//   notifications.email-prefs.
//     {read,update}                every authenticated role — email-handlers.ts
//                                Get/UpdateEmailPreferences are self-scoped,
//                                same shape as auth.privacy-prefs.*.
//   notifications.email-prefs.
//     {read,update}:any           admin — the cross-user escape hatch.
//   notifications.email.send     admin — SendEmail is only reachable today
//                                from the gateway's admin analytics-report
//                                endpoint (routes/analytics-metrics.ts); no
//                                self-service caller exists.
//   notifications.prefs.
//     {read,update}:any           admin — the cross-user escape hatch for the
//                                in-app notification-preferences RPCs (the
//                                bare `notifications.prefs.read`/`.update`
//                                self-scope permissions were already granted
//                                to adopter by 017 — backfilled to every
//                                other role below, see the 017 note).
//   notifications.cleanup        admin — CleanupExpiredNotifications backs
//                                the admin-only POST /notifications/cleanup
//                                route (routes/notifications.ts).
//   notifications.create         admin — CreateNotification lets the caller
//                                target an arbitrary user_id with no self-
//                                scope check; system services stamp this
//                                permission directly via their signed
//                                principal (same pattern as
//                                admin.users.broadcast / pets.favoriters.
//                                list:any) and don't need a DB grant.
//   admin.notifications.broadcast  RENAMED to the already-seeded
//                                `notifications.broadcast` (016 grants it to
//                                admin) instead of adding a second, ungranted
//                                literal for the same feature — see the
//                                handler fix in broadcast-handlers.ts.
//   pets.read:any                admin — GetPetStats and friends
//                                (pets/handlers.ts) gate cross-rescue stat
//                                reads on this; 022 already documented it as
//                                "the existing pets.read:any" while never
//                                actually seeding it. Mirrors pets.manage:any.
//   matching.swipes.read:any     admin — the cross-user escape hatch for
//                                swipe-stats reads (profile-stats-handlers.ts).
//
// 017 backfill: 017_grant_adopter_notification_writes granted
// `notifications.update` / `notifications.prefs.read` / `notifications.prefs.
// update` to `adopter` ONLY, so rescue_staff/admin/moderator/support_agent
// could not mark their own notifications read or manage their own in-app
// prefs (all three are self-scoped via requirePermission(..., { userId })
// or an implicit "no userId in the request" self-scope). 017 is immutable;
// backfilled here for every other role (ON CONFLICT DO NOTHING makes the
// adopter re-grant a no-op). notifications.delete is the same self-scoped
// shape, so it gets the same treatment even though 017 never granted it.
//
// super_admin is granted every permission below explicitly (excluding the
// system-principal-only `notifications.create`) — matching 016/033's
// rationale: the authz short-circuit means super_admin doesn't need the row
// to pass a gate, but GetMe surfaces principal.permissions for UI
// affordances, so the DB record should stay accurate.
//
// Idempotent: permission INSERTs and grant INSERT...SELECTs are all
// ON CONFLICT DO NOTHING, safe to run on every boot.

const ADMIN_ONLY = ['admin', 'super_admin'];
const ALL_ROLES = ['adopter', 'rescue_staff', 'admin', 'moderator', 'super_admin', 'support_agent'];
const RESCUE_STAFF = ['rescue_staff', 'super_admin'];

const GRANTS: Record<string, string[]> = {
  'rescues.create': ['adopter', 'super_admin'],
  'events.read': RESCUE_STAFF,
  'events.create': RESCUE_STAFF,
  'events.update': RESCUE_STAFF,
  'events.delete': RESCUE_STAFF,
  'foster.create': RESCUE_STAFF,
  'foster.read': RESCUE_STAFF,
  'foster.update': RESCUE_STAFF,
  'notifications.device-tokens.read': ALL_ROLES,
  'notifications.device-tokens.write': ALL_ROLES,
  'notifications.device-tokens.read:any': ADMIN_ONLY,
  'notifications.device-tokens.write:any': ADMIN_ONLY,
  'notifications.email-prefs.read': ALL_ROLES,
  'notifications.email-prefs.update': ALL_ROLES,
  'notifications.email-prefs.read:any': ADMIN_ONLY,
  'notifications.email-prefs.update:any': ADMIN_ONLY,
  'notifications.email.send': ADMIN_ONLY,
  'notifications.prefs.read:any': ADMIN_ONLY,
  'notifications.prefs.update:any': ADMIN_ONLY,
  'notifications.cleanup': ADMIN_ONLY,
  'pets.read:any': ADMIN_ONLY,
  'matching.swipes.read:any': ADMIN_ONLY,
  // 017 backfill — see header comment.
  'notifications.update': ALL_ROLES,
  'notifications.delete': ALL_ROLES,
  'notifications.prefs.read': ALL_ROLES,
  'notifications.prefs.update': ALL_ROLES,
};

// Registry-only: seeded so auth.permissions stays the complete registry, but
// deliberately granted to no role. The only caller is the notifications
// service's signed system principal (see the header comment above) —
// mirrors 026's pets.favoriters.list:any / 033's admin.users.broadcast.
const REGISTRY_ONLY_PERMISSIONS = ['notifications.create'];

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
  // own (mirrors 016/033's down() rationale).
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
