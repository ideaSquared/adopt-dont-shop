import { apiService } from '../libs/api-service'
import {
  BulkUpdateResult,
  RescueQuestionConfig,
} from '../types/applicationTypes'

type UpdateConfigRequest = {
  is_enabled?: boolean
  is_required?: boolean
}

type BulkUpdateRequest = Array<{
  question_key: string
  is_enabled: boolean
  is_required: boolean
}>

export const getRescueQuestionConfigs = async (rescueId: string) => {
  return await apiService.get<RescueQuestionConfig[]>(
    `/rescue-question-configs/rescue/${rescueId}`,
  )
}

export const updateRescueQuestionConfig = async (
  configId: string,
  data: UpdateConfigRequest,
) => {
  return await apiService.put<UpdateConfigRequest, RescueQuestionConfig>(
    `/rescue-question-configs/${configId}`,
    data,
  )
}

export const bulkUpdateRescueQuestionConfigs = async (
  rescueId: string,
  updates: BulkUpdateRequest,
) => {
  return await apiService.put<BulkUpdateRequest, BulkUpdateResult[]>(
    `/rescue-question-configs/rescue/${rescueId}/bulk`,
    updates,
  )
}

export default {
  getRescueQuestionConfigs,
  updateRescueQuestionConfig,
  bulkUpdateRescueQuestionConfigs,
}
