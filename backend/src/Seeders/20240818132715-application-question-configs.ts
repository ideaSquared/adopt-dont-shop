import { QueryInterface, QueryTypes } from 'sequelize'
import {
  QuestionCategory,
  QuestionType,
} from '../Models/ApplicationQuestionConfig'

interface ApplicationQuestionConfig {
  config_id: string
  rescue_id: string
  question_key: string
  question_text: string
  question_type: QuestionType
  category: QuestionCategory
  options: string[] | null
  is_required: boolean
  is_enabled: boolean
  created_at: Date
  updated_at: Date
}

const questionConfigs = [
  {
    question_key: 'home_type',
    question_text: 'What type of home do you live in?',
    question_type: 'SELECT' as QuestionType,
    category: 'HOUSEHOLD_INFORMATION' as QuestionCategory,
    options: ['House', 'Apartment', 'Condo', 'Other'],
    is_required: true,
  },
  {
    question_key: 'own_or_rent',
    question_text: 'Do you own or rent your home?',
    question_type: 'SELECT' as QuestionType,
    category: 'HOUSEHOLD_INFORMATION' as QuestionCategory,
    options: ['Own', 'Rent'],
    is_required: true,
  },
  {
    question_key: 'landlord_permission',
    question_text: 'If renting, do you have permission to have pets?',
    question_type: 'BOOLEAN' as QuestionType,
    category: 'HOUSEHOLD_INFORMATION' as QuestionCategory,
    options: null,
    is_required: false,
  },
  {
    question_key: 'yard_size',
    question_text: 'What is the size of your yard?',
    question_type: 'SELECT' as QuestionType,
    category: 'HOUSEHOLD_INFORMATION' as QuestionCategory,
    options: ['No yard', 'Small', 'Medium', 'Large'],
    is_required: true,
  },
  {
    question_key: 'household_members',
    question_text: 'How many people live in your household?',
    question_type: 'NUMBER' as QuestionType,
    category: 'HOUSEHOLD_INFORMATION' as QuestionCategory,
    options: null,
    is_required: true,
  },
  {
    question_key: 'children_ages',
    question_text: 'If you have children, what are their ages?',
    question_type: 'TEXT' as QuestionType,
    category: 'HOUSEHOLD_INFORMATION' as QuestionCategory,
    options: null,
    is_required: false,
  },
  {
    question_key: 'current_pets',
    question_text: 'Do you have any current pets?',
    question_type: 'BOOLEAN' as QuestionType,
    category: 'PET_OWNERSHIP_EXPERIENCE' as QuestionCategory,
    options: null,
    is_required: true,
  },
  {
    question_key: 'current_pet_details',
    question_text: 'If yes, please describe your current pets',
    question_type: 'TEXT' as QuestionType,
    category: 'PET_OWNERSHIP_EXPERIENCE' as QuestionCategory,
    options: null,
    is_required: false,
  },
  {
    question_key: 'pet_experience',
    question_text: 'What is your experience with pets?',
    question_type: 'MULTI_SELECT' as QuestionType,
    category: 'PET_OWNERSHIP_EXPERIENCE' as QuestionCategory,
    options: [
      'First-time pet owner',
      'Previous pet owner',
      'Current pet owner',
      'Professional experience',
    ],
    is_required: true,
  },
  {
    question_key: 'veterinarian',
    question_text: 'Do you have a veterinarian?',
    question_type: 'BOOLEAN' as QuestionType,
    category: 'PET_CARE_COMMITMENT' as QuestionCategory,
    options: null,
    is_required: true,
  },
  {
    question_key: 'vet_name',
    question_text:
      "If yes, please provide your veterinarian's name and contact information",
    question_type: 'TEXT' as QuestionType,
    category: 'PET_CARE_COMMITMENT' as QuestionCategory,
    options: null,
    is_required: false,
  },
  {
    question_key: 'exercise_plan',
    question_text: 'How do you plan to exercise the pet?',
    question_type: 'TEXT' as QuestionType,
    category: 'PET_CARE_COMMITMENT' as QuestionCategory,
    options: null,
    is_required: true,
  },
  {
    question_key: 'daily_schedule',
    question_text: 'Describe your typical daily schedule',
    question_type: 'TEXT' as QuestionType,
    category: 'LIFESTYLE_COMPATIBILITY' as QuestionCategory,
    options: null,
    is_required: true,
  },
  {
    question_key: 'time_alone',
    question_text: 'How many hours will the pet be alone during the day?',
    question_type: 'NUMBER' as QuestionType,
    category: 'LIFESTYLE_COMPATIBILITY' as QuestionCategory,
    options: null,
    is_required: true,
  },
  {
    question_key: 'emergency_contact',
    question_text: 'Emergency contact name and phone number',
    question_type: 'TEXT' as QuestionType,
    category: 'REFERENCES_VERIFICATION' as QuestionCategory,
    options: null,
    is_required: true,
  },
]

export async function seed(queryInterface: QueryInterface) {
  const rescues = await queryInterface.sequelize.query<{ rescue_id: string }>(
    `SELECT rescue_id FROM rescues LIMIT 1`,
    { type: QueryTypes.SELECT },
  )

  if (rescues.length === 0) {
    throw new Error('No rescues found in the database')
  }

  const rescueId = rescues[0].rescue_id

  const configs: ApplicationQuestionConfig[] = questionConfigs.map(
    (config) => ({
      config_id: 'config_' + Math.random().toString(36).slice(2, 12),
      rescue_id: rescueId,
      question_key: config.question_key,
      question_text: config.question_text,
      question_type: config.question_type,
      category: config.category,
      options: config.options,
      is_required: config.is_required,
      is_enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
    }),
  )

  await queryInterface.bulkInsert('application_question_configs', configs)
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete('application_question_configs', {})
}
