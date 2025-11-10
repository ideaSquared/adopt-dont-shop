import { ConfigValue, CountByCategory, JsonValue, ValidationRule } from './common';

// Configuration item types
export interface ConfigurationItem {
  key: string;
  value: ConfigValue;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  isPublic: boolean;
  category: string;
  validationRule?: ValidationRule;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
}

// Configuration filters
export interface ConfigurationFilters {
  category?: string;
  isPublic?: boolean;
  search?: string;
  type?: ConfigurationItem['type'];
}

// Configuration update types
export interface ConfigurationUpdate {
  key: string;
  value: ConfigValue;
}

export interface ConfigurationSetOptions {
  type?: ConfigurationItem['type'];
  description?: string;
  isPublic?: boolean;
  category?: string;
  validationRule?: ValidationRule;
}

// Bulk operations
export interface BulkConfigurationResult {
  success: ConfigurationItem[];
  errors: Array<{
    key: string;
    error: string;
  }>;
}

// Configuration statistics
export interface ConfigurationStatistics {
  total: number;
  byCategory: CountByCategory;
  publicConfigurations: number;
  recentlyModified: ConfigurationItem[];
}

// Configuration validation
export interface ConfigurationValidationError {
  key: string;
  field: string;
  message: string;
  value?: JsonValue;
}

export interface ConfigurationValidationResult {
  valid: boolean;
  errors: ConfigurationValidationError[];
}

// Default configurations
export interface DefaultConfiguration {
  key: string;
  value: ConfigValue;
  type: ConfigurationItem['type'];
  description: string;
  isPublic: boolean;
  category: string;
  validationRule?: ValidationRule;
}

// Configuration categories
export type ConfigurationCategory =
  | 'general'
  | 'email'
  | 'security'
  | 'features'
  | 'integrations'
  | 'ui'
  | 'notifications'
  | 'analytics'
  | 'performance';

// Configuration change log
export interface ConfigurationChangeLog {
  key: string;
  previousValue: ConfigValue;
  newValue: ConfigValue;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

export interface ConfigurationSetting {
  id: string;
  key: string;
  value?: JsonValue;
  // ... rest of the interface
}
