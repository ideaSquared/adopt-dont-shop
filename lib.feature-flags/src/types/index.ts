// Feature Flag specific types
export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  config?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlagFilters {
  enabled?: boolean;
  search?: string;
  category?: string;
}

export interface FeatureFlagData {
  name: string;
  description?: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

// Statsig integration types
export interface StatsigUser {
  userID: string;
  email?: string;
  customIDs?: Record<string, string>;
  custom?: Record<string, unknown>;
}

export interface ExperimentConfig {
  name: string;
  groupName: string;
  parameters: Record<string, unknown>;
}

export interface DynamicConfig {
  name: string;
  value: Record<string, unknown>;
}

export interface FeatureFlagMetrics {
  totalFlags: number;
  enabledFlags: number;
  disabledFlags: number;
  cacheHitRate: number;
  lastUpdated: Date;
  flagUsageStats: Map<string, number>;
}

export interface FeatureFlagEvent {
  eventName: string;
  value?: string | number;
  metadata?: Record<string, string | number | boolean>;
  timestamp: Date;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  evictionCount: number;
}

/**
 * Configuration options for FeatureFlagsService
 */
export interface FeatureFlagsServiceConfig {
  /**
   * API base URL for backend feature flags
   */
  apiUrl?: string;

  /**
   * Statsig SDK key for client-side feature flags
   */
  statsigClientKey?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Custom headers to include with requests
   */
  headers?: Record<string, string>;

  /**
   * Cache TTL in milliseconds
   */
  cacheTtl?: number;

  /**
   * Maximum cache size
   */
  maxCacheSize?: number;

  /**
   * Enable Statsig integration
   */
  enableStatsig?: boolean;

  /**
   * Default user information for Statsig
   */
  defaultUser?: StatsigUser;
}

/**
 * Options for FeatureFlagsService operations
 */
export interface FeatureFlagsServiceOptions {
  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Whether to use caching
   */
  useCache?: boolean;

  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;

  /**
   * Force refresh from server
   */
  forceRefresh?: boolean;
}

/**
 * Base response interface
 */
export interface BaseResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

