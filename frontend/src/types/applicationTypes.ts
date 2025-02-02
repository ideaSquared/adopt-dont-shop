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

export type QuestionConfig = {
  config_id: string
  rescue_id: string
  question_key: string
  category: QuestionCategory
  question_type: QuestionType
  question_text: string
  is_enabled: boolean
  is_required: boolean
  options?: string[]
  created_at?: Date
  updated_at?: Date
} 