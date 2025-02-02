export type QuestionCategory =
  | 'PERSONAL_INFORMATION'
  | 'HOUSEHOLD_INFORMATION'
  | 'PET_OWNERSHIP_EXPERIENCE'
  | 'LIFESTYLE_COMPATIBILITY'
  | 'PET_CARE_COMMITMENT'
  | 'REFERENCES_VERIFICATION'
  | 'FINAL_ACKNOWLEDGMENTS'

export type QuestionType =
  | 'TEXT'
  | 'EMAIL'
  | 'PHONE'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'ADDRESS'

export type ApplicationQuestionConfig = {
  config_id: string
  rescue_id: string
  question_key: string
  category: QuestionCategory
  question_type: QuestionType
  question_text: string
  is_enabled: boolean
  is_required: boolean
  options?: string[]
}

export interface ApplicationAnswers {
  home_type: string
  own_or_rent: string
  landlord_permission?: boolean
  yard_size: string
  household_members: number
  children_ages?: string
  current_pets: boolean
  current_pet_details?: string
  pet_experience: string[]
  veterinarian: boolean
  vet_name?: string
  exercise_plan: string
  daily_schedule: string
  time_alone: number
  emergency_contact: string
}

export interface Application {
  application_id: string
  user_id: string
  pet_id: string
  rescue_id: string
  status: 'pending' | 'approved' | 'rejected'
  actioned_by: string | null
  answers: ApplicationAnswers
  applicant_first_name?: string
  pet_name?: string
  actioned_by_first_name?: string
  created_at?: Date
  updated_at?: Date
}
