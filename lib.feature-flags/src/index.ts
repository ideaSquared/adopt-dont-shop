// Main exports for @adopt-dont-shop/lib-feature-flags
export { FeatureFlagsService } from './services/feature-flags-service';

// Export all types
export type {
  FeatureFlagsServiceConfig,
  FeatureFlagsServiceOptions,
  FeatureFlag,
  FeatureFlagFilters,
  FeatureFlagData,
  FeatureFlagMetrics,
  FeatureFlagEvent,
  StatsigUser,
  ExperimentConfig,
  DynamicConfig,
  CacheEntry,
  CacheStats,
  BaseResponse,
  ErrorResponse,
  PaginatedResponse,
} from './types';

// Re-export all types
export * from './types';

