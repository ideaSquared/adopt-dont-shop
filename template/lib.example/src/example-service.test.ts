import { ExampleService } from './example-service';

describe('ExampleService', () => {
  describe('initialization', () => {
    it('uses default config when none provided', () => {
      const service = new ExampleService();
      const config = service.getConfig();

      expect(config.debug).toBe(false);
      expect(typeof config.apiUrl).toBe('string');
    });

    it('merges user config with defaults', () => {
      const service = new ExampleService({ debug: true, apiUrl: 'http://custom' });
      const config = service.getConfig();

      expect(config.debug).toBe(true);
      expect(config.apiUrl).toBe('http://custom');
    });
  });

  describe('updateConfig', () => {
    it('merges updates into existing config', () => {
      const service = new ExampleService({ debug: false });
      service.updateConfig({ debug: true });

      expect(service.getConfig().debug).toBe(true);
    });
  });

  describe('processItem', () => {
    it('returns success for valid input', () => {
      const service = new ExampleService();
      const result = service.processItem('hello');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        original: 'hello',
        processed: 'HELLO',
        length: 5,
      });
      expect(result.timestamp).toBeDefined();
    });

    it('trims input before processing', () => {
      const service = new ExampleService();
      const result = service.processItem('  spaced  ');

      expect(result.success).toBe(true);
      expect((result.data as { processed: string }).processed).toBe('SPACED');
    });

    it('returns failure for empty input', () => {
      const service = new ExampleService();
      const result = service.processItem('');

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.message).toContain('non-empty');
    });

    it('returns failure for whitespace-only input', () => {
      const service = new ExampleService();
      const result = service.processItem('   ');

      expect(result.success).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('returns true when service is functional', async () => {
      const service = new ExampleService();
      const healthy = await service.healthCheck();

      expect(healthy).toBe(true);
    });
  });
});
