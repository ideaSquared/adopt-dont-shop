import { Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import * as RescueQuestionConfigService from '../services/applicationRescueQuestionConfigService'
import { AuthenticatedRequest } from '../types'

export const getRescueQuestionConfigs = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { rescueId } = req.params

  try {
    AuditLogger.logAction(
      'RescueQuestionConfigController',
      `Attempting to fetch question configs for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const configs = await RescueQuestionConfigService.getRescueQuestionConfigs(
      rescueId,
    )

    AuditLogger.logAction(
      'RescueQuestionConfigController',
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
      'RescueQuestionConfigController',
      `Failed to fetch question configs for rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error fetching question configs', error })
  }
}

export const updateRescueQuestionConfig = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { rescueId, questionKey } = req.params
  const updateData = req.body

  try {
    AuditLogger.logAction(
      'RescueQuestionConfigController',
      `Attempting to update question config for rescue ${rescueId}, question ${questionKey}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const updatedConfig =
      await RescueQuestionConfigService.updateRescueQuestionConfig(
        rescueId,
        questionKey,
        updateData,
      )

    if (updatedConfig) {
      AuditLogger.logAction(
        'RescueQuestionConfigController',
        `Successfully updated question config for rescue ${rescueId}, question ${questionKey}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(200).json(updatedConfig)
    } else {
      AuditLogger.logAction(
        'RescueQuestionConfigController',
        `Question config not found for rescue ${rescueId}, question ${questionKey}`,
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
      'RescueQuestionConfigController',
      `Failed to update question config for rescue ${rescueId}, question ${questionKey}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error updating question config', error })
  }
}

export const bulkUpdateRescueQuestionConfigs = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { rescueId } = req.params
  const updates = req.body

  try {
    AuditLogger.logAction(
      'RescueQuestionConfigController',
      `Attempting to bulk update question configs for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const results =
      await RescueQuestionConfigService.bulkUpdateRescueQuestionConfigs(
        rescueId,
        updates,
      )

    const successCount = results.filter((r) => r.success).length

    AuditLogger.logAction(
      'RescueQuestionConfigController',
      `Successfully updated ${successCount}/${results.length} question configs for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    res.status(200).json(results)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RescueQuestionConfigController',
      `Failed to bulk update question configs for rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res
      .status(500)
      .json({ message: 'Error bulk updating question configs', error })
  }
}
