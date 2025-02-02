import { apiService } from '../api-service'
import { CoreApplicationQuestion } from './Application'

const API_BASE_URL = '/application-question-configs'

export const getQuestionConfigsByRescueId = async (
  rescueId: string,
): Promise<CoreApplicationQuestion[]> => {
  return apiService.get<CoreApplicationQuestion[]>(
    `${API_BASE_URL}/rescue/${rescueId}`,
  )
}

export const updateQuestionConfig = async (
  configId: string,
  data: Partial<CoreApplicationQuestion>,
): Promise<CoreApplicationQuestion> => {
  return apiService.put<
    Partial<CoreApplicationQuestion>,
    CoreApplicationQuestion
  >(`${API_BASE_URL}/${configId}`, data)
}

export const bulkUpdateQuestionConfigs = async (
  rescueId: string,
  updates: Array<{
    question_key: string
    is_enabled: boolean
    is_required: boolean
  }>,
): Promise<Array<{ question_key: string; success: boolean }>> => {
  return apiService.put<
    Array<{
      question_key: string
      is_enabled: boolean
      is_required: boolean
    }>,
    Array<{ question_key: string; success: boolean }>
  >(`${API_BASE_URL}/rescue/${rescueId}/bulk`, updates)
}

export const validateApplicationAnswers = async (
  rescueId: string,
  answers: Record<string, any>,
): Promise<{
  isValid: boolean
  missingRequiredAnswers: Array<{
    question_key: string
    question_text: string
  }>
}> => {
  return apiService.post<
    { answers: Record<string, any> },
    {
      isValid: boolean
      missingRequiredAnswers: Array<{
        question_key: string
        question_text: string
      }>
    }
  >(`${API_BASE_URL}/rescue/${rescueId}/validate`, { answers })
}

export default {
  getQuestionConfigsByRescueId,
  updateQuestionConfig,
  bulkUpdateQuestionConfigs,
  validateApplicationAnswers,
}
