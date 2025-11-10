import bcrypt from 'bcrypt';
import User, { UserStatus, UserType } from '../models/User';

const testUsers = [
  {
    userId: 'user_superadmin_001',
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@adoptdontshop.dev',
    phoneNumber: '+1234567890',
    auto_populate: true,
    quick_apply_enabled: false,
    userType: UserType.ADMIN,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    country: 'US',
    city: 'New York',
    timezone: 'America/New_York',
    language: 'en',
    termsAcceptedAt: new Date(),
    privacyPolicyAcceptedAt: new Date(),
  },
  {
    userId: 'user_admin_001',
    firstName: 'System',
    lastName: 'Administrator',
    email: 'admin@adoptdontshop.dev',
    phoneNumber: '+1234567891',
    userType: UserType.ADMIN,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    country: 'US',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
    language: 'en',
    termsAcceptedAt: new Date(),
    privacyPolicyAcceptedAt: new Date(),
  },
  {
    userId: 'user_moderator_001',
    firstName: 'Content',
    lastName: 'Moderator',
    email: 'moderator@adoptdontshop.dev',
    phoneNumber: '+1234567892',
    userType: UserType.MODERATOR,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    country: 'US',
    city: 'Chicago',
    timezone: 'America/Chicago',
    language: 'en',
    termsAcceptedAt: new Date(),
    privacyPolicyAcceptedAt: new Date(),
  },
  {
    userId: 'user_rescue_admin_001',
    firstName: 'Rescue',
    lastName: 'Manager',
    email: 'rescue.manager@pawsrescue.dev',
    phoneNumber: '+1234567893',
    userType: UserType.RESCUE_STAFF,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    country: 'US',
    city: 'Austin',
    timezone: 'America/Chicago',
    language: 'en',
    bio: 'Passionate about animal rescue and finding homes for pets in need.',
    termsAcceptedAt: new Date(),
    privacyPolicyAcceptedAt: new Date(),
  },
  {
    userId: 'user_rescue_staff_001',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@pawsrescue.dev',
    phoneNumber: '+1234567894',
    userType: UserType.RESCUE_STAFF,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    country: 'US',
    city: 'Austin',
    timezone: 'America/Chicago',
    language: 'en',
    bio: 'Veterinary technician helping rescued animals get healthy and ready for adoption.',
    termsAcceptedAt: new Date(),
    privacyPolicyAcceptedAt: new Date(),
  },
  {
    userId: 'user_rescue_admin_002',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria@happytailsrescue.dev',
    phoneNumber: '+1234567895',
    userType: UserType.RESCUE_STAFF,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    country: 'US',
    city: 'Miami',
    timezone: 'America/New_York',
    language: 'en',
    bio: 'Director of Happy Tails Rescue, specializing in senior dog adoption.',
    termsAcceptedAt: new Date(),
    privacyPolicyAcceptedAt: new Date(),
  },
  {
    userId: 'user_adopter_001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@gmail.com',
    phoneNumber: '+1234567896',
    userType: UserType.ADOPTER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    country: 'US',
    city: 'Denver',
    addressLine1: '123 Main Street',
    postalCode: '80202',
    timezone: 'America/Denver',
    language: 'en',
    bio: 'Looking to adopt a friendly dog for my family.',
    dateOfBirth: new Date('1985-06-15'),
    termsAcceptedAt: new Date(),
    privacyPolicyAcceptedAt: new Date(),
  },
  {
    userId: 'user_adopter_002',
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@yahoo.com',
    phoneNumber: '07789123456',
    userType: UserType.ADOPTER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    country: 'United Kingdom',
    city: 'Manchester',
    addressLine1: '25 Victoria Road',
    postalCode: 'M14 5TB',
    timezone: 'Europe/London',
    language: 'en',
    bio: 'Cat lover looking for a special feline companion. Living in a cozy flat with a garden.',
    dateOfBirth: new Date('1992-03-22'),
    termsAcceptedAt: new Date(),
    privacyPolicyAcceptedAt: new Date(),
  },
  {
    userId: 'user_adopter_003',
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'michael.brown@outlook.com',
    phoneNumber: '+1234567898',
    userType: UserType.ADOPTER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    country: 'US',
    city: 'Seattle',
    addressLine1: '789 Pine Street',
    postalCode: '98101',
    timezone: 'America/Los_Angeles',
    language: 'en',
    bio: 'Experienced dog owner looking for an active companion for hiking.',
    dateOfBirth: new Date('1988-11-10'),
    termsAcceptedAt: new Date(),
    privacyPolicyAcceptedAt: new Date(),
  },
  {
    userId: 'user_adopter_004',
    firstName: 'Jessica',
    lastName: 'Wilson',
    email: 'jessica.wilson@gmail.com',
    phoneNumber: '+1234567899',
    userType: UserType.ADOPTER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    country: 'US',
    city: 'Boston',
    addressLine1: '321 Elm Street',
    postalCode: '02101',
    timezone: 'America/New_York',
    language: 'en',
    bio: 'First-time pet owner looking for a gentle, well-trained pet.',
    dateOfBirth: new Date('1990-07-18'),
    termsAcceptedAt: new Date(),
    privacyPolicyAcceptedAt: new Date(),
  },
];

