/**
 * The fixed dev/e2e persona dataset, generated through the gateway by
 * scripts/seed.mjs.
 *
 * Nothing here carries an id: the API assigns them, and everything that needs
 * one (e2e, the dev login panel) looks rows up by email or name. The emails and
 * the shared password are a contract with e2e/fixtures/roles.ts and
 * packages/lib.dev-tools/src/data/seededUsers.ts.
 *
 * The super_admin is not listed: it is the one account written with SQL
 * (services/auth/src/db/seed.ts), because creating any admin through the API
 * needs an admin to already exist.
 */

export const SUPER_ADMIN_EMAIL = 'superadmin@adoptdontshop.dev';

// Created by the super_admin through POST /api/v1/admin/users, then activated
// by redeeming the invitation.
export const ADMINS = [
  {
    email: 'admin@adoptdontshop.dev',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'admin',
  },
  {
    email: 'moderator@adoptdontshop.dev',
    firstName: 'Content',
    lastName: 'Moderator',
    role: 'moderator',
  },
];

// Created and verified by the super_admin. `key` is only a local handle the
// staff and pets below use to point at their rescue.
export const RESCUES = [
  {
    key: 'paws',
    name: 'Paws Rescue',
    email: 'hello@pawsrescue.dev',
    phone: '+441612345678',
    address: '1 Piccadilly Gardens',
    city: 'Manchester',
    postcode: 'M1 1AA',
    country: 'GB',
    contactPerson: 'Rescue Manager',
    description: 'A community rescue rehoming dogs and cats across the North West.',
  },
  {
    key: 'happyTails',
    name: 'Happy Tails Rescue',
    email: 'hello@happytailsrescue.dev',
    phone: '+441171234567',
    address: '10 Broad Quay',
    city: 'Bristol',
    postcode: 'BS1 4DJ',
    country: 'GB',
    contactPerson: 'Maria Garcia',
    description: 'Specialists in senior-dog adoption and long-term foster care.',
  },
];

// Invited to their rescue by the super_admin, then accepted through
// POST /api/v1/invitations/accept (which provisions the account).
export const STAFF = [
  {
    email: 'rescue.manager@pawsrescue.dev',
    firstName: 'Rescue',
    lastName: 'Manager',
    rescue: 'paws',
    title: 'Rescue Manager',
  },
  {
    email: 'sarah.johnson@pawsrescue.dev',
    firstName: 'Sarah',
    lastName: 'Johnson',
    rescue: 'paws',
    title: 'Veterinary Technician',
  },
  {
    email: 'maria@happytailsrescue.dev',
    firstName: 'Maria',
    lastName: 'Garcia',
    rescue: 'happyTails',
    title: 'Director',
  },
];

// Self-registered through POST /api/v1/auth/register, then email-verified.
export const ADOPTERS = [
  {
    email: 'john.smith@gmail.com',
    firstName: 'John',
    lastName: 'Smith',
    phoneNumber: '+447700900001',
  },
  {
    email: 'emily.davis@yahoo.com',
    firstName: 'Emily',
    lastName: 'Davis',
    phoneNumber: '+447700900002',
  },
  {
    email: 'michael.brown@outlook.com',
    firstName: 'Michael',
    lastName: 'Brown',
    phoneNumber: '+447700900003',
  },
];

// Created by a staff member of `rescue` (`createdBy`), then moved to `status`
// through the pet status machine. Pets always start 'available'.
export const PETS = [
  {
    name: 'Buddy',
    rescue: 'paws',
    createdBy: 'rescue.manager@pawsrescue.dev',
    type: 'dog',
    gender: 'male',
    size: 'large',
    ageGroup: 'adult',
    status: 'available',
    shortDescription: 'A friendly Labrador looking for an active family.',
  },
  {
    name: 'Luna',
    rescue: 'paws',
    createdBy: 'rescue.manager@pawsrescue.dev',
    type: 'cat',
    gender: 'female',
    size: 'small',
    ageGroup: 'young',
    status: 'pending',
    shortDescription: 'A gentle tabby cat, currently under adoption review.',
  },
  {
    // Paws-owned so the rescue.manager persona can read it: adopted pets are
    // hidden from non-owning callers, which e2e archive-adopted-pet exercises.
    name: 'Max',
    rescue: 'paws',
    createdBy: 'rescue.manager@pawsrescue.dev',
    type: 'dog',
    gender: 'male',
    size: 'medium',
    ageGroup: 'senior',
    status: 'adopted',
    shortDescription: 'A senior terrier who has found his forever home.',
  },
  {
    name: 'Bella',
    rescue: 'happyTails',
    createdBy: 'maria@happytailsrescue.dev',
    type: 'dog',
    gender: 'female',
    size: 'medium',
    ageGroup: 'adult',
    status: 'not_available',
    shortDescription: 'On hold pending a home check.',
  },
];

// Pets an adopter has favourited (the /favorites page and e2e read them back).
export const FAVORITES = [
  { adopter: 'john.smith@gmail.com', pet: 'Buddy' },
  { adopter: 'john.smith@gmail.com', pet: 'Luna' },
];

// Submitted by the adopter; `reviewedBy` (rescue staff) then starts the review
// so the rescue inbox has an under-review row. It is on Luna (the pet that is
// pending because of it) so Buddy stays open: an adopter with an application
// for a pet is redirected away from that pet's /apply form, which the e2e
// apply journeys use.
export const APPLICATIONS = [
  {
    adopter: 'john.smith@gmail.com',
    pet: 'Luna',
    reviewedBy: 'rescue.manager@pawsrescue.dev',
  },
];

// An enquiry the adopter opens about `pet`, then a back-and-forth with the
// rescue. Messages are only posted into a chat that has none yet.
export const ENQUIRIES = [
  {
    adopter: 'john.smith@gmail.com',
    pet: 'Buddy',
    messages: [
      {
        from: 'john.smith@gmail.com',
        content: "Hi! I'd love to find out more about adopting one of your dogs.",
      },
      {
        from: 'rescue.manager@pawsrescue.dev',
        content: 'Hello John, thanks for getting in touch. Do you have any pets at home already?',
      },
      {
        from: 'john.smith@gmail.com',
        content: 'No, just me and a secure garden. I work from home most days.',
      },
      {
        from: 'rescue.manager@pawsrescue.dev',
        content: 'That sounds ideal. Would you like to arrange a meet this weekend?',
      },
    ],
  },
];
