import { ConfigValue } from '../types/common';
import {
  BulkConfigurationResult,
  ConfigurationFilters,
  ConfigurationItem,
  ConfigurationSetOptions,
  ConfigurationStatistics,
  ConfigurationUpdate,
} from '../types/configuration';
import { logger } from '../utils/logger';
import { AuditLogService } from './auditLog.service';

// Configuration storage (in production, this would use a database or cache)
const configStore = new Map<string, ConfigValue>();

class ConfigurationService {
  private configurations: Map<string, ConfigurationItem> = new Map();

  constructor() {
    this.initializeDefaultConfigurations();
  }

  // Get configuration value
  async get(key: string): Promise<ConfigValue | undefined> {
    const config = this.configurations.get(key);
    return config ? config.value : undefined;
  }

  // Get configuration item with metadata
  async getConfiguration(key: string): Promise<ConfigurationItem | undefined> {
    return this.configurations.get(key);
  }

  // Get all configurations (optionally filtered)
  async getAllConfigurations(filters?: ConfigurationFilters): Promise<ConfigurationItem[]> {
    let configs = Array.from(this.configurations.values());

    if (filters) {
      if (filters.category) {
        configs = configs.filter(config => config.category === filters.category);
      }
      if (filters.isPublic !== undefined) {
        configs = configs.filter(config => config.isPublic === filters.isPublic);
      }
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        configs = configs.filter(
          config =>
            config.key.toLowerCase().includes(searchTerm) ||
            (config.description && config.description.toLowerCase().includes(searchTerm))
        );
      }
    }

