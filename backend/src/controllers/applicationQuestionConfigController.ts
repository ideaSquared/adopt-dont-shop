import { Response } from 'express'
import * as ApplicationQuestionConfigService from '../services/applicationQuestionConfigService'
import { AuditLogger } from '../services/auditLogService'
import { AuthenticatedRequest } from '../types'

export const getQuestionConfigsByRescueId = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { rescueId } = req.params

  try {
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Attempting to fetch question configs for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const configs =
      await ApplicationQuestionConfigService.getQuestionConfigsByRescueId(
        rescueId,
      )

    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Successfully fetched ${configs.length} question configs for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    res.status(200).json(configs)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Failed to fetch question configs for rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error fetching question configs', error })
  }
}

export const updateQuestionConfig = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { configId } = req.params
  const updateData = req.body

  try {
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Attempting to update question config: ${configId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const updatedConfig =
      await ApplicationQuestionConfigService.updateQuestionConfig(
        configId,
        updateData,
      )

    if (updatedConfig) {
      AuditLogger.logAction(
        'ApplicationQuestionConfigController',
        `Successfully updated question config: ${configId}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(200).json(updatedConfig)
    } else {
      AuditLogger.logAction(
        'ApplicationQuestionConfigController',
        `Question config not found: ${configId}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Question config not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Failed to update question config ${configId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error updating question config', error })
  }
}

export const bulkUpdateQuestionConfigs = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { rescueId } = req.params
  const updates = req.body

  if (!Array.isArray(updates)) {
    res.status(400).json({ message: 'Updates must be an array' })
    return
  }

  try {
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Attempting to bulk update ${updates.length} question configs for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const results =
      await ApplicationQuestionConfigService.bulkUpdateQuestionConfigs(
        rescueId,
        updates,
      )

    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Successfully processed bulk update for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    res.status(200).json(results)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Failed to bulk update question configs for rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error processing bulk update', error })
  }
}

export const validateApplicationAnswers = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { rescueId } = req.params
  const { answers } = req.body

  try {
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Attempting to validate application answers for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const validationResult =
      await ApplicationQuestionConfigService.validateApplicationAnswers(
        rescueId,
        answers,
      )

    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Successfully validated application answers for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    res.status(200).json(validationResult)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Failed to validate application answers for rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res
      .status(500)
      .json({ message: 'Error validating application answers', error })
  }
}

export const createQuestionConfig = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const configData = req.body

  try {
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      'Attempting to create new question config',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const newConfig =
      await ApplicationQuestionConfigService.createQuestionConfig(configData)

    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Successfully created question config with ID: ${newConfig.config_id}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    res.status(201).json(newConfig)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Failed to create question config: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error creating question config', error })
  }
}

export const getAllQuestionConfigs = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      'Attempting to fetch all question configs',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const configs =
      await ApplicationQuestionConfigService.getAllQuestionConfigs()

    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Successfully fetched ${configs.length} question configs`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    res.status(200).json(configs)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Failed to fetch all question configs: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error fetching question configs', error })
  }
}

export const getQuestionConfigById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { configId } = req.params

  try {
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Attempting to fetch question config: ${configId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const config = await ApplicationQuestionConfigService.getQuestionConfigById(
      configId,
    )

    if (config) {
      AuditLogger.logAction(
        'ApplicationQuestionConfigController',
        `Successfully fetched question config: ${configId}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(200).json(config)
    } else {
      AuditLogger.logAction(
        'ApplicationQuestionConfigController',
        `Question config not found: ${configId}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Question config not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Failed to fetch question config ${configId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error fetching question config', error })
  }
}

export const deleteQuestionConfig = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { configId } = req.params

  try {
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Attempting to delete question config: ${configId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const deleted = await ApplicationQuestionConfigService.deleteQuestionConfig(
      configId,
    )

    if (deleted) {
      AuditLogger.logAction(
        'ApplicationQuestionConfigController',
        `Successfully deleted question config: ${configId}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(200).json({ message: 'Question config deleted successfully' })
    } else {
      AuditLogger.logAction(
        'ApplicationQuestionConfigController',
        `Question config not found: ${configId}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Question config not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'ApplicationQuestionConfigController',
      `Failed to delete question config ${configId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error deleting question config', error })
  }
}
