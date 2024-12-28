import { FeatureFlag } from '../Models/FeatureFlag'
import { AuditLogger } from './auditLogService'

class FeatureFlagService {
  public async getAllFlags() {
    await AuditLogger.logAction(
      'FeatureFlagService',
      'Fetching all feature flags',
      'INFO',
    )
    try {
      return await FeatureFlag.findAll()
    } catch (error) {
      if (error instanceof Error) {
        await AuditLogger.logAction(
          'FeatureFlagService',
          `Error fetching feature flags - ${error.message}`,
          'ERROR',
        )
        throw new Error(`Failed to fetch feature flags: ${error.message}`)
      }
      await AuditLogger.logAction(
        'FeatureFlagService',
        'Error fetching feature flags - Unknown error',
        'ERROR',
      )
      throw new Error('An unknown error occurred while fetching feature flags')
    }
  }

  public async getFlagByName(name: string) {
    await AuditLogger.logAction(
      'FeatureFlagService',
      `Fetching feature flag by name: ${name}`,
      'INFO',
    )
    return await FeatureFlag.findOne({ where: { name } })
  }

  public async updateFlag(id: string, enabled: boolean) {
    await AuditLogger.logAction(
      'FeatureFlagService',
      `Updating feature flag with ID: ${id} to enabled: ${enabled}`,
      'INFO',
    )
    try {
      const flag = await FeatureFlag.findByPk(id)
      if (!flag) {
        await AuditLogger.logAction(
          'FeatureFlagService',
          `Feature flag with ID: ${id} not found for update`,
          'WARNING',
        )
        throw new Error('Feature flag not found')
      }
      flag.enabled = enabled
      await flag.save()
      await AuditLogger.logAction(
        'FeatureFlagService',
        `Feature flag with ID: ${id} successfully updated`,
        'INFO',
      )
      return flag
    } catch (error) {
      if (error instanceof Error) {
        await AuditLogger.logAction(
          'FeatureFlagService',
          `Error updating feature flag with ID: ${id} - ${error.message}`,
          'ERROR',
        )
        throw new Error(`Failed to update feature flag: ${error.message}`)
      }
      await AuditLogger.logAction(
        'FeatureFlagService',
        `Error updating feature flag with ID: ${id} - Unknown error`,
        'ERROR',
      )
      throw new Error(
        'An unknown error occurred while updating the feature flag',
      )
    }
  }

  public async createFlag(name: string, description: string) {
    await AuditLogger.logAction(
      'FeatureFlagService',
      `Creating feature flag with name: ${name} and description: ${description}`,
      'INFO',
    )
    try {
      const newFlag = await FeatureFlag.create({ name, description })
      await AuditLogger.logAction(
        'FeatureFlagService',
        `Feature flag '${name}' successfully created`,
        'INFO',
      )
      return newFlag
    } catch (error) {
      if (error instanceof Error) {
        await AuditLogger.logAction(
          'FeatureFlagService',
          `Error creating feature flag '${name}' - ${error.message}`,
          'ERROR',
        )
        throw new Error(`Failed to create feature flag: ${error.message}`)
      }
      await AuditLogger.logAction(
        'FeatureFlagService',
        `Error creating feature flag '${name}' - Unknown error`,
        'ERROR',
      )
      throw new Error(
        'An unknown error occurred while creating the feature flag',
      )
    }
  }

  public async deleteFlag(id: string) {
    await AuditLogger.logAction(
      'FeatureFlagService',
      `Deleting feature flag with ID: ${id}`,
      'INFO',
    )
    try {
      const flag = await FeatureFlag.findByPk(id)
      if (!flag) {
        await AuditLogger.logAction(
          'FeatureFlagService',
          `Feature flag with ID: ${id} not found for deletion`,
          'WARNING',
        )
        throw new Error('Feature flag not found')
      }
      await flag.destroy()
      await AuditLogger.logAction(
        'FeatureFlagService',
        `Feature flag with ID: ${id} successfully deleted`,
        'INFO',
      )
    } catch (error) {
      if (error instanceof Error) {
        await AuditLogger.logAction(
          'FeatureFlagService',
          `Error deleting feature flag with ID: ${id} - ${error.message}`,
          'ERROR',
        )
        throw new Error(`Failed to delete feature flag: ${error.message}`)
      }
      await AuditLogger.logAction(
        'FeatureFlagService',
        `Error deleting feature flag with ID: ${id} - Unknown error`,
        'ERROR',
      )
      throw new Error(
        'An unknown error occurred while deleting the feature flag',
      )
    }
  }
}

export default new FeatureFlagService()
