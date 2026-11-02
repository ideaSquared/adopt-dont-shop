// Bootstrap account for the auth.* schema.
//
// Only the super_admin is written with SQL: no API route can create the first
// admin, because POST /api/v1/admin/users itself needs one. Every other dev
// persona (admins, rescue staff, adopters) is created through the gateway by
// scripts/seed.mjs, signed in as this account, so the seeded data always goes
// through the same validation, events and side effects as real traffic.
// The login panel (lib.dev-tools/src/data/seededUsers.ts) and the e2e roles
// (e2e/fixtures/roles.ts) use the same email and SEED_PASSWORD.

export type UserType =
  | 'adopter'
  | 'rescue_staff'
  | 'admin'
  | 'moderator'
  | 'super_admin'
  | 'support_agent';

export type SeedUser = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserType;
  phoneNumber?: string;
};

// Single dev password shared by every seeded persona. Mirrors
// lib.dev-tools SEEDED_PASSWORD and e2e SEEDED_PASSWORD. Overridable via
// SEED_PASSWORD for environments that want a different dev secret.
export const SEED_PASSWORD = process.env.SEED_PASSWORD?.trim() || 'DevPassword123!';

export const SEED_USERS: readonly SeedUser[] = [
  {
    userId: 'a0000000-0000-4000-8000-000000000001',
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@adoptdontshop.dev',
    userType: 'super_admin',
    phoneNumber: '+441234567890',
  },
];
