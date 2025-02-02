import { QuestionCategory, QuestionType } from '../../types/applicationTypes'

export type CoreApplicationQuestion = {
  question_key: string
  category: QuestionCategory
  question_type: QuestionType
  question_text: string
  options?: string[]
  created_at: string
  updated_at: string
}

export type RescueQuestionConfig = {
  config_id: string
  rescue_id: string
  question_key: string
  is_enabled: boolean
  is_required: boolean
  created_at: string
  updated_at: string
  rescueCoreQuestion: CoreApplicationQuestion
}

export type Application = {
  pet_name: any
  application_id: string
  rescue_id: string
  pet_id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  answers: Record<string, any>
  created_at: string
  updated_at: string
}
