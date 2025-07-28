import { FeatureFlagsService } from '../feature-flags-service';
import { FeatureFlag, FeatureFlagData, StatsigUser } from '../../types';

// Mock fetch globally
global.fetch = jest.fn();

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    service = new FeatureFlagsService({
      debug: false,
      apiUrl: 'https://api.test.com',
      enableStatsig: true,
    });
  });

  afterEach(() => {
    service.destroy();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.debug).toBe(false);
      expect(config.enableStatsig).toBe(true);
      expect(config.cacheTtl).toBe(5 * 60 * 1000);
      expect(config.maxCacheSize).toBe(200);
    });

    it('should allow config updates', () => {
      service.updateConfig({ debug: true, cacheTtl: 10000 });
      const config = service.getConfig();
      expect(config.debug).toBe(true);
      expect(config.cacheTtl).toBe(10000);
    });

    it('should initialize with custom config', () => {
      const customService = new FeatureFlagsService({
        debug: true,
        apiUrl: 'https://custom.api.com',
        enableStatsig: false,
        cacheTtl: 60000,
      });

      const config = customService.getConfig();
      expect(config.debug).toBe(true);
      expect(config.apiUrl).toBe('https://custom.api.com');
      expect(config.enableStatsig).toBe(false);
      expect(config.cacheTtl).toBe(60000);

      customService.destroy();
    });
  });

  describe('isFeatureEnabled', () => {
    it('should check if feature is enabled', async () => {
      const mockResponse = { enabled: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await service.isFeatureEnabled('test_feature');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/features/test_feature',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should return false when feature is disabled', async () => {
      const mockResponse = { enabled: false };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await service.isFeatureEnabled('disabled_feature');

      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.isFeatureEnabled('error_feature');

      expect(result).toBe(false);
    });

    it('should use cache when available', async () => {
      const mockResponse = { enabled: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // First call
      const result1 = await service.isFeatureEnabled('cached_feature');
      expect(result1).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await service.isFeatureEnabled('cached_feature');
      expect(result2).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should bypass cache when useCache is false', async () => {
      const mockResponse = { enabled: true };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await service.isFeatureEnabled('test_feature');
      await service.isFeatureEnabled('test_feature', { useCache: false });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAllFlags', () => {
    const mockFlags: FeatureFlag[] = [
      {
        id: 'flag1',
        name: 'feature_one',
        description: 'First feature',
        enabled: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'flag2',
        name: 'feature_two',
        description: 'Second feature',
        enabled: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    it('should get all feature flags', async () => {
      const mockResponse = { data: mockFlags };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await service.getAllFlags();

      expect(result).toEqual(mockFlags);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/admin/features?',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should apply filters correctly', async () => {
      const mockResponse = { data: [mockFlags[0]] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const filters = { enabled: true, search: 'feature' };
      const result = await service.getAllFlags(filters);

      expect(result).toEqual([mockFlags[0]]);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/admin/features?enabled=true&search=feature',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.getAllFlags();

      expect(result).toEqual([]);
    });

    it('should force refresh when requested', async () => {
      const mockResponse = { data: mockFlags };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // First call
      await service.getAllFlags();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call with cache should not make new request
      await service.getAllFlags();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Third call with forceRefresh should make new request
      await service.getAllFlags({}, { forceRefresh: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('setFlag', () => {
    const flagData: FeatureFlagData = {
      name: 'new_feature',
      description: 'A new feature',
      enabled: true,
    };

    it('should create or update a feature flag', async () => {
      const mockResponse = { data: { id: 'flag1', ...flagData } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await service.setFlag('new_feature', flagData);

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/admin/features/new_feature',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(flagData),
        })
      );
    });

    it('should clear cache after updating flag', async () => {
      const mockResponse = { data: { id: 'flag1', ...flagData } };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // First, populate cache
      await service.isFeatureEnabled('test_flag');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Update flag (should clear cache)
      await service.setFlag('new_feature', flagData);

      // Check flag again (should make new request due to cache clear)
      await service.isFeatureEnabled('test_flag');
      expect(mockFetch).toHaveBeenCalledTimes(3); // isFeature, setFlag, isFeature again
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Update failed'));

      await expect(service.setFlag('failing_feature', flagData)).rejects.toThrow('Update failed');
    });
  });

  describe('deleteFlag', () => {
    it('should delete a feature flag', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await service.deleteFlag('obsolete_feature');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/admin/features/obsolete_feature',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle deletion errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(service.deleteFlag('protected_feature')).rejects.toThrow('Delete failed');
    });
  });

  describe('getPublicFlags', () => {
    it('should get public feature flags', async () => {
      const mockFlags = {
        ui_new_design: true,
        feature_beta_test: false,
        enable_notifications: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFlags,
      } as Response);

      const result = await service.getPublicFlags();

      expect(result).toEqual(mockFlags);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/features',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle API errors and return empty object', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.getPublicFlags();

      expect(result).toEqual({});
    });
  });

  describe('Statsig integration', () => {
    it('should check gate when Statsig is enabled', () => {
      const result = service.checkGate('test_gate');
      expect(result).toBe(false); // Default mock implementation
    });

    it('should return false when Statsig is disabled', () => {
      service.updateConfig({ enableStatsig: false });
      const result = service.checkGate('test_gate');
      expect(result).toBe(false);
    });

    it('should get experiment when Statsig is enabled', () => {
      const result = service.getExperiment('test_experiment');
      expect(result).toBeNull(); // Default mock implementation
    });

    it('should get dynamic config when Statsig is enabled', () => {
      const result = service.getDynamicConfig('test_config');
      expect(result).toBeNull(); // Default mock implementation
    });

    it('should update user context', () => {
      const user: StatsigUser = {
        userID: 'user123',
        email: 'test@example.com',
        custom: { plan: 'premium' },
      };

      service.updateUser(user);
      const config = service.getConfig();
      expect(config.defaultUser).toEqual(user);
    });
  });

  describe('event logging', () => {
    it('should log events', () => {
      service.logEvent('test_event', 1, { source: 'test' });

      const events = service.getRecentEvents(10);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        eventName: 'test_event',
        value: 1,
        metadata: { source: 'test' },
      });
    });

    it('should limit event history', () => {
      // Log more than MAX_EVENTS (1000) to test limit
      for (let i = 0; i < 1001; i++) {
        service.logEvent(`event_${i}`);
      }

      const events = service.getRecentEvents();
      expect(events.length).toBeLessThanOrEqual(1000);
    });

    it('should return limited events when requested', () => {
      for (let i = 0; i < 10; i++) {
        service.logEvent(`event_${i}`);
      }

      const events = service.getRecentEvents(5);
      expect(events).toHaveLength(5);
    });
  });

  describe('metrics and cache', () => {
    it('should provide metrics', () => {
      const metrics = service.getMetrics();
      expect(metrics).toMatchObject({
        totalFlags: expect.any(Number),
        enabledFlags: expect.any(Number),
        disabledFlags: expect.any(Number),
        cacheHitRate: expect.any(Number),
        lastUpdated: expect.any(Date),
        flagUsageStats: expect.any(Map),
      });
    });

    it('should provide cache stats', () => {
      const stats = service.getCacheStats();
      expect(stats).toMatchObject({
        size: expect.any(Number),
        maxSize: expect.any(Number),
        hitRate: expect.any(Number),
        evictionCount: expect.any(Number),
      });
    });

    it('should clear cache', async () => {
      const mockResponse = { enabled: true };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Populate cache
      await service.isFeatureEnabled('test_feature');
      expect(service.getCacheStats().size).toBeGreaterThan(0);

      // Clear cache
      service.clearCache();
      expect(service.getCacheStats().size).toBe(0);
    });
  });

  describe('health check', () => {
    it('should return true when API is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      } as Response);

      const result = await service.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Health check failed'));

      const result = await service.healthCheck();
      expect(result).toBe(false);
    });

    it('should return true when no API URL is configured', async () => {
      const serviceWithoutApi = new FeatureFlagsService({ apiUrl: '' });
      const result = await serviceWithoutApi.healthCheck();
      expect(result).toBe(true);
      serviceWithoutApi.destroy();
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const enabled = await service.isFeatureEnabled('test_feature');
      const flags = await service.getAllFlags();
      const publicFlags = await service.getPublicFlags();

      expect(enabled).toBe(false);
      expect(flags).toEqual([]);
      expect(publicFlags).toEqual({});
    });

    it('should handle invalid JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as Response);

      const result = await service.isFeatureEnabled('test_feature');
      expect(result).toBe(false);
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      } as Response);

      await expect(service.setFlag('test', { name: 'test', enabled: true })).rejects.toThrow(
        'API request failed: 500 Internal Server Error'
      );
    });
  });

  describe('cache management', () => {
    it('should evict old cache entries', async () => {
      const mockResponse = { enabled: true };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Set a very small cache size
      service.updateConfig({ maxCacheSize: 2 });

      // Fill cache beyond limit
      await service.isFeatureEnabled('feature1');
      await service.isFeatureEnabled('feature2');
      await service.isFeatureEnabled('feature3'); // Should evict feature1

      const stats = service.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(2);
    });

    it('should respect TTL for cache entries', (done) => {
      service.updateConfig({ cacheTtl: 50 }); // 50ms TTL

      const mockResponse = { enabled: true };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      service
        .isFeatureEnabled('ttl_test')
        .then(() => {
          // Immediately check again (should use cache)
          return service.isFeatureEnabled('ttl_test');
        })
        .then(() => {
          expect(mockFetch).toHaveBeenCalledTimes(1);

          // Wait for TTL to expire and check again
          setTimeout(async () => {
            await service.isFeatureEnabled('ttl_test');
            expect(mockFetch).toHaveBeenCalledTimes(2);
            done();
          }, 60);
        });
    });
  });
});

