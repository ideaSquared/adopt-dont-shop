// Canonical dev/e2e personas for the auth.* schema.
//
// These rows recreate the accounts the old service.backend seeder used to
// populate — the same emails/passwords/roles the Playwright e2e suite
// (e2e/fixtures/roles.ts) and the dev-tools login panel
// (lib.dev-tools/src/data/seededUsers.ts) expect. Getting these wrong
// defeats the purpose of the seed, so the values are pinned here and
// re-asserted by the tests.
//
// user_id values are FIXED (deterministic) so cross-service seeds can
// reference them: rescue.staff_members.user_id and the pets/rescue
// created_by pointers all join back to these ids application-side.
// John Smith's id matches e2e/helpers/seeds.ts SEEDED_ADOPTER_USER_ID.

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
  // --- Admin personas (app.admin) -----------------------------------
  {
    userId: 'a0000000-0000-4000-8000-000000000001',
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@adoptdontshop.dev',
    userType: 'super_admin',
    phoneNumber: '+441234567890',
  },
  {
    userId: 'a0000000-0000-4000-8000-000000000002',
    firstName: 'System',
    lastName: 'Administrator',
    email: 'admin@adoptdontshop.dev',
    userType: 'admin',
    phoneNumber: '+441234567891',
  },
  {
    userId: 'a0000000-0000-4000-8000-000000000003',
    firstName: 'Content',
    lastName: 'Moderator',
    email: 'moderator@adoptdontshop.dev',
    userType: 'moderator',
    phoneNumber: '+441234567892',
  },
  // --- Rescue-staff personas (app.rescue) ---------------------------
  {
    userId: 'b0000000-0000-4000-8000-000000000001',
    firstName: 'Rescue',
    lastName: 'Manager',
    email: 'rescue.manager@pawsrescue.dev',
    userType: 'rescue_staff',
    phoneNumber: '+441234567893',
  },
  {
    userId: 'b0000000-0000-4000-8000-000000000002',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@pawsrescue.dev',
    userType: 'rescue_staff',
    phoneNumber: '+441234567894',
  },
  {
    userId: 'b0000000-0000-4000-8000-000000000003',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria@happytailsrescue.dev',
    userType: 'rescue_staff',
    phoneNumber: '+441234567895',
  },
  // --- Adopter personas (app.client) --------------------------------
  // John Smith's id is pinned to e2e SEEDED_ADOPTER_USER_ID.
  {
    userId: '98915d9e-69ed-46b2-a897-57d8469ff360',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@gmail.com',
    userType: 'adopter',
    phoneNumber: '+441234567896',
  },
  {
    userId: 'c0000000-0000-4000-8000-000000000002',
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@yahoo.com',
    userType: 'adopter',
    phoneNumber: '+441234567897',
  },
  {
    userId: 'c0000000-0000-4000-8000-000000000003',
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'michael.brown@outlook.com',
    userType: 'adopter',
    phoneNumber: '+441234567898',
  },
];
