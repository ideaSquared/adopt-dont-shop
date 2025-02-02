import ApplicationQuestionConfig from '../Models/ApplicationQuestionConfig'

export const getQuestionConfigsByRescueId = async (rescueId: string) => {
  return ApplicationQuestionConfig.findAll({
    where: { rescue_id: rescueId },
    order: [
      ['category', 'ASC'],
      ['question_key', 'ASC'],
    ],
  })
}

export const updateQuestionConfig = async (
  configId: string,
  data: Partial<ApplicationQuestionConfig>,
) => {
  const config = await ApplicationQuestionConfig.findByPk(configId)
  if (config) {
    return config.update(data)
  }
  return null
}

export const bulkUpdateQuestionConfigs = async (
  rescueId: string,
  updates: Array<{
    question_key: string
    is_enabled: boolean
    is_required: boolean
  }>,
) => {
  const results = []
  for (const update of updates) {
    const [numUpdated] = await ApplicationQuestionConfig.update(
      {
        is_enabled: update.is_enabled,
        is_required: update.is_required,
      },
      {
        where: {
          rescue_id: rescueId,
          question_key: update.question_key,
        },
      },
    )
    results.push({
      question_key: update.question_key,
      success: numUpdated > 0,
    })
  }
  return results
}

export const validateApplicationAnswers = async (
  rescueId: string,
  answers: Record<string, any>,
) => {
  const configs = await ApplicationQuestionConfig.findAll({
    where: {
      rescue_id: rescueId,
      is_enabled: true,
      is_required: true,
    },
  })

  const missingRequiredAnswers = configs
    .filter((config) => !answers[config.question_key])
    .map((config) => ({
      question_key: config.question_key,
      question_text: config.question_text,
    }))

  return {
    isValid: missingRequiredAnswers.length === 0,
    missingRequiredAnswers,
  }
}

export default {
  getQuestionConfigsByRescueId,
  updateQuestionConfig,
  bulkUpdateQuestionConfigs,
  validateApplicationAnswers,
}
