import { Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import {
  createFeatureFlagService,
  deleteFeatureFlagService,
  getAllFeatureFlagsService,
  updateFeatureFlagService,
} from '../services/featureFlagService'
import { AuthenticatedRequest } from '../types'

export const getAllFeatureFlags = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    AuditLogger.logAction(
      'FeatureFlagController',
      'Attempting to fetch all feature flags',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
    )

    const featureFlags = await getAllFeatureFlagsService()

    AuditLogger.logAction(
      'FeatureFlagController',
      `Successfully fetched ${featureFlags.length} feature flags`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
    )

    res.status(200).json(featureFlags)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'FeatureFlagController',
      `Failed to fetch feature flags: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Failed to fetch feature flags' })
  }
}

export const createFeatureFlag = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { name, description } = req.body

    AuditLogger.logAction(
      'FeatureFlagController',
      'Attempting to create new feature flag',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
    )

    const featureFlag = await createFeatureFlagService(name, description)

    AuditLogger.logAction(
      'FeatureFlagController',
      `Successfully created feature flag: ${featureFlag.name}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
    )

    res.status(201).json(featureFlag)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'FeatureFlagController',
      `Failed to create feature flag: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Failed to create feature flag' })
  }
}

export const updateFeatureFlag = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { flagId } = req.params

  try {
    AuditLogger.logAction(
      'FeatureFlagController',
      `Attempting to update feature flag: ${flagId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
    )

    const updatedFlag = await updateFeatureFlagService(flagId, req.body)

    if (updatedFlag) {
      AuditLogger.logAction(
        'FeatureFlagController',
        `Successfully updated feature flag: ${flagId}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
      )
      res.status(200).json(updatedFlag)
    } else {
      AuditLogger.logAction(
        'FeatureFlagController',
        `Feature flag not found: ${flagId}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
      )
      res.status(404).json({ error: 'Feature flag not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'FeatureFlagController',
      `Failed to update feature flag ${flagId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Failed to update feature flag' })
  }
}

export const deleteFeatureFlag = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const { flagId } = req.params

  try {
    AuditLogger.logAction(
      'FeatureFlagController',
      `Attempting to delete feature flag: ${flagId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
    )

    const deleted = await deleteFeatureFlagService(flagId)

    if (deleted) {
      AuditLogger.logAction(
        'FeatureFlagController',
        `Successfully deleted feature flag: ${flagId}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
      )
      res.status(204).send()
    } else {
      AuditLogger.logAction(
        'FeatureFlagController',
        `Feature flag not found for deletion: ${flagId}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
      )
      res.status(404).json({ error: 'Feature flag not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'FeatureFlagController',
      `Failed to delete feature flag ${flagId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'FEATURE_FLAG_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Failed to delete feature flag' })
  }
}
