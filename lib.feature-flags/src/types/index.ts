// Statsig Gate types (for display/admin purposes)
export interface StatsigGate {
  name: string;
  description?: string;
  isEnabled: boolean;
  ruleCount?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StatsigDynamicConfig {
  name: string;
  description?: string;
  value: Record<string, unknown>;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Statsig User type (compatible with Statsig SDK)
export interface StatsigUser {
  userID: string;
  email?: string;
  customIDs?: Record<string, string>;
  custom?: Record<string, unknown>;
}

// Admin configuration types
export interface GateListItem {
  name: string;
  description: string;
  isEnabled: boolean;
  category?: string;
}

export interface DynamicConfigListItem {
  name: string;
  description: string;
  valuePreview: string;
  category?: string;
}

// Known feature gates (for type safety and documentation)
export const KNOWN_GATES = {
  ENABLE_REAL_TIME_MESSAGING: 'enable_real_time_messaging',
  ENABLE_ADVANCED_SEARCH: 'enable_advanced_search',
  ENABLE_NOTIFICATION_CENTER: 'enable_notification_center',
  ENABLE_APPLICATION_WORKFLOW: 'enable_application_workflow',
  ENABLE_CONTENT_MODERATION: 'enable_content_moderation',
  UI_SHOW_BETA_FEATURES: 'ui_show_beta_features',
  FEATURE_SOCIAL_SHARING: 'feature_social_sharing',
  ENABLE_ANALYTICS_TRACKING: 'enable_analytics_tracking',
  ALLOW_BULK_OPERATIONS: 'allow_bulk_operations',
  FEATURE_RATING_SYSTEM: 'feature_rating_system',
} as const;

export type KnownGate = (typeof KNOWN_GATES)[keyof typeof KNOWN_GATES];

// Known dynamic configs (for type safety and documentation)
export const KNOWN_CONFIGS = {
  APPLICATION_SETTINGS: 'application_settings',
  SYSTEM_SETTINGS: 'system_settings',
  MODERATION_SETTINGS: 'moderation_settings',
} as const;

export type KnownConfig = (typeof KNOWN_CONFIGS)[keyof typeof KNOWN_CONFIGS];

// Application settings config shape
export interface ApplicationSettingsConfig {
  max_applications_per_user: number;
  auto_approve_verified_rescues: boolean;
  maintenance_mode: boolean;
  new_registrations_enabled: boolean;
  adoption_approval_workflow_enabled: boolean;
}

// System settings config shape
export interface SystemSettingsConfig {
  max_file_upload_size_mb: number;
  session_timeout_minutes: number;
  enable_debug_logging: boolean;
  api_rate_limit_per_minute: number;
}

// Moderation settings config shape
export interface ModerationSettingsConfig {
  auto_moderate_enabled: boolean;
  profanity_filter_enabled: boolean;
  require_manual_review_threshold: number;
  max_warnings_before_suspension: number;
}
