import { {{SERVICE_NAME}} } from '../{{LIB_NAME}}-service';

describe('{{SERVICE_NAME}}', () => {
  let service: {{SERVICE_NAME}};

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    service = new {{SERVICE_NAME}}({
      debug: false,
    });
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.debug).toBe(false);
    });

    it('should allow config updates', () => {
      service.updateConfig({ debug: true });
      expect(service.getConfig().debug).toBe(true);
    });
  });

  describe('exampleMethod', () => {
    it('should process data successfully', async () => {
      const testData = { test: 'data' };

      const result = await service.exampleMethod(testData);

      expect(result.success).toBe(true);
      expect(result.data.processed).toEqual(testData);
      expect(result.message).toContain('completed successfully');
    });

    it('should handle errors gracefully', async () => {
      // Mock an error condition
      const originalMethod = service.exampleMethod;
      service.exampleMethod = vi.fn().mockRejectedValue(new Error('Test error'));

      await expect(service.exampleMethod({})).rejects.toThrow('Test error');

      // Restore original method
      service.exampleMethod = originalMethod;
    });
  });

  describe('healthCheck', () => {
    it('should return true by default', async () => {
      const result = await service.healthCheck();
      expect(result).toBe(true);
    });
  });

  // TODO: Add more specific tests for your {{LIB_NAME}} functionality
});
