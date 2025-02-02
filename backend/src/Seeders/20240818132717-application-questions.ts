import { QueryInterface, QueryTypes } from 'sequelize'
import {
  QuestionCategory,
  QuestionType,
} from '../Models/ApplicationQuestionConfig'

interface ApplicationQuestion {
  config_id: string
  rescue_id: string
  question_key: string
  category: QuestionCategory
  question_type: QuestionType
  question_text: string
  is_enabled: boolean
  is_required: boolean
  options?: string[]
  created_at: Date
  updated_at: Date
}

const generateDefaultQuestions = (rescue_id: string): ApplicationQuestion[] => {
  const now = new Date()

  return [
    // Personal Information
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'full_name',
      category: 'PERSONAL_INFORMATION',
      question_type: 'TEXT',
      question_text: 'Full Name',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'email',
      category: 'PERSONAL_INFORMATION',
      question_type: 'EMAIL',
      question_text: 'Email Address',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'phone',
      category: 'PERSONAL_INFORMATION',
      question_type: 'PHONE',
      question_text: 'Phone Number',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'address',
      category: 'PERSONAL_INFORMATION',
      question_type: 'ADDRESS',
      question_text:
        'Address (including city, state, country, and postal code)',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'age',
      category: 'PERSONAL_INFORMATION',
      question_type: 'NUMBER',
      question_text: 'Age (to verify minimum age requirement for adoption)',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'preferred_contact',
      category: 'PERSONAL_INFORMATION',
      question_type: 'SELECT',
      question_text: 'Preferred Contact Method',
      options: ['Phone', 'Email', 'Text'],
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },

    // Household Information
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'home_ownership',
      category: 'HOUSEHOLD_INFORMATION',
      question_type: 'SELECT',
      question_text: 'Do you own or rent your home?',
      options: ['Own', 'Rent'],
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'landlord_permission',
      category: 'HOUSEHOLD_INFORMATION',
      question_type: 'BOOLEAN',
      question_text: 'If renting, do you have landlord permission for pets?',
      is_enabled: true,
      is_required: false,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'home_type',
      category: 'HOUSEHOLD_INFORMATION',
      question_type: 'SELECT',
      question_text: 'What type of home do you live in?',
      options: ['Apartment', 'House', 'Townhouse', 'Condo', 'Other'],
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'household_members',
      category: 'HOUSEHOLD_INFORMATION',
      question_type: 'TEXT',
      question_text:
        'Who lives in your household? (List all residents and their ages)',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'allergies',
      category: 'HOUSEHOLD_INFORMATION',
      question_type: 'BOOLEAN',
      question_text: 'Do any household members have pet allergies?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'household_agreement',
      category: 'HOUSEHOLD_INFORMATION',
      question_type: 'BOOLEAN',
      question_text:
        'Does everyone in your household agree to adopting this pet?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'fenced_yard',
      category: 'HOUSEHOLD_INFORMATION',
      question_type: 'TEXT',
      question_text:
        'Do you have a fenced yard? (If adopting a dog, specify fence height and type)',
      is_enabled: true,
      is_required: false,
      created_at: now,
      updated_at: now,
    },

    // Pet Ownership Experience
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'previous_pets',
      category: 'PET_OWNERSHIP_EXPERIENCE',
      question_type: 'TEXT',
      question_text: 'Have you owned pets before? (If yes, what types?)',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'current_pets',
      category: 'PET_OWNERSHIP_EXPERIENCE',
      question_type: 'TEXT',
      question_text:
        'Do you currently have any pets? (List species, breeds, ages, and if they are spayed/neutered)',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'surrendered_pets',
      category: 'PET_OWNERSHIP_EXPERIENCE',
      question_type: 'TEXT',
      question_text:
        'Have you ever surrendered or rehomed a pet? (If yes, why?)',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'primary_caregiver',
      category: 'PET_OWNERSHIP_EXPERIENCE',
      question_type: 'TEXT',
      question_text: 'Who will be the primary caregiver for the pet?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'training_experience',
      category: 'PET_OWNERSHIP_EXPERIENCE',
      question_type: 'SELECT',
      question_text: 'How much experience do you have with training pets?',
      options: ['Beginner', 'Intermediate', 'Advanced'],
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },

    // Lifestyle & Compatibility
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'adoption_reason',
      category: 'LIFESTYLE_COMPATIBILITY',
      question_type: 'TEXT',
      question_text: 'Why do you want to adopt a pet?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'desired_qualities',
      category: 'LIFESTYLE_COMPATIBILITY',
      question_type: 'TEXT',
      question_text:
        'What qualities are you looking for in a pet? (Energy level, size, temperament, etc.)',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'alone_hours',
      category: 'LIFESTYLE_COMPATIBILITY',
      question_type: 'NUMBER',
      question_text: 'How many hours per day will the pet be alone?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'daily_routine',
      category: 'LIFESTYLE_COMPATIBILITY',
      question_type: 'TEXT',
      question_text:
        'What is your daily routine like? (Work schedule, travel, exercise habits, etc.)',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'travel_frequency',
      category: 'LIFESTYLE_COMPATIBILITY',
      question_type: 'TEXT',
      question_text:
        "How often do you travel? (If frequently, who will care for the pet while you're away?)",
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'planned_activities',
      category: 'LIFESTYLE_COMPATIBILITY',
      question_type: 'TEXT',
      question_text:
        'What types of activities do you plan to do with your pet?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },

    // Pet Care & Commitment
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'financial_preparation',
      category: 'PET_CARE_COMMITMENT',
      question_type: 'BOOLEAN',
      question_text:
        'Are you financially prepared for pet care expenses? (Food, vet bills, training, etc.)',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'long_term_commitment',
      category: 'PET_CARE_COMMITMENT',
      question_type: 'BOOLEAN',
      question_text:
        'Do you understand the long-term commitment of pet ownership (10-20 years)?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'training_willingness',
      category: 'PET_CARE_COMMITMENT',
      question_type: 'BOOLEAN',
      question_text:
        'Are you willing to train and socialize your pet if needed?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'health_issues_plan',
      category: 'PET_CARE_COMMITMENT',
      question_type: 'TEXT',
      question_text: 'What will you do if the pet develops health issues?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'behavioral_issues_plan',
      category: 'PET_CARE_COMMITMENT',
      question_type: 'TEXT',
      question_text: 'What will you do if the pet has behavioral issues?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },

    // References & Verification
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'references',
      category: 'REFERENCES_VERIFICATION',
      question_type: 'TEXT',
      question_text:
        'Can you provide a personal or veterinary reference? (Name & contact info)',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'home_check',
      category: 'REFERENCES_VERIFICATION',
      question_type: 'BOOLEAN',
      question_text:
        'Are you willing to have a home visit or virtual home check?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'adoption_contract',
      category: 'REFERENCES_VERIFICATION',
      question_type: 'BOOLEAN',
      question_text:
        'Are you willing to sign an adoption contract agreeing to responsible pet ownership?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },

    // Final Acknowledgments
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'trial_period',
      category: 'FINAL_ACKNOWLEDGMENTS',
      question_type: 'BOOLEAN',
      question_text:
        'Do you understand that some rescues require a trial adoption period?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'return_agreement',
      category: 'FINAL_ACKNOWLEDGMENTS',
      question_type: 'BOOLEAN',
      question_text:
        'Do you agree to return the pet to the rescue if you can no longer care for it?',
      is_enabled: true,
      is_required: true,
      created_at: now,
      updated_at: now,
    },
    {
      config_id: `config_${Math.random().toString(36).slice(2, 12)}`,
      rescue_id,
      question_key: 'additional_info',
      category: 'FINAL_ACKNOWLEDGMENTS',
      question_type: 'TEXT',
      question_text: "Any additional information you'd like to share?",
      is_enabled: true,
      is_required: false,
      created_at: now,
      updated_at: now,
    },
  ]
}

export async function seed(queryInterface: QueryInterface) {
  const rescues = await queryInterface.sequelize.query<{ rescue_id: string }>(
    `SELECT rescue_id FROM rescues`,
    { type: QueryTypes.SELECT },
  )

  // Generate default questions for each rescue
  const allQuestions = rescues.flatMap((rescue: any) =>
    generateDefaultQuestions(rescue.rescue_id),
  )

  // Insert all questions
  await queryInterface.bulkInsert('application_question_configs', allQuestions)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('application_question_configs', {})
}
