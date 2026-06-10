// Canonical dev/e2e fixtures for the rescue.* schema.
//
// Recreates the two rescue organisations the old service.backend seeder
// populated, plus the staff_member rows that link the seeded rescue-staff
// users (auth.users) to their rescue. user_id / created_by values are the
// FIXED auth user ids from services/auth/src/db/seed-data.ts — the link is
// application-side (no cross-schema FK), so the ids must match by hand.

export type SeedRescue = {
  rescueId: string;
  name: string;
  email: string;
  city: string;
  zipCode: string;
  contactPerson: string;
  description: string;
};

export type SeedStaff = {
  staffMemberId: string;
  rescueId: string;
  userId: string;
  title: string;
};

// Pinned auth user ids (see services/auth/src/db/seed-data.ts).
const RESCUE_MANAGER_ID = 'b0000000-0000-4000-8000-000000000001';
const SARAH_JOHNSON_ID = 'b0000000-0000-4000-8000-000000000002';
const MARIA_GARCIA_ID = 'b0000000-0000-4000-8000-000000000003';

export const PAWS_RESCUE_ID = 'd0000000-0000-4000-8000-000000000001';
export const HAPPY_TAILS_RESCUE_ID = 'd0000000-0000-4000-8000-000000000002';

export const SEED_RESCUES: readonly SeedRescue[] = [
  {
    rescueId: PAWS_RESCUE_ID,
    name: 'Paws Rescue',
    email: 'hello@pawsrescue.dev',
    city: 'Manchester',
    zipCode: 'M1 1AA',
    contactPerson: 'Rescue Manager',
    description: 'A community rescue rehoming dogs and cats across the North West.',
  },
  {
    rescueId: HAPPY_TAILS_RESCUE_ID,
    name: 'Happy Tails Rescue',
    email: 'hello@happytailsrescue.dev',
    city: 'Bristol',
    zipCode: 'BS1 4DJ',
    contactPerson: 'Maria Garcia',
    description: 'Specialists in senior-dog adoption and long-term foster care.',
  },
];

export const SEED_STAFF: readonly SeedStaff[] = [
  {
    staffMemberId: 'e0000000-0000-4000-8000-000000000001',
    rescueId: PAWS_RESCUE_ID,
    userId: RESCUE_MANAGER_ID,
    title: 'Rescue Manager',
  },
  {
    staffMemberId: 'e0000000-0000-4000-8000-000000000002',
    rescueId: PAWS_RESCUE_ID,
    userId: SARAH_JOHNSON_ID,
    title: 'Veterinary Technician',
  },
  {
    staffMemberId: 'e0000000-0000-4000-8000-000000000003',
    rescueId: HAPPY_TAILS_RESCUE_ID,
    userId: MARIA_GARCIA_ID,
    title: 'Director',
  },
];
