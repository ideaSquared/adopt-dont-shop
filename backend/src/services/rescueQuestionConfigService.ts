import CoreApplicationQuestion from '../Models/CoreApplicationQuestion'
import RescueQuestionConfig from '../Models/RescueQuestionConfig'

type UpdateConfigRequest = {
  is_enabled?: boolean
  is_required?: boolean
}

type BulkUpdateRequest = {
  question_key: string
  is_enabled: boolean
  is_required: boolean
}

type RescueQuestionConfigWithCore = RescueQuestionConfig & {
  coreQuestion: CoreApplicationQuestion
}

export const getRescueQuestionConfigs = async (rescueId: string) => {
  // Get all core questions
  const coreQuestions = await CoreApplicationQuestion.findAll({
    order: [
      ['category', 'ASC'],
      ['question_key', 'ASC'],
    ],
  })

  // Get rescue's configurations
  const rescueConfigs = await RescueQuestionConfig.findAll({
    where: { rescue_id: rescueId },
    include: [
      {
        model: CoreApplicationQuestion,
        as: 'rescueCoreQuestion',
      },
    ],
  })

  // For any core questions that don't have a rescue config,
  // create default configs (enabled: true, required: false)
  const missingConfigs = coreQuestions.filter(
    (coreQ) =>
      !rescueConfigs.find(
        (config) => config.question_key === coreQ.question_key,
      ),
  )

  if (missingConfigs.length > 0) {
    const newConfigs = await RescueQuestionConfig.bulkCreate(
      missingConfigs.map((coreQ) => ({
        rescue_id: rescueId,
        question_key: coreQ.question_key,
        is_enabled: true,
        is_required: false,
      })),
    )

    // Fetch the newly created configs with their core questions
    const newConfigsWithCore = await RescueQuestionConfig.findAll({
      where: {
        config_id: newConfigs.map((config) => config.config_id),
      },
      include: [
        {
          model: CoreApplicationQuestion,
          as: 'rescueCoreQuestion',
        },
      ],
    })

    return [...rescueConfigs, ...newConfigsWithCore]
  }

  return rescueConfigs
}

export const updateRescueQuestionConfig = async (
  rescueId: string,
  questionKey: string,
  data: {
    is_enabled?: boolean
    is_required?: boolean
  },
) => {
  const config = await RescueQuestionConfig.findOne({
    where: { rescue_id: rescueId, question_key: questionKey },
    include: [
      {
        model: CoreApplicationQuestion,
        as: 'rescueCoreQuestion',
      },
    ],
  })

  if (!config) {
    return null
  }

  await config.update(data)
  return config
}

export const bulkUpdateRescueQuestionConfigs = async (
  rescueId: string,
  updates: BulkUpdateRequest[],
) => {
  const results = await Promise.all(
    updates.map(async (update) => {
      const config = await RescueQuestionConfig.findOne({
        where: { rescue_id: rescueId, question_key: update.question_key },
        include: [
          {
            model: CoreApplicationQuestion,
            as: 'rescueCoreQuestion',
          },
        ],
      })

      if (!config) {
        return {
          question_key: update.question_key,
          success: false,
          error: 'Configuration not found',
        }
      }

      try {
        await config.update(update)
        return {
          question_key: update.question_key,
          success: true,
        }
      } catch (error: any) {
        return {
          question_key: update.question_key,
          success: false,
          error: error?.message || 'Unknown error occurred',
        }
      }
    }),
  )

  return results
}

export default {
  getRescueQuestionConfigs,
  updateRescueQuestionConfig,
  bulkUpdateRescueQuestionConfigs,
}
