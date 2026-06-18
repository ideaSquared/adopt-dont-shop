import type { MigrationBuilder } from 'node-pg-migrate';

// Grant rescue_staff the staff-management lifecycle permissions (ADS-871).
//
// 016 gave rescue_staff only `staff.read` + `staff.list`, so a rescue user
// could SEE their team but not manage it. In particular RescueService.
// InviteStaff gates on `staff.create` scoped to the rescue, so with no rescue
// role holding `staff.create`, the whole staff-invitation feature was
// unreachable (the e2e staff-invitation round-trip 403'd at the invite step).
//
// rescue_staff is the only rescue-tenant role at runtime, so these grants are
// what make "a rescue manages its own staff" possible at all. Rescue-tenancy
// stays enforced by the handlers' `requirePermission(…, { rescueId })` scope
// check on top of these grants — a staffer can only act within their own
// rescue. `staff.update` / `staff.delete` / `staff.suspend` are granted
// alongside `staff.create` to cover the full management lifecycle (matching the
// canonical rescue-admin permission set); the handlers that gate on them can be
// added later without another grant migration.
//
// 016 is immutable (already shipped); this is an additive follow-on. Idempotent
// (ON CONFLICT DO NOTHING), mirroring 016/017's role_permissions seeding.

const ROLE = 'rescue_staff';
const PERMISSIONS = ['staff.create', 'staff.update', 'staff.delete', 'staff.suspend'] as const;

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  for (const permission of PERMISSIONS) {
    // The permission row may not exist yet — 016 only inserted permissions it
    // actually granted, and none of these were granted to any base role.
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