export async function seedUsers() {
  // No need to pre-hash - the User model hooks will handle it
  const plainPassword = 'DevPassword123!';

  for (const userData of testUsers) {
    await User.findOrCreate({
      where: { email: userData.email },
      defaults: {
        ...userData,
        password: plainPassword,
        loginAttempts: 0,
        privacySettings: {
          showProfile: true,
          showLocation: false,
          allowMessages: true,
        },
        notificationPreferences: {
          email: true,
          push: true,
          sms: false,
          applicationUpdates: true,
          chatMessages: true,
          newPetAlerts: true,
        },
        // Phase 1: Application defaults (JSON structure for adopters)
        applicationDefaults:
          userData.userType === UserType.ADOPTER
            ? JSON.parse(
                JSON.stringify({
                  personalInfo: {
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    email: userData.email || '',
                    phone: userData.phoneNumber || '',
                    address: userData.addressLine1 || '',
                    city: userData.city || '',
                    county: userData.userId === 'user_adopter_002' ? 'Greater Manchester' : '',
                    postcode: userData.postalCode || '',
                    country: userData.country || 'United Kingdom',
                    dateOfBirth: userData.userId === 'user_adopter_002' ? '1992-03-22' : '',
                    occupation:
                      userData.userId === 'user_adopter_002' ? 'Marketing Coordinator' : '',
                  },
                  livingSituation: {
                    housingType: userData.userId === 'user_adopter_002' ? 'apartment' : 'house',
                    isOwned: userData.userId === 'user_adopter_002' ? false : true,
                    hasYard: userData.userId === 'user_adopter_002' ? true : true,
                    allowsPets: true,
                    householdSize: userData.userId === 'user_adopter_002' ? 1 : 2,
                    householdMembers: [],
                    hasAllergies: false,
                    allergyDetails: '',
                  },
                  petExperience: {
                    experienceLevel: userData.userId === 'user_adopter_002' ? 'some' : 'some',
                    hasPetsCurrently: false,
                    currentPets: [],
                    previousPets: [],
                    willingToTrain: true,
                    hoursAloneDaily: userData.userId === 'user_adopter_002' ? 6 : 4,
                    exercisePlans:
                      userData.userId === 'user_adopter_002'
                        ? 'Daily walks in the nearby park and interactive indoor play sessions'
                        : 'Regular outdoor activities and exercise',
                  },
                  references:
                    userData.userId !== 'user_adopter_004'
                      ? {
                          personal:
                            userData.userId === 'user_adopter_002'
                              ? [
                                  {
                                    name: 'Sophie Williams',
                                    relationship: 'Close Friend',
                                    phone: '07892345678',
                                    email: 'sophie.williams@gmail.com',
                                    yearsKnown: 8,
                                  },
                                  {
                                    name: 'James Thompson',
                                    relationship: 'Colleague',
                                    phone: '07765432109',
                                    email: 'j.thompson@workplace.co.uk',
                                    yearsKnown: 3,
                                  },
                                ]
                              : [],
                        }
                      : null,
                })
              )
            : null,
        applicationPreferences:
          userData.userType === UserType.ADOPTER
            ? JSON.parse(
                JSON.stringify({
                  auto_populate: true,
                  quick_apply_enabled: true,
                  completion_reminders: true,
                })
              )
            : undefined,
        profileCompletionStatus:
          userData.userType === UserType.ADOPTER
            ? JSON.parse(
                JSON.stringify({
                  overall_percentage: userData.userId === 'user_adopter_004' ? 75 : 100,
                  last_updated: new Date().toISOString(),
                })
              )
            : undefined,
        applicationTemplateVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${testUsers.length} test users (password: DevPassword123!)`);
}
