import {
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
} from '../types';

/**
 * FeatureFlagsService - Comprehensive feature flag management with backend and Statsig integration
 */
export class FeatureFlagsService {
  private config: FeatureFlagsServiceConfig;
  private cache = new Map<string, CacheEntry<any>>();
  private metrics: FeatureFlagMetrics;
  private events: FeatureFlagEvent[] = [];
  private cleanupInterval?: NodeJS.Timeout;
  private readonly MAX_EVENTS = 1000;

  constructor(config: Partial<FeatureFlagsServiceConfig> = {}) {
    this.config = {
      debug: false,
      cacheTtl: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 200,
      enableStatsig: true,
      ...config,
    };

    this.metrics = {
      totalFlags: 0,
      enabledFlags: 0,
      disabledFlags: 0,
      cacheHitRate: 0,
      lastUpdated: new Date(),
      flagUsageStats: new Map(),
    };

    // Start cache cleanup
    this.startCacheCleanup();

    if (this.config.debug) {
      console.log(`${FeatureFlagsService.name} initialized with config:`, this.config);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): FeatureFlagsServiceConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  public updateConfig(updates: Partial<FeatureFlagsServiceConfig>): void {
    this.config = { ...this.config, ...updates };

    if (this.config.debug) {
      console.log(`${FeatureFlagsService.name} config updated:`, this.config);
    }
  }

  /**
   * Check if a feature flag is enabled (backend flags)
   */
  public async isFeatureEnabled(
    flagName: string,
    options: FeatureFlagsServiceOptions = {}
  ): Promise<boolean> {
    try {
      const cacheKey = `flag:${flagName}`;

      // Check cache first
      if (options.useCache !== false) {
        const cached = this.getFromCache<boolean>(cacheKey);
        if (cached !== null) {
          this.trackFlagUsage(flagName);
          return cached;
        }
      }

      // Fetch from API
      const response = await this.fetchFromAPI(`/api/v1/features/${flagName}`, {
        method: 'GET',
        timeout: options.timeout,
      });

      const enabled = response?.enabled || false;

      // Cache the result
      if (options.useCache !== false) {
        this.setCache(cacheKey, enabled);
      }

      this.trackFlagUsage(flagName);
      return enabled;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${FeatureFlagsService.name} isFeatureEnabled failed:`, error);
      }
      return false; // Default to disabled on error
    }
  }

  /**
   * Get all feature flags
   */
  public async getAllFlags(
    filters: FeatureFlagFilters = {},
    options: FeatureFlagsServiceOptions = {}
  ): Promise<FeatureFlag[]> {
    try {
      const cacheKey = `flags:${JSON.stringify(filters)}`;

      // Check cache first
      if (options.useCache !== false && !options.forceRefresh) {
        const cached = this.getFromCache<FeatureFlag[]>(cacheKey);
        if (cached !== null) {
          return cached;
        }
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.enabled !== undefined) params.append('enabled', filters.enabled.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);

      const response = await this.fetchFromAPI(`/api/v1/admin/features?${params}`, {
        method: 'GET',
        timeout: options.timeout,
      });

      const flags = response?.data || [];

      // Cache the result
      if (options.useCache !== false) {
        this.setCache(cacheKey, flags);
      }

      this.updateMetrics(flags);
      return flags;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${FeatureFlagsService.name} getAllFlags failed:`, error);
      }
      return [];
    }
  }

  /**
   * Create or update a feature flag
   */
  public async setFlag(
    flagName: string,
    flagData: FeatureFlagData,
    options: FeatureFlagsServiceOptions = {}
  ): Promise<FeatureFlag | null> {
    try {
      const response = await this.fetchFromAPI(`/api/v1/admin/features/${flagName}`, {
        method: 'PUT',
        body: JSON.stringify(flagData),
        timeout: options.timeout,
      });

      // Clear related cache entries
      this.clearCachePattern('flag:');
      this.clearCachePattern('flags:');

      this.logEvent('feature_flag_updated', 1, {
        flag_name: flagName,
        enabled: flagData.enabled,
      });

      return response?.data || null;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${FeatureFlagsService.name} setFlag failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Delete a feature flag
   */
  public async deleteFlag(
    flagName: string,
    options: FeatureFlagsServiceOptions = {}
  ): Promise<void> {
    try {
      await this.fetchFromAPI(`/api/v1/admin/features/${flagName}`, {
        method: 'DELETE',
        timeout: options.timeout,
      });

      // Clear related cache entries
      this.clearCachePattern('flag:');
      this.clearCachePattern('flags:');

      this.logEvent('feature_flag_deleted', 1, {
        flag_name: flagName,
      });
    } catch (error) {
      if (this.config.debug) {
        console.error(`${FeatureFlagsService.name} deleteFlag failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Get public feature flags (for client-side use)
   */
  public async getPublicFlags(
    options: FeatureFlagsServiceOptions = {}
  ): Promise<Record<string, boolean>> {
    try {
      const cacheKey = 'public_flags';

      // Check cache first
      if (options.useCache !== false && !options.forceRefresh) {
        const cached = this.getFromCache<Record<string, boolean>>(cacheKey);
        if (cached !== null) {
          return cached;
        }
      }

      const response = await this.fetchFromAPI('/api/v1/features', {
        method: 'GET',
        timeout: options.timeout,
      });

      const flags = response || {};

      // Cache the result
      if (options.useCache !== false) {
        this.setCache(cacheKey, flags);
      }

      return flags;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${FeatureFlagsService.name} getPublicFlags failed:`, error);
      }
      return {};
    }
  }

  /**
   * Check feature gate using Statsig (if enabled)
   */
  public checkGate(gateName: string, user?: StatsigUser): boolean {
    try {
      if (!this.config.enableStatsig) {
        if (this.config.debug) {
          console.warn('Statsig is disabled, gate check returning false');
        }
        return false;
      }

      // In a real implementation, this would use the Statsig client
      // For now, we'll return a mock response
      this.trackFlagUsage(gateName);
      this.logEvent('feature_gate_checked', 1, {
        gate_name: gateName,
        user_id: user?.userID || 'anonymous',
      });

      return false; // Default implementation
    } catch (error) {
      if (this.config.debug) {
        console.error(`${FeatureFlagsService.name} checkGate failed:`, error);
      }
      return false;
    }
  }

  /**
   * Get experiment configuration using Statsig
   */
  public getExperiment(experimentName: string, user?: StatsigUser): ExperimentConfig | null {
    try {
      if (!this.config.enableStatsig) {
        if (this.config.debug) {
          console.warn('Statsig is disabled, experiment returning null');
        }
        return null;
      }

      this.logEvent('experiment_accessed', 1, {
        experiment_name: experimentName,
        user_id: user?.userID || 'anonymous',
      });

      // Default implementation - in real usage this would use Statsig client
      return null;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${FeatureFlagsService.name} getExperiment failed:`, error);
      }
      return null;
    }
  }

  /**
   * Get dynamic configuration using Statsig
   */
  public getDynamicConfig(configName: string, user?: StatsigUser): DynamicConfig | null {
    try {
      if (!this.config.enableStatsig) {
        if (this.config.debug) {
          console.warn('Statsig is disabled, dynamic config returning null');
        }
        return null;
      }

      this.logEvent('dynamic_config_accessed', 1, {
        config_name: configName,
        user_id: user?.userID || 'anonymous',
      });

      // Default implementation - in real usage this would use Statsig client
      return null;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${FeatureFlagsService.name} getDynamicConfig failed:`, error);
      }
      return null;
    }
  }

  /**
   * Log events for analytics
   */
  public logEvent(
    eventName: string,
    value?: string | number,
    metadata?: Record<string, string | number | boolean>
  ): void {
    try {
      const event: FeatureFlagEvent = {
        eventName,
        value,
        metadata,
        timestamp: new Date(),
      };

      this.events.push(event);

      // Keep only the last MAX_EVENTS events
      if (this.events.length > this.MAX_EVENTS) {
        this.events = this.events.slice(-this.MAX_EVENTS);
      }

      if (this.config.debug) {
        console.log(`${FeatureFlagsService.name} event logged:`, event);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error(`${FeatureFlagsService.name} logEvent failed:`, error);
      }
    }
  }

  /**
   * Update user context for Statsig
   */
  public updateUser(user: StatsigUser): void {
    try {
      if (!this.config.enableStatsig) {
        if (this.config.debug) {
          console.warn('Statsig is disabled, user update ignored');
        }
        return;
      }

      this.config.defaultUser = user;
      this.logEvent('user_updated', 1, {
        user_id: user.userID,
      });

      if (this.config.debug) {
        console.log(`${FeatureFlagsService.name} user updated:`, user);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error(`${FeatureFlagsService.name} updateUser failed:`, error);
      }
    }
  }

  /**
   * Get feature flag metrics
   */
  public getMetrics(): FeatureFlagMetrics {
    const totalCacheAccesses = Array.from(this.cache.values()).length;
    const cacheHits = totalCacheAccesses > 0 ? this.metrics.cacheHitRate * totalCacheAccesses : 0;

    return {
      ...this.metrics,
      cacheHitRate: totalCacheAccesses > 0 ? cacheHits / totalCacheAccesses : 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): CacheStats {
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize || 200,
      hitRate: this.metrics.cacheHitRate,
      evictionCount: 0, // Would track in real implementation
    };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    if (this.config.debug) {
      console.log(`${FeatureFlagsService.name} cache cleared`);
    }
  }

  /**
   * Get recent events
   */
  public getRecentEvents(limit: number = 100): FeatureFlagEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Check if we can reach the API
      if (this.config.apiUrl) {
        await this.fetchFromAPI('/api/v1/health', {
          method: 'GET',
          timeout: 5000,
        });
      }
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${FeatureFlagsService.name} health check failed:`, error);
      }
      return false;
    }
  }

  // Private helper methods

  private async fetchFromAPI(endpoint: string, options: any = {}): Promise<any> {
    const url = `${this.config.apiUrl || ''}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl?: number): void {
    // Check cache size limit
    if (this.cache.size >= (this.config.maxCacheSize || 200)) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTtl || 300000,
    });
  }

  private clearCachePattern(pattern: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter((key) => key.includes(pattern));

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  private trackFlagUsage(flagName: string): void {
    const current = this.metrics.flagUsageStats.get(flagName) || 0;
    this.metrics.flagUsageStats.set(flagName, current + 1);
  }

  private updateMetrics(flags: FeatureFlag[]): void {
    this.metrics.totalFlags = flags.length;
    this.metrics.enabledFlags = flags.filter((f) => f.enabled).length;
    this.metrics.disabledFlags = flags.filter((f) => !f.enabled).length;
    this.metrics.lastUpdated = new Date();
  }

  private startCacheCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.timestamp + entry.ttl) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clearCache();
  }
}

