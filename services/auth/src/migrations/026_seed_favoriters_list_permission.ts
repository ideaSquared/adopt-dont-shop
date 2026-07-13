import type { MigrationBuilder } from 'node-pg-migrate';

// Seed `pets.favoriters.list:any` — the ListFavoriters gate (ADS-922).
//
// PetService.ListFavoriters enumerates the user_ids of everyone who
// favourited a pet. It previously gated on plain `pets.read`, which every
// adopter holds, so any adopter could enumerate other users' favourite
// activity (cross-tenant PII / stalking vector). The handler now requires
// `pets.favoriters.list:any` instead.
//
// Deliberately granted to NO user-facing role: the only expected caller is
// the notifications service's signed system principal (see
// services/notifications/src/grpc/pets-client.ts), which carries the
// permission in its x-principal-token rather than resolving it from these
// tables. Seeding the permission row keeps the RBAC tables the single
// registry of permission names without widening any role's grants.
// super_admin still passes the gate via the role short-circuit in authz.
const PERMISSION = 'pets.favoriters.list:any';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(
    `INSERT INTO auth.permissions (permission_name) VALUES ('${PERMISSION}')
     ON CONFLICT (permission_name) DO NOTHING`
  );
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
