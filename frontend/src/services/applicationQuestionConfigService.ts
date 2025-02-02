import { apiService } from '../libs/api-service'
import { QuestionConfig } from '../types/applicationTypes'

export const getQuestionConfigsByRescueId = async (rescueId: string) => {
  return await apiService.get<QuestionConfig[]>(
    `/application-question-configs/rescue/${rescueId}`,
  )
}

export const updateQuestionConfig = async (
  configId: string,
  data: Partial<QuestionConfig>,
) => {
  return await apiService.put<Partial<QuestionConfig>, QuestionConfig>(
    `/application-question-configs/${configId}`,
    data,
  )
}

type BulkUpdateData = {
  question_key: string
  is_enabled: boolean
  is_required: boolean
}

type BulkUpdateResponse = {
  success: boolean
}

export const bulkUpdateQuestionConfigs = async (
  rescueId: string,
  updates: Array<{
    question_key: string
    is_enabled: boolean
    is_required: boolean
  }>,
) => {
  return await apiService.put<
    Array<{
      question_key: string
      is_enabled: boolean
      is_required: boolean
    }>,
    Array<{
      question_key: string
      success: boolean
    }>
  >(`/application-question-configs/rescue/${rescueId}/bulk`, updates)
}

type ValidateAnswersRequest = {
  answers: Record<string, unknown>
}

type ValidateAnswersResponse = {
  isValid: boolean
  missingRequiredAnswers: {
    question_key: string
    question_text: string
  }[]
}

export const validateApplicationAnswers = async (
  rescueId: string,
  answers: Record<string, unknown>,
) => {
  return await apiService.post<
    Record<string, unknown>,
    Record<string, string | null>
  >(`/application-question-configs/rescue/${rescueId}/validate`, answers)
}

// Admin-specific operations
export const getAllQuestionConfigs = async () => {
  return await apiService.get<QuestionConfig[]>(
    '/application-question-configs/admin/all',
  )
}

export const getQuestionConfigById = async (configId: string) => {
  return await apiService.get<QuestionConfig>(
    `/application-question-configs/admin/${configId}`,
  )
}

type CreateQuestionConfigRequest = Omit<QuestionConfig, 'config_id'>

export const createQuestionConfig = async (
  data: CreateQuestionConfigRequest,
) => {
  return await apiService.post<CreateQuestionConfigRequest, QuestionConfig>(
    '/application-question-configs/admin/create',
    data,
  )
}

type DeleteQuestionConfigResponse = {
  message: string
}

export const deleteQuestionConfig = async (configId: string) => {
  return await apiService.delete<DeleteQuestionConfigResponse>(
    `/application-question-configs/admin/${configId}`,
  )
}
