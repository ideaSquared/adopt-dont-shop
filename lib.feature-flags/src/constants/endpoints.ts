/**
 * API Endpoints for Feature Flags Service
 * Centralized endpoint definitions following industry standard patterns
 */

export const FEATURE_FLAGS_ENDPOINTS = {
  // Core feature flag operations
  FEATURES: '/api/v1/features',
  FEATURE_BY_KEY: (key: string) => `/api/v1/features/${key}`,

  // Dynamic configuration
  CONFIG: '/api/v1/config',
  CONFIG_BY_KEY: (key: string) => `/api/v1/config/${key}`,

  // User-specific feature evaluation
  USER_FEATURES: (userId: string) => `/api/v1/features/user/${userId}`,
  EVALUATE_FEATURE: (key: string) => `/api/v1/features/${key}/evaluate`,

  // Feature flag management (admin)
  CREATE_FEATURE: '/api/v1/admin/features',
  UPDATE_FEATURE: (key: string) => `/api/v1/admin/features/${key}`,
  DELETE_FEATURE: (key: string) => `/api/v1/admin/features/${key}`,

  // Feature flag analytics
  FEATURE_ANALYTICS: '/api/v1/features/analytics',
  FEATURE_USAGE: (key: string) => `/api/v1/features/${key}/usage`,

  // A/B testing integration
  EXPERIMENTS: '/api/v1/features/experiments',
  EXPERIMENT_ASSIGNMENT: (experimentId: string) =>
    `/api/v1/features/experiments/${experimentId}/assignment`,

  // Remote configuration
  REMOTE_CONFIG: '/api/v1/config/remote',
  UPDATE_REMOTE_CONFIG: '/api/v1/admin/config/remote',
} as const;

// Export individual endpoint groups for easier imports
export const {
  FEATURES,
  FEATURE_BY_KEY,
  CONFIG,
  CONFIG_BY_KEY,
  USER_FEATURES,
  EVALUATE_FEATURE,
  CREATE_FEATURE,
  UPDATE_FEATURE,
  DELETE_FEATURE,
  FEATURE_ANALYTICS,
  FEATURE_USAGE,
  EXPERIMENTS,
  EXPERIMENT_ASSIGNMENT,
  REMOTE_CONFIG,
  UPDATE_REMOTE_CONFIG,
} = FEATURE_FLAGS_ENDPOINTS;
