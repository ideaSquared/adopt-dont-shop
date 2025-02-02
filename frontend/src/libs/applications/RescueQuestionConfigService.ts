import { apiService } from '../api-service'
import { RescueQuestionConfig } from './Application'

const API_BASE_URL = '/rescue-question-configs'

export const getRescueQuestionConfigs = async (
  rescueId: string,
): Promise<RescueQuestionConfig[]> => {
  return apiService.get<RescueQuestionConfig[]>(
    `${API_BASE_URL}/rescue/${rescueId}`,
  )
}

export const updateRescueQuestionConfig = async (
  configId: string,
  data: Partial<RescueQuestionConfig>,
): Promise<RescueQuestionConfig> => {
  return apiService.put<Partial<RescueQuestionConfig>, RescueQuestionConfig>(
    `${API_BASE_URL}/${configId}`,
    data,
  )
}

export const bulkUpdateRescueQuestionConfigs = async (
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

export default {
  getRescueQuestionConfigs,
  updateRescueQuestionConfig,
  bulkUpdateRescueQuestionConfigs,
}
