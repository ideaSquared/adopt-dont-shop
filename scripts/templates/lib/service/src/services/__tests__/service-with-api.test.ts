import { {{SERVICE_NAME}} } from '../{{LIB_NAME}}-service';
import { apiService } from '@adopt-dont-shop/lib.api';

// Mock lib.api
vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    fetchWithAuth: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    isAuthenticated: vi.fn(),
    updateConfig: vi.fn(),
  },
  ApiService: vi.fn().mockImplementation(() => ({
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    fetchWithAuth: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    isAuthenticated: vi.fn(),
    updateConfig: vi.fn(),
  })),
}));

describe('{{SERVICE_NAME}}', () => {
  let service: {{SERVICE_NAME}};

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    service = new {{SERVICE_NAME}}({
      debug: false,
    });

    vi.clearAllMocks();
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

  describe('exampleGet', () => {
    it('should call API service get method', async () => {
      const mockResponse = { id: '123', name: 'Test' };
      const mockApiService = service['apiService'];
      mockApiService.get = vi.fn().mockResolvedValue(mockResponse);

      const result = await service.exampleGet('123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/{{LIB_NAME}}/123');
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      const mockApiService = service['apiService'];
      mockApiService.get = vi.fn().mockRejectedValue(error);

      await expect(service.exampleGet('123')).rejects.toThrow('API Error');
    });
  });

  describe('exampleCreate', () => {
    it('should call API service post method', async () => {
      const mockData = { name: 'Test' };
      const mockResponse = { id: '123', ...mockData };
      const mockApiService = service['apiService'];
      mockApiService.post = vi.fn().mockResolvedValue(mockResponse);

      const result = await service.exampleCreate(mockData);

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/{{LIB_NAME}}', mockData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      const mockApiService = service['apiService'];
      mockApiService.get = vi.fn().mockResolvedValue({});

      const result = await service.healthCheck();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/health');
      expect(result).toBe(true);
    });

    it('should return false when API fails', async () => {
      const mockApiService = service['apiService'];
      mockApiService.get = vi.fn().mockRejectedValue(new Error('API Error'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  // TODO: Add more specific tests for your {{LIB_NAME}} functionality
});
