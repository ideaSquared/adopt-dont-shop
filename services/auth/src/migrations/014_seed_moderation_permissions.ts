import type { MigrationBuilder } from 'node-pg-migrate';

// Seed the dedicated MODERATION_* permission namespace and grant it to the
// roles that previously relied on the `admin.dashboard` placeholder for
// moderation access.
//
// Background: the moderation service used to gate every moderator-only
// handler on `admin.dashboard`. That permission is now split into five
// grouped moderation permissions (lib.types):
//   moderation.reports.view      — read moderation reports
//   moderation.reports.manage    — assign / resolve reports
//   moderation.sanctions.manage  — issue / appeal-review sanctions
//   moderation.tickets.manage    — moderation support-ticket queue
//   moderation.actions.manage    — moderator action log + evidence
//
// Without this seed, switching the handlers to the new permissions would
// deny every existing moderator (their roles only hold `admin.dashboard`).
// So we grant the five new permissions to EXACTLY the roles that already
// hold `admin.dashboard` — i.e. the roles that currently pass the
// moderation gate (admin, super_admin, moderator in the seeded data, plus
// any other role an operator has granted `admin.dashboard`). This is the
// no-regression invariant: any role that could moderate before can still
// moderate after.
//
// Idempotent: permission rows are inserted ON CONFLICT DO NOTHING, and the
// grants are an INSERT ... SELECT ... ON CONFLICT DO NOTHING, so a re-run is
// a no-op. Safe to run on every boot.

const MODERATION_PERMISSIONS = [
  'moderation.reports.view',
  'moderation.reports.manage',
  'moderation.sanctions.manage',
  'moderation.tickets.manage',
  'moderation.actions.manage',
];

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  // 1. Ensure the five permission rows exist.
  for (const name of MODERATION_PERMISSIONS) {
    pgm.sql(`
      INSERT INTO auth.permissions (permission_name)
      VALUES ('${name}')
      ON CONFLICT (permission_name) DO NOTHING
    `);
  }

  // 2. Grant each new permission to every role that already holds the
  //    admin.dashboard placeholder. The SELECT cross-joins the matching
  //    roles with the new permissions; ON CONFLICT keeps it idempotent.
  pgm.sql(`
    INSERT INTO auth.role_permissions (role_id, permission_id)
    SELECT placeholder.role_id, new_perm.permission_id
    FROM auth.role_permissions placeholder
    JOIN auth.permissions admin_perm
      ON admin_perm.permission_id = placeholder.permission_id
     AND admin_perm.permission_name = 'admin.dashboard'
    JOIN auth.permissions new_perm
      ON new_perm.permission_name IN (
        'moderation.reports.view',
        'moderation.reports.manage',
        'moderation.sanctions.manage',
        'moderation.tickets.manage',
        'moderation.actions.manage'
      )
    ON CONFLICT (role_id, permission_id) DO NOTHING
  `);
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  // Revoke the grants and drop the permission rows. role_permissions rows
  // referencing these permissions cascade on the permission delete, but we
  // delete them explicitly first so the down is order-independent.
  pgm.sql(`
    DELETE FROM auth.role_permissions
    WHERE permission_id IN (
      SELECT permission_id FROM auth.permissions
      WHERE permission_name IN (
        'moderation.reports.view',
        'moderation.reports.manage',
        'moderation.sanctions.manage',
        'moderation.tickets.manage',
        'moderation.actions.manage'
      )
    )
  `);
  pgm.sql(`
    DELETE FROM auth.permissions
    WHERE permission_name IN (
      'moderation.reports.view',
      'moderation.reports.manage',
      'moderation.sanctions.manage',
      'moderation.tickets.manage',
      'moderation.actions.manage'
    )
  `);
};
