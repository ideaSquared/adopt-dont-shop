import { Op } from 'sequelize';
import { FeatureFlag } from '../models/FeatureFlag';
import { logger } from '../utils/logger';
import { AuditLogService } from './auditLog.service';

export interface FeatureFlagData {
  name: string;
  description?: string;
  enabled: boolean;
}

export interface FeatureFlagFilters {
  enabled?: boolean;
  search?: string;
}

class FeatureFlagService {
  // Get all feature flags
  async getAllFlags(filters: FeatureFlagFilters = {}): Promise<FeatureFlag[]> {
    const whereClause: any = {};

    if (filters.enabled !== undefined) {
      whereClause.enabled = filters.enabled;
    }

    if (filters.search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    return FeatureFlag.findAll({
      where: whereClause,
      order: [['name', 'ASC']],
    });
  }

  // Get specific feature flag
  async getFlag(flagName: string): Promise<FeatureFlag | null> {
    return FeatureFlag.findOne({
      where: { name: flagName },
    });
  }

  // Check if feature is enabled
  async isFeatureEnabled(flagName: string): Promise<boolean> {
    try {
      const flag = await this.getFlag(flagName);
      return flag ? flag.enabled : false;
    } catch (error) {
      logger.error(`Error checking feature flag ${flagName}:`, error);
      return false; // Default to disabled on error
    }
  }

  // Create or update feature flag
  async setFlag(
    flagName: string,
    flagData: FeatureFlagData,
    updatedBy: string
  ): Promise<FeatureFlag> {
    try {
      const [flag, created] = await FeatureFlag.upsert({
        flag_id: `flag_${flagName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: flagName,
        description: flagData.description || 'No description provided',
        enabled: flagData.enabled,
      });

      await AuditLogService.log({
        userId: updatedBy,
        action: created ? 'FEATURE_FLAG_CREATED' : 'FEATURE_FLAG_UPDATED',
        entity: 'FeatureFlag',
        entityId: flag.flag_id,
        details: {
          name: flagName,
          enabled: flagData.enabled,
          description: flagData.description || 'No description provided',
          action: created ? 'create' : 'update',
        },
      });

      logger.info(
        `Feature flag ${created ? 'created' : 'updated'}: ${flagName} = ${flagData.enabled}`
      );
      return flag;
    } catch (error) {
      logger.error(`Error setting feature flag ${flagName}:`, error);
      throw error;
    }
  }

  // Enable feature flag
  async enableFlag(flagName: string, enabledBy: string): Promise<FeatureFlag> {
    const flag = await this.getFlag(flagName);
    if (!flag) {
      throw new Error(`Feature flag '${flagName}' not found`);
    }

    if (flag.enabled) {
      return flag; // Already enabled
    }

    flag.enabled = true;
    await flag.save();

    await AuditLogService.log({
      userId: enabledBy,
      action: 'FEATURE_FLAG_ENABLED',
      entity: 'FeatureFlag',
      entityId: flag.flag_id,
      details: { flagName },
    });

    logger.info(`Feature flag enabled: ${flagName} by ${enabledBy}`);
    return flag;
  }

  // Disable feature flag
  async disableFlag(flagName: string, disabledBy: string): Promise<FeatureFlag> {
    const flag = await this.getFlag(flagName);
    if (!flag) {
      throw new Error(`Feature flag '${flagName}' not found`);
    }

    if (!flag.enabled) {
      return flag; // Already disabled
    }

    flag.enabled = false;
    await flag.save();

    await AuditLogService.log({
      userId: disabledBy,
      action: 'FEATURE_FLAG_DISABLED',
      entity: 'FeatureFlag',
      entityId: flag.flag_id,
      details: { flagName },
    });

    logger.info(`Feature flag disabled: ${flagName} by ${disabledBy}`);
    return flag;
  }

  // Toggle feature flag
  async toggleFlag(flagName: string, toggledBy: string): Promise<FeatureFlag> {
    const flag = await this.getFlag(flagName);
    if (!flag) {
      throw new Error(`Feature flag '${flagName}' not found`);
    }

    const newState = !flag.enabled;
    flag.enabled = newState;
    await flag.save();

    await AuditLogService.log({
      userId: toggledBy,
      action: 'FEATURE_FLAG_TOGGLED',
      entity: 'FeatureFlag',
      entityId: flag.flag_id,
      details: { previousStatus: flag.enabled, newStatus: newState },
    });

    logger.info(`Feature flag toggled: ${flagName} = ${newState} by ${toggledBy}`);
    return flag;
  }

  // Delete feature flag
  async deleteFlag(flagName: string, deletedBy: string): Promise<void> {
    const flag = await this.getFlag(flagName);
    if (!flag) {
      throw new Error(`Feature flag '${flagName}' not found`);
    }

    await flag.destroy();

    await AuditLogService.log({
      userId: deletedBy,
      action: 'FEATURE_FLAG_DELETED',
      entity: 'FeatureFlag',
      entityId: flag.flag_id,
      details: { name: flagName },
    });

    logger.info(`Feature flag deleted: ${flagName} by ${deletedBy}`);
  }

  // Get public feature flags (non-sensitive flags that can be exposed to clients)
  async getPublicFlags(): Promise<Record<string, boolean>> {
    const publicFlagPrefixes = ['ui_', 'feature_', 'enable_', 'show_', 'allow_'];

    const flags = await FeatureFlag.findAll({
      where: {
        enabled: true,
      },
    });

    const publicFlags: Record<string, boolean> = {};

    flags.forEach(flag => {
      const isPublic = publicFlagPrefixes.some(prefix =>
        flag.name.toLowerCase().startsWith(prefix)
      );

      if (isPublic) {
        publicFlags[flag.name] = flag.enabled;
      }
    });

    return publicFlags;
  }

  // Initialize default feature flags
  async initializeDefaultFlags(): Promise<void> {
    const defaultFlags = [
      {
        name: 'enable_real_time_messaging',
        description: 'Enable real-time messaging with Socket.IO',
        enabled: true,
      },
      {
        name: 'enable_advanced_search',
        description: 'Enable advanced pet search filters',
        enabled: true,
      },
      {
        name: 'enable_notification_center',
        description: 'Enable in-app notification center',
        enabled: true,
      },
      {
        name: 'enable_application_workflow',
        description: 'Enable advanced application workflow',
        enabled: true,
      },
      {
        name: 'enable_content_moderation',
        description: 'Enable content moderation system',
        enabled: true,
      },
      {
        name: 'ui_show_beta_features',
        description: 'Show beta features in UI',
        enabled: false,
      },
      {
        name: 'feature_social_sharing',
        description: 'Enable social media sharing',
        enabled: true,
      },
      {
        name: 'enable_analytics_tracking',
        description: 'Enable analytics and user behavior tracking',
        enabled: true,
      },
      {
        name: 'allow_bulk_operations',
        description: 'Allow bulk operations for administrators',
        enabled: true,
      },
      {
        name: 'feature_rating_system',
        description: 'Enable user and rescue rating system',
        enabled: true,
      },
    ];

    for (const flagData of defaultFlags) {
      const existing = await this.getFlag(flagData.name);
      if (!existing) {
        await this.setFlag(flagData.name, flagData, 'system');
      }
    }

    logger.info('Default feature flags initialized');
  }

  // Get feature flag statistics
  async getStatistics(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    recentlyModified: FeatureFlag[];
  }> {
    const [total, enabled] = await Promise.all([
      FeatureFlag.count(),
      FeatureFlag.count({ where: { enabled: true } }),
    ]);

    const recentlyModified = await FeatureFlag.findAll({
      order: [['updated_at', 'DESC']],
      limit: 5,
    });

    return {
      total,
      enabled,
      disabled: total - enabled,
      recentlyModified,
    };
  }
}

export default new FeatureFlagService();
