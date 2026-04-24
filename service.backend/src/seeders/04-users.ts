import bcrypt from 'bcrypt';
import User, { UserStatus, UserType } from '../models/User';

const testUsers = [
  {
    userId: '0cbbd913-c94c-4254-a028-81b76df89c9f',
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
    userId: '0e394fc1-c11a-4148-a2c7-5dfc51798d8d',
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
    userId: '7599debb-3d71-497c-a6e9-a2aa255d77df',
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
    userId: '3d7065c5-82a3-4bba-a84e-78229365badd',
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
    userId: '378118eb-9e97-4940-adeb-0a53b252b057',
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
    userId: 'c283bd85-11ce-4494-add0-b06896d38e2d',
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
    userId: '98915d9e-69ed-46b2-a897-57d8469ff360',
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
    userId: 'fc369713-6925-4f02-a5c6-cb84b3652116',
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
    userId: 'c8973ffc-6e31-44fb-a3e4-fa3d9e8edb30',
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
    userId: '5f0c8a14-a37f-469e-a0fe-222db23d4fbd',
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
      paranoid: false,
      where: { userId: userData.userId },
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
                    county:
                      userData.userId === 'fc369713-6925-4f02-a5c6-cb84b3652116'
                        ? 'Greater Manchester'
                        : '',
                    postcode: userData.postalCode || '',
                    country: userData.country || 'United Kingdom',
                    dateOfBirth:
                      userData.userId === 'fc369713-6925-4f02-a5c6-cb84b3652116'
                        ? '1992-03-22'
                        : '',
                    occupation:
                      userData.userId === 'fc369713-6925-4f02-a5c6-cb84b3652116'
                        ? 'Marketing Coordinator'
                        : '',
                  },
                  livingSituation: {
                    housingType:
                      userData.userId === 'fc369713-6925-4f02-a5c6-cb84b3652116'
                        ? 'apartment'
                        : 'house',
                    isOwned:
                      userData.userId === 'fc369713-6925-4f02-a5c6-cb84b3652116' ? false : true,
                    hasYard:
                      userData.userId === 'fc369713-6925-4f02-a5c6-cb84b3652116' ? true : true,
                    allowsPets: true,
                    householdSize:
                      userData.userId === 'fc369713-6925-4f02-a5c6-cb84b3652116' ? 1 : 2,
                    householdMembers: [],
                    hasAllergies: false,
                    allergyDetails: '',
                  },
                  petExperience: {
                    experienceLevel:
                      userData.userId === 'fc369713-6925-4f02-a5c6-cb84b3652116' ? 'some' : 'some',
                    hasPetsCurrently: false,
                    currentPets: [],
                    previousPets: [],
                    willingToTrain: true,
                    hoursAloneDaily:
                      userData.userId === 'fc369713-6925-4f02-a5c6-cb84b3652116' ? 6 : 4,
                    exercisePlans:
                      userData.userId === 'fc369713-6925-4f02-a5c6-cb84b3652116'
                        ? 'Daily walks in the nearby park and interactive indoor play sessions'
                        : 'Regular outdoor activities and exercise',
                  },
                  references:
                    userData.userId !== '5f0c8a14-a37f-469e-a0fe-222db23d4fbd'
                      ? {
                          personal:
                            userData.userId === 'fc369713-6925-4f02-a5c6-cb84b3652116'
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
                  overall_percentage:
                    userData.userId === '5f0c8a14-a37f-469e-a0fe-222db23d4fbd' ? 75 : 100,
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
