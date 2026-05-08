import Application, {
  ApplicationPriority,
  ApplicationStatus,
  ApplicationStage,
  ApplicationOutcome,
} from '../models/Application';
import ApplicationAnswer from '../models/ApplicationAnswer';
import ApplicationReference, { ApplicationReferenceStatus } from '../models/ApplicationReference';
import { JsonValue } from '../types/common';

// Application.answers / Application.references[] moved to typed tables
// (plan 2.1). seedApplications() now does Application.findOrCreate
// first and then ApplicationAnswer.findOrCreate per question_key /
// ApplicationReference.findOrCreate per reference to keep the seeder
// idempotent.
type SeedReference = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  status: 'pending' | 'contacted' | 'verified' | 'failed';
  notes?: string;
  contacted_at?: Date;
};

const applicationData = [
  {
    applicationId: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
    userId: '98915d9e-69ed-46b2-a897-57d8469ff360', // John Smith
    petId: '9ff53898-c5c6-4422-a245-54e52d4c4b78',
    rescueId: '550e8400-e29b-41d4-a716-446655440001',
    status: ApplicationStatus.SUBMITTED,
    stage: ApplicationStage.VISITING, // Has multiple home visits scheduled
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
        id: 'ref-0',
        name: 'Dr. Johnson',
        relationship: 'Veterinarian',
        phone: '(512) 555-1234',
        email: 'dr.johnson@austinpetclinic.com',
        status: 'pending',
      },
      {
        id: 'ref-1',
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
    // New stage-based fields
    final_outcome: null,
    review_started_at: new Date('2024-02-16T09:00:00Z'), // Started review next day
    visit_scheduled_at: new Date('2024-02-18T11:00:00Z'), // First visit scheduled
    visit_completed_at: null, // Still in visiting stage
    resolved_at: null,
    withdrawal_reason: null,
    stage_rejection_reason: null,
  },
  {
    applicationId: '56a2a53c-36c5-41df-af76-96b1a5eb0647',
    userId: 'fc369713-6925-4f02-a5c6-cb84b3652116', // Emily Davis
    petId: '756ac9c5-ac22-49eb-a21d-8385d525e6de',
    rescueId: '550e8400-e29b-41d4-a716-446655440003',
    status: ApplicationStatus.APPROVED,
    stage: ApplicationStage.RESOLVED, // Application completed successfully
    priority: ApplicationPriority.HIGH,
    actioned_by: '3d7065c5-82a3-4bba-a84e-78229365badd',
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
        id: 'ref-0',
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
    // New stage-based fields - completed application
    final_outcome: ApplicationOutcome.APPROVED,
    review_started_at: new Date('2024-02-13T09:00:00Z'),
    visit_scheduled_at: new Date('2024-02-15T10:00:00Z'),
    visit_completed_at: new Date('2024-02-17T14:00:00Z'),
    resolved_at: new Date('2024-02-20T14:45:00Z'),
    withdrawal_reason: null,
    stage_rejection_reason: null,
  },
  {
    applicationId: '84e87262-08a3-4998-a2c2-5e5dfe5824e3',
    userId: 'c8973ffc-6e31-44fb-a3e4-fa3d9e8edb30', // Michael Brown
    petId: '9101b091-a826-46a7-a8bc-c8f22d94c294',
    rescueId: '550e8400-e29b-41d4-a716-446655440002',
    status: ApplicationStatus.SUBMITTED,
    stage: ApplicationStage.REVIEWING, // Interview scheduled means in review stage
    priority: ApplicationPriority.HIGH,
    actioned_by: 'c283bd85-11ce-4494-add0-b06896d38e2d',
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
        id: 'ref-0',
        name: 'Dr. Thompson',
        relationship: 'Veterinarian',
        phone: '(206) 555-1357',
        email: 'dr.thompson@seattlevet.com',
        contacted_at: new Date('2024-02-17T14:30:00Z'),
        status: 'verified',
        notes: 'Excellent owner of previous pit bull, very responsible',
      },
      {
        id: 'ref-1',
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
    // New stage-based fields - in review with interview scheduled
    final_outcome: null,
    review_started_at: new Date('2024-02-17T15:00:00Z'),
    visit_scheduled_at: null, // No visit scheduled yet
    visit_completed_at: null,
    resolved_at: null,
    withdrawal_reason: null,
    stage_rejection_reason: null,
  },
  {
    applicationId: '166bce5d-d9e8-45e4-aaad-6dff23e72c61',
    userId: '5f0c8a14-a37f-469e-a0fe-222db23d4fbd', // Jessica Wilson
    petId: 'a1d109eb-e717-44a0-aed7-c7c0af6c152f',
    rescueId: '550e8400-e29b-41d4-a716-446655440001',
    status: ApplicationStatus.REJECTED,
    stage: ApplicationStage.RESOLVED, // Application was rejected and resolved
    priority: ApplicationPriority.LOW,
    actioned_by: '378118eb-9e97-4940-adeb-0a53b252b057',
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
    // New stage-based fields - rejected application
    final_outcome: ApplicationOutcome.REJECTED,
    review_started_at: new Date('2024-02-19T09:00:00Z'),
    visit_scheduled_at: null, // No visit was scheduled
    visit_completed_at: null,
    resolved_at: new Date('2024-02-19T11:30:00Z'),
    withdrawal_reason: null,
    stage_rejection_reason: 'Insufficient experience for high-energy cat',
  },
  // Additional applications for testing various stages - all for rescue 550e8400-e29b-41d4-a716-446655440001
  {
    applicationId: '788539a9-bc51-4d2f-a6cb-7f4b28366461',
    userId: 'fc369713-6925-4f02-a5c6-cb84b3652116', // Emily Davis (reusing existing user)
    petId: '9ff53898-c5c6-4422-a245-54e52d4c4b78',
    rescueId: '550e8400-e29b-41d4-a716-446655440001',
    status: ApplicationStatus.SUBMITTED,
    stage: ApplicationStage.PENDING, // Just submitted, waiting for review
    priority: ApplicationPriority.NORMAL,
    actioned_by: null,
    actioned_at: null,
    answers: {
      housing_type: 'house',
      home_ownership: 'owned',
      yard_fenced: true,
      yard_size: 'medium',
      current_pets: [],
      previous_pets: [
        {
          type: 'dog',
          breed: 'Labrador',
          years_owned: 8,
          what_happened: 'Passed away from old age',
        },
      ],
      hours_alone: '3-5 hours',
      exercise_plan: 'Morning and evening walks, weekend beach trips',
      training_experience: 'Yes, basic obedience training',
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
      why_adopt: 'Looking for a loyal companion for outdoor activities and quiet evenings at home.',
      experience_level: 'Experienced',
    },
    references: [
      {
        id: 'ref-0',
        name: 'Dr. Martinez',
        relationship: 'Veterinarian',
        phone: '(503) 555-2468',
        email: 'dr.martinez@portlandpet.com',
        status: 'pending',
      },
    ],
    documents: [],
    interview_notes: null,
    home_visit_notes: null,
    score: null,
    tags: ['experienced-owner', 'active-lifestyle'],
    notes: 'New application, waiting for initial review.',
    submitted_at: new Date('2024-02-20T14:30:00Z'),
    reviewed_at: null,
    decision_at: null,
    expires_at: new Date('2024-03-20T14:30:00Z'),
    follow_up_date: null,
    final_outcome: null,
    review_started_at: null,
    visit_scheduled_at: null,
    visit_completed_at: null,
    resolved_at: null,
    withdrawal_reason: null,
    stage_rejection_reason: null,
  },
  {
    applicationId: '63e82319-b9c6-451a-a7a5-0754df6e0de2',
    userId: 'c8973ffc-6e31-44fb-a3e4-fa3d9e8edb30', // Michael Brown (reusing existing user)
    petId: 'e2ed19e7-29e6-49e8-aa13-fcc3cfe698e2',
    rescueId: '550e8400-e29b-41d4-a716-446655440001',
    status: ApplicationStatus.SUBMITTED,
    stage: ApplicationStage.REVIEWING, // In review, waiting for references
    priority: ApplicationPriority.HIGH,
    actioned_by: '3d7065c5-82a3-4bba-a84e-78229365badd',
    actioned_at: new Date('2024-02-19T10:00:00Z'),
    answers: {
      housing_type: 'house',
      home_ownership: 'owned',
      yard_fenced: true,
      yard_size: 'large',
      current_pets: [{ type: 'cat', breed: 'Domestic Shorthair', age: 5, spayed_neutered: true }],
      previous_pets: [
        {
          type: 'dog',
          breed: 'German Shepherd',
          years_owned: 12,
          what_happened: 'Passed away from cancer',
        },
      ],
      hours_alone: '4-6 hours',
      exercise_plan: 'Daily runs, agility training, hiking on weekends',
      training_experience: 'Yes, experienced with high-energy breeds and basic training',
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
        'Looking for an energetic young dog to train and grow with. I have experience with shepherds and understand their needs.',
      experience_level: 'Very Experienced',
    },
    references: [
      {
        id: 'ref-0',
        name: 'Dr. Thompson',
        relationship: 'Veterinarian',
        phone: '(206) 555-1357',
        email: 'dr.thompson@seattlevet.com',
        status: 'pending',
      },
      {
        id: 'ref-1',
        name: 'Tom Anderson',
        relationship: 'Dog trainer',
        phone: '(206) 555-8642',
        email: 'tom@seattledogtraining.com',
        status: 'pending',
      },
    ],
    documents: [],
    interview_notes: null,
    home_visit_notes: null,
    score: null,
    tags: ['shepherd-experienced', 'high-energy-ready', 'trainer-references'],
    notes: 'Good candidate for young energetic dog. Waiting for reference verification.',
    submitted_at: new Date('2024-02-18T09:15:00Z'),
    reviewed_at: new Date('2024-02-19T10:00:00Z'),
    decision_at: null,
    expires_at: new Date('2024-03-18T09:15:00Z'),
    follow_up_date: new Date('2024-02-28T10:00:00Z'),
    final_outcome: null,
    review_started_at: new Date('2024-02-19T10:00:00Z'),
    visit_scheduled_at: null,
    visit_completed_at: null,
    resolved_at: null,
    withdrawal_reason: null,
    stage_rejection_reason: null,
  },
  {
    applicationId: '3cd01bd2-cce0-4f5c-ac80-1e6011470c4f',
    userId: '98915d9e-69ed-46b2-a897-57d8469ff360', // John Smith (reusing existing user)
    petId: 'a1d109eb-e717-44a0-aed7-c7c0af6c152f',
    rescueId: '550e8400-e29b-41d4-a716-446655440001',
    status: ApplicationStatus.SUBMITTED,
    stage: ApplicationStage.VISITING, // Home visit scheduled
    priority: ApplicationPriority.HIGH,
    actioned_by: '378118eb-9e97-4940-adeb-0a53b252b057',
    actioned_at: new Date('2024-02-19T15:30:00Z'),
    answers: {
      housing_type: 'apartment',
      home_ownership: 'rented',
      yard_fenced: false,
      yard_size: null,
      current_pets: [{ type: 'cat', breed: 'Maine Coon', age: 4, spayed_neutered: true }],
      previous_pets: [
        { type: 'cat', breed: 'Siamese', years_owned: 16, what_happened: 'Passed away peacefully' },
      ],
      hours_alone: '6-8 hours',
      exercise_plan: 'Interactive toys, climbing trees, daily play sessions',
      training_experience: 'Yes, very experienced with cats',
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
      ],
      why_adopt:
        'Our cat Mittens needs a companion. Luna seems like she would get along well with our current cat.',
      experience_level: 'Very Experienced',
    },
    references: [
      {
        id: 'ref-0',
        name: 'Dr. Johnson',
        relationship: 'Veterinarian',
        phone: '(512) 555-1234',
        email: 'dr.johnson@austinpetclinic.com',
        contacted_at: new Date('2024-02-19T11:00:00Z'),
        status: 'verified',
        notes: 'Excellent cat owners, very attentive to feline needs',
      },
    ],
    documents: [],
    interview_notes:
      'Great candidates for Luna. Understand cat social needs and have experience introducing cats.',
    home_visit_notes: null,
    score: 88,
    tags: ['multi-cat-household', 'experienced-owner', 'siamese-experience'],
    notes: 'Excellent match for Luna. Home visit scheduled to assess cat introduction setup.',
    submitted_at: new Date('2024-02-17T11:20:00Z'),
    reviewed_at: new Date('2024-02-18T14:00:00Z'),
    decision_at: null,
    expires_at: new Date('2024-03-17T11:20:00Z'),
    follow_up_date: new Date('2024-02-25T14:00:00Z'),
    final_outcome: null,
    review_started_at: new Date('2024-02-18T14:00:00Z'),
    visit_scheduled_at: new Date('2024-02-22T10:00:00Z'),
    visit_completed_at: null,
    resolved_at: null,
    withdrawal_reason: null,
    stage_rejection_reason: null,
  },
  {
    applicationId: '26069c66-48aa-4994-a077-e04536513a74',
    userId: '5f0c8a14-a37f-469e-a0fe-222db23d4fbd', // Jessica Wilson (reusing existing user)
    petId: '9ff53898-c5c6-4422-a245-54e52d4c4b78',
    rescueId: '550e8400-e29b-41d4-a716-446655440001',
    status: ApplicationStatus.APPROVED,
    stage: ApplicationStage.DECIDING, // Home visit completed, making final decision
    priority: ApplicationPriority.HIGH,
    actioned_by: '3d7065c5-82a3-4bba-a84e-78229365badd',
    actioned_at: new Date('2024-02-20T11:00:00Z'),
    answers: {
      housing_type: 'house',
      home_ownership: 'owned',
      yard_fenced: true,
      yard_size: 'large',
      current_pets: [],
      previous_pets: [
        {
          type: 'dog',
          breed: 'Golden Retriever',
          years_owned: 11,
          what_happened: 'Passed away from heart condition',
        },
      ],
      hours_alone: '2-4 hours',
      exercise_plan: 'Daily walks, swimming, agility training, dog park visits',
      training_experience: 'Yes, advanced training including agility and therapy dog certification',
      veterinarian: {
        name: 'Dr. Wilson',
        clinic: 'Boston Animal Hospital',
        phone: '(617) 555-9999',
      },
      emergency_contact: {
        name: 'Mary Wilson',
        relationship: 'Mother',
        phone: '(617) 555-7890',
      },
      household_members: [{ name: 'Jessica Wilson', age: 33, relationship: 'Self' }],
      why_adopt:
        'I lost my therapy dog last year and would love to train another golden retriever for therapy work while giving them a loving home.',
      experience_level: 'Expert',
    },
    references: [
      {
        id: 'ref-0',
        name: 'Dr. Wilson',
        relationship: 'Veterinarian',
        phone: '(617) 555-9999',
        email: 'dr.wilson@bostonah.com',
        contacted_at: new Date('2024-02-19T09:30:00Z'),
        status: 'verified',
        notes: 'Outstanding dog owner, excellent care for previous therapy dog',
      },
      {
        id: 'ref-1',
        name: 'Sandra Mills',
        relationship: 'Therapy Dog Organization Coordinator',
        phone: '(617) 555-4455',
        email: 'sandra@therapydogs.org',
        contacted_at: new Date('2024-02-19T14:00:00Z'),
        status: 'verified',
        notes: 'Jessica was excellent trainer and handler, highly recommend',
      },
    ],
    documents: [
      {
        document_id: 'doc-0',
        document_type: 'therapy_certification',
        file_name: 'Therapy_Dog_Handler_Certification.pdf',
        file_url: '/uploads/documents/therapy_certification_doc-0.pdf',
        uploaded_at: new Date('2024-02-18T16:00:00Z'),
        verified: true,
      },
    ],
    interview_notes:
      'Exceptional candidate with therapy dog experience. Would be perfect for Buddy.',
    home_visit_notes:
      'Perfect setup for large dog. Extensive experience evident in home setup and equipment.',
    score: 98,
    tags: ['therapy-dog-experience', 'expert-trainer', 'golden-retriever-specialist'],
    notes:
      'Outstanding candidate for Buddy. All checks completed successfully. Final decision pending.',
    submitted_at: new Date('2024-02-16T13:45:00Z'),
    reviewed_at: new Date('2024-02-17T10:00:00Z'),
    decision_at: null,
    expires_at: new Date('2024-03-16T13:45:00Z'),
    follow_up_date: new Date('2024-02-22T10:00:00Z'),
    final_outcome: null,
    review_started_at: new Date('2024-02-17T10:00:00Z'),
    visit_scheduled_at: new Date('2024-02-19T15:00:00Z'),
    visit_completed_at: new Date('2024-02-20T11:00:00Z'),
    resolved_at: null,
    withdrawal_reason: null,
    stage_rejection_reason: null,
  },
  {
    applicationId: 'f8373bd0-e691-47de-ad94-25e9ccd78ffa',
    userId: 'fc369713-6925-4f02-a5c6-cb84b3652116', // Emily Davis (reusing)
    petId: 'e2ed19e7-29e6-49e8-aa13-fcc3cfe698e2',
    rescueId: '550e8400-e29b-41d4-a716-446655440001',
    status: ApplicationStatus.APPROVED,
    stage: ApplicationStage.RESOLVED, // Conditionally approved
    priority: ApplicationPriority.NORMAL,
    actioned_by: 'c283bd85-11ce-4494-add0-b06896d38e2d',
    actioned_at: new Date('2024-02-21T13:30:00Z'),
    answers: {
      housing_type: 'house',
      home_ownership: 'owned',
      yard_fenced: true,
      yard_size: 'medium',
      current_pets: [],
      previous_pets: [
        {
          type: 'dog',
          breed: 'Border Collie',
          years_owned: 9,
          what_happened: 'Passed away from old age',
        },
      ],
      hours_alone: '5-7 hours',
      exercise_plan: 'Daily walks, weekend hiking, some agility training',
      training_experience: 'Yes, basic and intermediate training',
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
      why_adopt: 'Ready for another intelligent, energetic dog after losing my border collie.',
      experience_level: 'Experienced',
    },
    references: [
      {
        id: 'ref-0',
        name: 'Dr. Martinez',
        relationship: 'Veterinarian',
        phone: '(503) 555-2468',
        email: 'dr.martinez@portlandpet.com',
        contacted_at: new Date('2024-02-20T10:00:00Z'),
        status: 'verified',
        notes: 'Good owner, needs more time for training commitment',
      },
    ],
    documents: [],
    interview_notes:
      'Good candidate but needs to commit to more training time for young energetic dog.',
    home_visit_notes: 'Good setup, but applicant needs to increase exercise commitment.',
    score: 75,
    tags: ['conditional-approval', 'needs-training-commitment'],
    notes:
      'Approved conditionally pending completion of basic training course and increased exercise plan.',
    submitted_at: new Date('2024-02-15T10:15:00Z'),
    reviewed_at: new Date('2024-02-18T14:30:00Z'),
    decision_at: new Date('2024-02-21T13:30:00Z'),
    expires_at: null,
    follow_up_date: new Date('2024-03-15T10:00:00Z'), // Follow up on training progress
    final_outcome: ApplicationOutcome.APPROVED,
    review_started_at: new Date('2024-02-18T14:30:00Z'),
    visit_scheduled_at: new Date('2024-02-20T11:00:00Z'),
    visit_completed_at: new Date('2024-02-21T10:00:00Z'),
    resolved_at: new Date('2024-02-21T13:30:00Z'),
    withdrawal_reason: null,
    stage_rejection_reason: null,
  },
  {
    applicationId: 'efd40b13-d863-4deb-ad6f-16dc3fdcfe5b',
    userId: 'c8973ffc-6e31-44fb-a3e4-fa3d9e8edb30', // Michael Brown (reusing)
    petId: 'a1d109eb-e717-44a0-aed7-c7c0af6c152f',
    rescueId: '550e8400-e29b-41d4-a716-446655440001',
    status: ApplicationStatus.WITHDRAWN,
    stage: ApplicationStage.WITHDRAWN, // Applicant withdrew
    priority: ApplicationPriority.LOW,
    actioned_by: null,
    actioned_at: null,
    answers: {
      housing_type: 'apartment',
      home_ownership: 'rented',
      yard_fenced: false,
      yard_size: null,
      current_pets: [],
      previous_pets: [],
      hours_alone: '8-10 hours',
      exercise_plan: 'Evening play sessions, weekend activities',
      training_experience: 'Some experience',
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
      why_adopt: 'Would like a cat for companionship.',
      experience_level: 'Beginner',
    },
    references: [],
    documents: [],
    interview_notes: null,
    home_visit_notes: null,
    score: null,
    tags: ['withdrawn', 'changed-mind'],
    notes: 'Applicant decided to wait and gain more experience before adopting.',
    submitted_at: new Date('2024-02-19T16:00:00Z'),
    reviewed_at: null,
    decision_at: null,
    expires_at: null,
    follow_up_date: null,
    final_outcome: null,
    review_started_at: null,
    visit_scheduled_at: null,
    visit_completed_at: null,
    resolved_at: new Date('2024-02-20T09:30:00Z'),
    withdrawal_reason: 'Decided to wait and gain more cat experience first',
    stage_rejection_reason: null,
  },
  {
    applicationId: '38f9e744-7efd-4da8-ad9e-997289bfb32d',
    userId: '98915d9e-69ed-46b2-a897-57d8469ff360', // John Smith (reusing)
    petId: '9ff53898-c5c6-4422-a245-54e52d4c4b78',
    rescueId: '550e8400-e29b-41d4-a716-446655440001',
    status: ApplicationStatus.REJECTED,
    stage: ApplicationStage.RESOLVED, // Expired without action
    priority: ApplicationPriority.LOW,
    actioned_by: null,
    actioned_at: null,
    answers: {
      housing_type: 'house',
      home_ownership: 'owned',
      yard_fenced: false,
      yard_size: 'small',
      current_pets: [{ type: 'cat', breed: 'Tabby', age: 3, spayed_neutered: true }],
      previous_pets: [],
      hours_alone: '6-8 hours',
      exercise_plan: 'Daily walks',
      training_experience: 'Minimal',
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
      ],
      why_adopt: 'Think it would be nice to have a dog.',
      experience_level: 'Beginner',
    },
    references: [],
    documents: [],
    interview_notes: null,
    home_visit_notes: null,
    score: null,
    tags: ['expired', 'incomplete-application'],
    notes: 'Application expired without sufficient follow-up from applicant.',
    submitted_at: new Date('2024-01-15T10:30:00Z'),
    reviewed_at: null,
    decision_at: null,
    expires_at: new Date('2024-02-15T10:30:00Z'), // Expired
    follow_up_date: null,
    final_outcome: null,
    review_started_at: null,
    visit_scheduled_at: null,
    visit_completed_at: null,
    resolved_at: new Date('2024-02-15T10:30:00Z'),
    withdrawal_reason: null,
    stage_rejection_reason: null,
  },
];

