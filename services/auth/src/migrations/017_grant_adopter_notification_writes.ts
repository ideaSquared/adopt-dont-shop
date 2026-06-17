import type { MigrationBuilder } from 'node-pg-migrate';

// Grant adopters their self-scoped notification write permissions (ADS-869).
//
// 016 gave the adopter role `notifications.read` but none of the notification
// WRITE permissions, so an adopter could read notifications but not:
//   - mark them read  → service.notifications MarkAllRead / MarkRead gate on
//     `notifications.update` and 403'd (surfaced by the e2e notification-badge
//     spec).
//   - manage their own in-app preferences → GetNotificationPreferences /
//     UpdateNotificationPreferences gate on `notifications.prefs.read` /
//     `notifications.prefs.update`.
//
// All three are SELF-scoped in the handlers and cannot touch another user's
// data:
//   - MarkAllRead updates `WHERE user_id = principal.userId`; single-row
//     MarkRead requires the row's user_id to match the caller.
//   - the prefs handlers read/write only the caller's own user_notification_prefs
//     row (no userId in the request — the *_SELF permission names reflect this).
// So this lets adopters manage only THEIR OWN notifications, never anyone
// else's.
//
// 016 is immutable (already shipped); this is an additive follow-on. Idempotent
// (ON CONFLICT DO NOTHING), mirroring 016's role_permissions seeding.

const ROLE = 'adopter';
const PERMISSIONS = [
  'notifications.update',
  'notifications.prefs.read',
  'notifications.prefs.update',
] as const;

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  for (const permission of PERMISSIONS) {
    // The permission row may not exist yet — 016 only inserted permissions it
    // actually granted, and none of these were granted to any role.
    pgm.sql(
      `INSERT INTO auth.permissions (permission_name) VALUES ('${permission}') ON CONFLICT (permission_name) DO NOTHING`
    );
    pgm.sql(`
      INSERT INTO auth.role_permissions (role_id, permission_id)
      SELECT r.role_id, p.permission_id
      FROM auth.roles r
      CROSS JOIN auth.permissions p
      WHERE r.role_name = '${ROLE}' AND p.permission_name = '${permission}'
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);
  }
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  // Reverse only the grants; leave the reference permission rows in place.
  for (const permission of PERMISSIONS) {
    pgm.sql(`
      DELETE FROM auth.role_permissions rp
      USING auth.roles r, auth.permissions p
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
        AND r.role_name = '${ROLE}'
        AND p.permission_name = '${permission}'
    `);
  }
};
