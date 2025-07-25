import { ApiService } from '../api-service';

describe('ApiService', () => {
  let service: ApiService;

  beforeEach(() => {
    service = new ApiService({
      debug: false,
    });
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.debug).toBe(false);
    });

    it('should initialize with custom config', () => {
      const customService = new ApiService({
        debug: true,
        apiUrl: 'https://test.example.com',
      });
      
      const config = customService.getConfig();
      expect(config.debug).toBe(true);
      expect(config.apiUrl).toBe('https://test.example.com');
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      service.updateConfig({ debug: true });
      const config = service.getConfig();
      expect(config.debug).toBe(true);
    });

    it('should return current configuration', () => {
      const config = service.getConfig();
      expect(typeof config).toBe('object');
      expect(config).toHaveProperty('apiUrl');
      expect(config).toHaveProperty('debug');
    });
  });

  describe('cache management', () => {
    it('should clear cache without errors', () => {
      expect(() => service.clearCache()).not.toThrow();
    });
  });

  describe('exampleMethod', () => {
    it('should return success response', async () => {
      const testData = { test: 'data' };
      const result = await service.exampleMethod(testData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should use cache when enabled', async () => {
      const testData = { test: 'cached' };
      
      // First call
      const result1 = await service.exampleMethod(testData, { useCache: true });
      
      // Second call should use cache
      const result2 = await service.exampleMethod(testData, { useCache: true });
      
      expect(result1).toEqual(result2);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const isHealthy = await service.healthCheck();
      expect(typeof isHealthy).toBe('boolean');
    });
  });
});
