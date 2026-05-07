import { PermissionsService } from '../permissions-service';
import { ApiService } from '@adopt-dont-shop/lib.api';
import { Permission, UserWithPermissions } from '../../types';

// Mock the ApiService
vi.mock('@adopt-dont-shop/lib.api');
const MockedApiService = ApiService as vi.MockedClass<typeof ApiService>;

describe('PermissionsService', () => {
  let service: PermissionsService;
  let mockApiService: vi.Mocked<ApiService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService = new MockedApiService() as vi.Mocked<ApiService>;
    service = new PermissionsService({}, mockApiService);
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config.debug).toBe(false);
    });

    it('should allow config updates', () => {
      service.updateConfig({ debug: true });
      const config = service.getConfig();
      expect(config.debug).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should check user permission successfully', async () => {
      const mockResponse = { hasPermission: true };
      mockApiService.post = vi.fn().mockResolvedValue(mockResponse);

      const result = await service.hasPermission('user123', 'pets.read');

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/permissions/check', {
        userId: 'user123',
        permission: 'pets.read',
        resourceId: undefined,
      });
      expect(result).toBe(true);
    });

    it('should return false when permission denied', async () => {
      const mockResponse = { hasPermission: false };
      mockApiService.post = vi.fn().mockResolvedValue(mockResponse);

      const result = await service.hasPermission('user123', 'admin.dashboard');

      expect(result).toBe(false);
    });

    it('should handle API errors by denying access', async () => {
      const error = new Error('API Error');
      mockApiService.post = vi.fn().mockRejectedValue(error);

      const result = await service.hasPermission('user123', 'pets.read');

      expect(result).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should retrieve user permissions', async () => {
      const mockPermissions: Permission[] = ['pets.read', 'pets.create'];
      const mockResponse = { permissions: mockPermissions };
      mockApiService.get = vi.fn().mockResolvedValue(mockResponse);

      const result = await service.getUserPermissions('user123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/users/user123/permissions');
      expect(result).toEqual(mockPermissions);
    });

    it('should return empty array on API error', async () => {
      const error = new Error('API Error');
      mockApiService.get = vi.fn().mockRejectedValue(error);

      const result = await service.getUserPermissions('user123');

      expect(result).toEqual([]);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({});

      const result = await service.healthCheck();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/permissions/health');
      expect(result).toBe(true);
    });

    it('should return false when API fails', async () => {
      const error = new Error('API Error');
      mockApiService.get = vi.fn().mockRejectedValue(error);

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });
});
