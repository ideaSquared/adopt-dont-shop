import { apiService } from '../libs/api-service'
import {
  CoreApplicationQuestion,
  QuestionCategory,
  QuestionType,
  QuestionUsageStats,
} from '../types/applicationTypes'

type CreateCoreQuestionRequest = {
  category: QuestionCategory
  question_type: QuestionType
  question_text: string
  options?: string[]
}

type UpdateCoreQuestionRequest = Partial<CreateCoreQuestionRequest>

export const getAllCoreQuestions = async () => {
  return await apiService.get<CoreApplicationQuestion[]>('/core-questions')
}

export const getCoreQuestionByKey = async (questionKey: string) => {
  return await apiService.get<CoreApplicationQuestion>(
    `/core-questions/${questionKey}`,
  )
}

export const createCoreQuestion = async (data: CreateCoreQuestionRequest) => {
  return await apiService.post<
    CreateCoreQuestionRequest,
    CoreApplicationQuestion
  >('/core-questions', data)
}

export const updateCoreQuestion = async (
  questionKey: string,
  data: UpdateCoreQuestionRequest,
) => {
  return await apiService.put<
    UpdateCoreQuestionRequest,
    CoreApplicationQuestion
  >(`/core-questions/${questionKey}`, data)
}

export const deleteCoreQuestion = async (questionKey: string) => {
  return await apiService.delete<{ message: string }>(
    `/core-questions/${questionKey}`,
  )
}

export const getCoreQuestionUsage = async (questionKey: string) => {
  return await apiService.get<QuestionUsageStats>(
    `/core-questions/${questionKey}/usage`,
  )
}

export default {
  getAllCoreQuestions,
  getCoreQuestionByKey,
  createCoreQuestion,
  updateCoreQuestion,
  deleteCoreQuestion,
  getCoreQuestionUsage,
}
