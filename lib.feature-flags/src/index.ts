/**
 * @adopt-dont-shop/lib-feature-flags
 *
 * Feature flag library providing a unified interface for Statsig integration.
 *
 * This library provides:
 * - Type-safe hooks for checking feature gates
 * - Hooks for accessing dynamic configurations
 * - Constants and types for all known gates and configs
 * - Centralized feature flag management across all apps
 *
 * Migration Note: This library was refactored to remove the backend feature
 * flag system. All feature flags are now managed through Statsig.
 * See STATSIG_MIGRATION.md for details.
 */

// Export hooks (main API for apps)
export * from './hooks';

// Export all types and constants
export * from './types';

// Re-export commonly used types explicitly
export type {
  StatsigUser,
  StatsigGate,
  StatsigDynamicConfig,
  GateListItem,
  DynamicConfigListItem,
  ApplicationSettingsConfig,
  SystemSettingsConfig,
  ModerationSettingsConfig,
  KnownGate,
  KnownConfig,
} from './types';

export { KNOWN_GATES, KNOWN_CONFIGS } from './types';