export async function seedApplications() {
  for (const appData of applicationData) {
    const { references, answers, ...applicationFields } = appData as typeof appData & {
      references: SeedReference[];
      answers: Record<string, JsonValue>;
    };

    const defaults = {
      ...applicationFields,
      // ADS-535: Application.beforeValidate refuses SUBMITTED applications
      // unless the adopter has confirmed their references consented to be
      // contacted (a real-world step the rescue does outside the app).
      // Seed fixtures all use SUBMITTED status, so set the flag here so
      // the hook lets the seeder land. The same applies to ADS-534's
      // COPPA flag — none of the seed fixtures contain children, so
      // requiresCoppaConsent stays falsy.
      referencesConsented: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await Application.findOrCreate({
      paranoid: false,
      where: { applicationId: appData.applicationId },
      // Type assertion justified: Application form data structure is intentionally flexible
      // to support various rescue organization requirements and nested JSON structures
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      defaults: defaults as any,
    });

    // Bulk-insert with ignoreDuplicates instead of per-row findOrCreate.
    // 240 sequential round-trips (16 apps × ~15 answers) was tipping
    // the CI backend health check past its 90s budget on cold starts.
    // The (application_id, question_key) unique index keeps the seeder
    // idempotent — duplicates from a re-run are dropped by Postgres.
    const answerEntries = Object.entries(answers ?? {});
    if (answerEntries.length > 0) {
      await ApplicationAnswer.bulkCreate(
        answerEntries.map(([question_key, answer_value]) => ({
          application_id: appData.applicationId,
          question_key,
          answer_value: answer_value as JsonValue,
        })),
        { ignoreDuplicates: true }
      );
    }

    if (references.length > 0) {
      await ApplicationReference.bulkCreate(
        references.map((ref, index) => ({
          application_id: appData.applicationId,
          legacy_id: ref.id,
          name: ref.name,
          relationship: ref.relationship,
          phone: ref.phone,
          email: ref.email ?? null,
          status: (ref.status as ApplicationReferenceStatus) ?? ApplicationReferenceStatus.PENDING,
          contacted_at: ref.contacted_at ?? null,
          contacted_by: null,
          notes: ref.notes ?? null,
          order_index: index,
        })),
        { ignoreDuplicates: true }
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${applicationData.length} adoption applications`);
}
