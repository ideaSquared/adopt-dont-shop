import Application, { ApplicationPriority, ApplicationStatus } from '../models/Application';

const applicationData = [
  {
    application_id: 'app_buddy_john_001',
    user_id: 'user_adopter_001', // John Smith
    pet_id: 'pet_buddy_001',
    rescue_id: 'rescue_pawsrescue_001',
    status: ApplicationStatus.UNDER_REVIEW,
    priority: ApplicationPriority.NORMAL,
    actioned_by: null,
    actioned_at: null,
    answers: {
      housing_type: 'house',
      home_ownership: 'owned',
      yard_fenced: true,
      yard_size: 'large',
      current_pets: [{ type: 'dog', breed: 'Labrador', age: 8, spayed_neutered: true }],
      previous_pets: [
        { type: 'dog', breed: 'Mixed', years_owned: 12, what_happened: 'Passed away from old age' },
      ],
      hours_alone: '4-6 hours',
      exercise_plan: 'Daily walks, weekend hikes, playing fetch in the yard',
      training_experience: 'Yes, trained our previous dog',
      veterinarian: {
        name: 'Dr. Johnson',
        clinic: 'Austin Pet Clinic',
        phone: '(512) 555-1234',
      },
      emergency_contact: {
        name: 'Sarah Smith',
        relationship: 'Spouse',
        phone: '(512) 555-5678',
      },
      household_members: [
        { name: 'John Smith', age: 38, relationship: 'Self' },
        { name: 'Sarah Smith', age: 36, relationship: 'Spouse' },
        { name: 'Emma Smith', age: 12, relationship: 'Daughter' },
        { name: 'Jake Smith', age: 10, relationship: 'Son' },
      ],
      why_adopt:
        'Our family dog passed away last year and we feel ready to open our hearts to another dog. Buddy seems like the perfect fit for our active family.',
      experience_level: 'Experienced',
    },
    references: [
      {
        name: 'Dr. Johnson',
        relationship: 'Veterinarian',
        phone: '(512) 555-1234',
        email: 'dr.johnson@austinpetclinic.com',
        status: 'pending',
      },
      {
        name: 'Mike Wilson',
        relationship: 'Friend/Neighbor',
        phone: '(512) 555-9876',
        email: 'mike.wilson@email.com',
        status: 'pending',
      },
    ],
    documents: [],
    interview_notes: null,
    home_visit_notes: null,
    score: null,
    tags: ['experienced-owner', 'family-with-kids', 'active-lifestyle'],
    notes: 'Application looks very promising. Family has good experience with dogs.',
    submitted_at: new Date('2024-02-15T10:30:00Z'),
    reviewed_at: null,
    decision_at: null,
    expires_at: new Date('2024-03-15T10:30:00Z'),
    follow_up_date: new Date('2024-03-01T09:00:00Z'),
  },
  {
    application_id: 'app_whiskers_emily_001',
    user_id: 'user_adopter_002', // Emily Davis
    pet_id: 'pet_whiskers_001',
    rescue_id: 'rescue_furryfriendspdx_001',
    status: ApplicationStatus.APPROVED,
    priority: ApplicationPriority.HIGH,
    actioned_by: 'user_rescue_admin_001',
    actioned_at: new Date('2024-02-20T14:45:00Z'),
    answers: {
      housing_type: 'apartment',
      home_ownership: 'rented',
      yard_fenced: false,
      yard_size: null,
      current_pets: [],
      previous_pets: [
        {
          type: 'cat',
          breed: 'Domestic Shorthair',
          years_owned: 15,
          what_happened: 'Passed away from kidney disease',
        },
      ],
      hours_alone: '6-8 hours',
      exercise_plan: 'Interactive toys, laser pointer, cat trees for climbing',
      training_experience: 'Yes, with cats',
      veterinarian: {
        name: 'Dr. Martinez',
        clinic: 'Portland Pet Hospital',
        phone: '(503) 555-2468',
      },
      emergency_contact: {
        name: 'Lisa Davis',
        relationship: 'Sister',
        phone: '(503) 555-3456',
      },
      household_members: [{ name: 'Emily Davis', age: 31, relationship: 'Self' }],
      why_adopt:
        'I lost my beloved cat of 15 years last year. I specifically want to adopt a senior cat to give them a loving home for their golden years.',
      experience_level: 'Very Experienced',
    },
    references: [
      {
        name: 'Dr. Martinez',
        relationship: 'Veterinarian',
        phone: '(503) 555-2468',
        email: 'dr.martinez@portlandpet.com',
        contacted_at: new Date('2024-02-18T11:00:00Z'),
        status: 'verified',
        notes: 'Excellent pet owner, very responsible with senior cat care',
      },
    ],
    documents: [],
    interview_notes:
      'Great candidate for senior cat adoption. Has extensive experience with senior pet care.',
    home_visit_notes:
      'Apartment is cat-proofed and has great sunny spots. Very suitable for senior cat.',
    score: 95,
    tags: ['senior-pet-specialist', 'experienced-owner', 'quiet-home'],
    notes: 'Perfect match for Whiskers. Emily understands senior cat needs perfectly.',
    submitted_at: new Date('2024-02-12T16:20:00Z'),
    reviewed_at: new Date('2024-02-18T10:00:00Z'),
    decision_at: new Date('2024-02-20T14:45:00Z'),
    expires_at: null,
    follow_up_date: null,
  },
  {
    application_id: 'app_rocky_michael_001',
    user_id: 'user_adopter_003', // Michael Brown
    pet_id: 'pet_rocky_001',
    rescue_id: 'rescue_happytails_001',
    status: ApplicationStatus.INTERVIEW_SCHEDULED,
    priority: ApplicationPriority.HIGH,
    actioned_by: 'user_rescue_admin_002',
    actioned_at: new Date('2024-02-18T09:15:00Z'),
    answers: {
      housing_type: 'house',
      home_ownership: 'owned',
      yard_fenced: true,
      yard_size: 'medium',
      current_pets: [],
      previous_pets: [
        {
          type: 'dog',
          breed: 'Pit Bull Mix',
          years_owned: 10,
          what_happened: 'Passed away from cancer',
        },
      ],
      hours_alone: '2-4 hours',
      exercise_plan: 'Daily walks, hiking on weekends, yard time',
      training_experience: 'Yes, experienced with pit bull type dogs',
      veterinarian: {
        name: 'Dr. Thompson',
        clinic: 'Seattle Veterinary Clinic',
        phone: '(206) 555-1357',
      },
      emergency_contact: {
        name: 'Jennifer Brown',
        relationship: 'Ex-wife (amicable)',
        phone: '(206) 555-2468',
      },
      household_members: [{ name: 'Michael Brown', age: 35, relationship: 'Self' }],
      why_adopt:
        'I lost my pit bull mix last year and I know how wonderful these misunderstood dogs can be. Rocky deserves a chance at happiness.',
      experience_level: 'Very Experienced',
    },
    references: [
      {
        name: 'Dr. Thompson',
        relationship: 'Veterinarian',
        phone: '(206) 555-1357',
        email: 'dr.thompson@seattlevet.com',
        contacted_at: new Date('2024-02-17T14:30:00Z'),
        status: 'verified',
        notes: 'Excellent owner of previous pit bull, very responsible',
      },
      {
        name: 'Tom Anderson',
        relationship: 'Dog trainer/Friend',
        phone: '(206) 555-8642',
        email: 'tom@seattledogtraining.com',
        status: 'verified',
        notes: 'Worked with Michael and his previous dog, very committed owner',
      },
    ],
    documents: [],
    interview_notes: null,
    home_visit_notes: null,
    score: null,
    tags: ['pit-bull-experienced', 'single-adult', 'breed-advocate'],
    notes: 'Excellent candidate for Rocky. Has specific experience with pit bull type dogs.',
    submitted_at: new Date('2024-02-14T13:45:00Z'),
    reviewed_at: new Date('2024-02-17T15:00:00Z'),
    decision_at: null,
    expires_at: new Date('2024-03-14T13:45:00Z'),
    follow_up_date: new Date('2024-02-25T10:00:00Z'),
  },
  {
    application_id: 'app_luna_jessica_001',
    user_id: 'user_adopter_004', // Jessica Wilson
    pet_id: 'pet_luna_001',
    rescue_id: 'rescue_pawsrescue_001',
    status: ApplicationStatus.REJECTED,
    priority: ApplicationPriority.LOW,
    actioned_by: 'user_rescue_staff_001',
    actioned_at: new Date('2024-02-19T11:30:00Z'),
    rejection_reason:
      'First-time pet owner not suitable for high-energy cat that needs experienced handling',
    answers: {
      housing_type: 'apartment',
      home_ownership: 'rented',
      yard_fenced: false,
      yard_size: null,
      current_pets: [],
      previous_pets: [],
      hours_alone: '8-10 hours',
      exercise_plan: 'Some toys, weekend play',
      training_experience: 'No experience',
      veterinarian: {
        name: 'To be determined',
        clinic: 'Will research',
        phone: 'N/A',
      },
      emergency_contact: {
        name: 'Mary Wilson',
        relationship: 'Mother',
        phone: '(617) 555-7890',
      },
      household_members: [{ name: 'Jessica Wilson', age: 33, relationship: 'Self' }],
      why_adopt: 'I want a pet for companionship',
      experience_level: 'First-time owner',
    },
    references: [],
    documents: [],
    interview_notes: null,
    home_visit_notes: null,
    score: 35,
    tags: ['first-time-owner', 'insufficient-experience'],
    notes:
      'While applicant seems kind, Luna needs someone with cat experience due to her high energy and social needs.',
    submitted_at: new Date('2024-02-16T20:15:00Z'),
    reviewed_at: new Date('2024-02-19T09:00:00Z'),
    decision_at: new Date('2024-02-19T11:30:00Z'),
    expires_at: null,
    follow_up_date: null,
  },
];

export async function seedApplications() {
  for (const appData of applicationData) {
    await Application.findOrCreate({
      where: { application_id: appData.application_id },
      defaults: {
        ...appData,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  console.log(`✅ Created ${applicationData.length} adoption applications`);
}
