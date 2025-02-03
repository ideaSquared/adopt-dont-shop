import CoreApplicationQuestion, {
  QuestionCategory,
  QuestionType,
} from '../Models/ApplicationCoreQuestions'
import RescueQuestionConfig from '../Models/ApplicationRescueQuestionConfig'

type CreateCoreQuestionRequest = {
  question_key?: string
  category: QuestionCategory
  question_type: QuestionType
  question_text: string
  options?: string[]
  is_enabled: boolean
  is_required: boolean
}

type UpdateCoreQuestionRequest = Partial<CreateCoreQuestionRequest>

export const getAllCoreQuestions = async () => {
  return CoreApplicationQuestion.findAll({
    order: [
      ['category', 'ASC'],
      ['question_key', 'ASC'],
    ],
  })
}

export const getCoreQuestionByKey = async (questionKey: string) => {
  return CoreApplicationQuestion.findByPk(questionKey)
}

export const createCoreQuestion = async (
  requestData: Omit<CreateCoreQuestionRequest, 'is_enabled' | 'is_required'> &
    Partial<Pick<CreateCoreQuestionRequest, 'is_enabled' | 'is_required'>>,
) => {
  const data: CreateCoreQuestionRequest = {
    ...requestData,
    is_enabled: requestData.is_enabled ?? true,
    is_required: requestData.is_required ?? false,
  }
  return CoreApplicationQuestion.create(data)
}

export const updateCoreQuestion = async (
  questionKey: string,
  data: UpdateCoreQuestionRequest,
) => {
  const question = await CoreApplicationQuestion.findByPk(questionKey)
  if (!question) {
    return null
  }
  return question.update(data)
}

export const deleteCoreQuestion = async (questionKey: string) => {
  // First check if any rescue configs are using this question
  const usageCount = await RescueQuestionConfig.count({
    where: { question_key: questionKey },
  })

  if (usageCount > 0) {
    throw new Error('Cannot delete question that is in use by rescues')
  }

  const question = await CoreApplicationQuestion.findByPk(questionKey)
  if (!question) {
    return false
  }

  await question.destroy()
  return true
}

export const getCoreQuestionUsage = async (questionKey: string) => {
  const rescueConfigs = await RescueQuestionConfig.findAll({
    where: { question_key: questionKey },
    attributes: ['rescue_id', 'is_enabled', 'is_required'],
  })

  return {
    total_rescues: rescueConfigs.length,
    enabled_count: rescueConfigs.filter((config) => config.is_enabled).length,
    required_count: rescueConfigs.filter((config) => config.is_required).length,
  }
}

export default {
  getAllCoreQuestions,
  getCoreQuestionByKey,
  createCoreQuestion,
  updateCoreQuestion,
  deleteCoreQuestion,
  getCoreQuestionUsage,
}