    return configs.sort((a, b) => a.key.localeCompare(b.key));
  }

  // Get public configurations (safe to expose to clients)
  async getPublicConfigurations(): Promise<Record<string, ConfigValue>> {
    const publicConfigs: Record<string, ConfigValue> = {};

    for (const config of this.configurations.values()) {
      if (config.isPublic) {
        publicConfigs[config.key] = config.value;
      }
    }

    return publicConfigs;
  }

  // Set configuration value
  async set(
    key: string,
    value: ConfigValue,
    updatedBy: string,
    options?: ConfigurationSetOptions
  ): Promise<ConfigurationItem> {
    const existingConfig = this.configurations.get(key);

    // Validate value if validation rules exist
    if (existingConfig?.validationRule || options?.validationRule) {
      const rules = existingConfig?.validationRule || options?.validationRule;
      if (rules) {
        this.validateValue(key, value, rules);
      }
    }

    const config: ConfigurationItem = {
      key,
      value,
      type: options?.type || existingConfig?.type || this.inferType(value),
      description: options?.description || existingConfig?.description,
      isPublic: options?.isPublic ?? existingConfig?.isPublic ?? false,
      category: options?.category || existingConfig?.category || 'general',
      validationRule: options?.validationRule || existingConfig?.validationRule,
      lastModifiedBy: updatedBy,
      lastModifiedAt: new Date(),
    };

    this.configurations.set(key, config);

    await AuditLogService.log({
      userId: updatedBy,
      action: 'CONFIGURATION_UPDATED',
      entity: 'Configuration',
      entityId: key,
      details: { key, value },
    });

    logger.info(`Configuration updated: ${key} by ${updatedBy}`);
    return config;
  }

  // Delete configuration
  async delete(key: string, deletedBy: string): Promise<boolean> {
    const config = this.configurations.get(key);
    if (!config) {
      return false;
    }

    this.configurations.delete(key);

    await AuditLogService.log({
      userId: deletedBy,
      action: 'CONFIGURATION_DELETED',
      entity: 'Configuration',
      entityId: key,
      details: { key },
    });

    logger.info(`Configuration deleted: ${key} by ${deletedBy}`);
    return true;
  }

  // Bulk update configurations
  async bulkUpdate(
    updates: ConfigurationUpdate[],
    updatedBy: string
  ): Promise<BulkConfigurationResult> {
    const success: ConfigurationItem[] = [];
    const errors: Array<{ key: string; error: string }> = [];

    for (const update of updates) {
      try {
        const config = await this.set(update.key, update.value, updatedBy);
        success.push(config);
      } catch (error) {
        errors.push({
          key: update.key,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await AuditLogService.log({
      userId: updatedBy,
      action: 'BULK_CONFIGURATION_UPDATE',
      entity: 'Configuration',
      entityId: '',
      details: {
        totalUpdates: updates.length,
        successful: success.length,
        failed: errors.length,
        keys: updates.map(u => u.key),
      },
    });

    return { success, errors };
  }

  // Get configuration categories
  async getCategories(): Promise<string[]> {
    const categories = new Set<string>();
    for (const config of this.configurations.values()) {
      categories.add(config.category);
    }
    return Array.from(categories).sort();
  }

  // Validate configuration value
  private validateValue(
    key: string,
    value: ConfigValue,
    rules: ConfigurationItem['validationRule']
  ): void {
    if (!rules) {
      return;
    }

    if (rules.required && (value === null || value === undefined || value === '')) {
      throw new Error(`Configuration '${key}' is required`);
    }

    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        throw new Error(`Configuration '${key}' must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        throw new Error(`Configuration '${key}' must be at most ${rules.maxLength} characters`);
      }
      if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        throw new Error(`Configuration '${key}' does not match required pattern`);
      }
    }

    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        throw new Error(`Configuration '${key}' must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        throw new Error(`Configuration '${key}' must be at most ${rules.max}`);
      }
    }

    if (rules.allowedValues && !rules.allowedValues.includes(value)) {
      throw new Error(`Configuration '${key}' must be one of: ${rules.allowedValues.join(', ')}`);
    }
  }

  // Infer type from value
  private inferType(value: ConfigValue): ConfigurationItem['type'] {
    if (Array.isArray(value)) {
      return 'array';
    }
    if (typeof value === 'object' && value !== null) {
      return 'object';
    }
    return typeof value as ConfigurationItem['type'];
  }

  // Initialize default configurations
  private initializeDefaultConfigurations(): void {
    const defaults: Array<Omit<ConfigurationItem, 'lastModifiedBy' | 'lastModifiedAt'>> = [
      {
        key: 'app.name',
        value: "Adopt Don't Shop",
        type: 'string',
        description: 'Application name',
        isPublic: true,
        category: 'general',
      },
      {
        key: 'app.version',
        value: '1.0.0',
        type: 'string',
        description: 'Application version',
        isPublic: true,
        category: 'general',
      },
      {
        key: 'features.chat.enabled',
        value: true,
        type: 'boolean',
        description: 'Enable chat functionality',
        isPublic: false,
        category: 'features',
      },
      {
        key: 'features.notifications.enabled',
        value: true,
        type: 'boolean',
        description: 'Enable notifications',
        isPublic: false,
        category: 'features',
      },
      {
        key: 'email.from_address',
        value: 'noreply@adoptdontshop.com',
        type: 'string',
        description: 'Default from email address',
        isPublic: false,
        category: 'email',
        validationRule: {
          required: true,
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
        },
      },
      {
        key: 'security.password_min_length',
        value: 8,
        type: 'number',
        description: 'Minimum password length',
        isPublic: true,
        category: 'security',
        validationRule: {
          required: true,
          min: 6,
          max: 128,
        },
      },
      {
        key: 'ui.theme',
        value: 'light',
        type: 'string',
        description: 'Default UI theme',
        isPublic: true,
        category: 'ui',
        validationRule: {
          allowedValues: ['light', 'dark', 'auto'],
        },
      },
      {
        key: 'notifications.email.enabled',
        value: true,
        type: 'boolean',
        description: 'Enable email notifications',
        isPublic: false,
        category: 'notifications',
      },
      {
        key: 'analytics.tracking_enabled',
        value: false,
        type: 'boolean',
        description: 'Enable analytics tracking',
        isPublic: false,
        category: 'analytics',
      },
      {
        key: 'performance.cache_ttl',
        value: 3600,
        type: 'number',
        description: 'Cache TTL in seconds',
        isPublic: false,
        category: 'performance',
        validationRule: {
          min: 60,
          max: 86400,
        },
      },
    ];

    for (const config of defaults) {
      this.configurations.set(config.key, {
        ...config,
        lastModifiedBy: 'system',
        lastModifiedAt: new Date(),
      });
    }

    logger.info(`Initialized ${defaults.length} default configurations`);
  }

  // Get statistics
  async getStatistics(): Promise<ConfigurationStatistics> {
    const configs = Array.from(this.configurations.values());
    const byCategory: Record<string, number> = {};

    for (const config of configs) {
      byCategory[config.category] = (byCategory[config.category] || 0) + 1;
    }

    const publicConfigurations = configs.filter(c => c.isPublic).length;

    const recentlyModified = configs
      .filter(c => c.lastModifiedAt)
      .sort((a, b) => {
        if (!a.lastModifiedAt || !b.lastModifiedAt) {
          return 0;
        }
        return b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime();
      })
      .slice(0, 10);

    return {
      total: configs.length,
      byCategory,
      publicConfigurations,
      recentlyModified,
    };
  }
}

export default new ConfigurationService();
