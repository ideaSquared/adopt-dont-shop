import { PermissionsService } from '../permissions-service';
import { ApiService } from '@adopt-dont-shop/lib.api';
import { Permission, PermissionAuditLog, UserWithPermissions } from '../../types';

const buildUser = (overrides: Partial<UserWithPermissions> = {}): UserWithPermissions => ({
  userId: 'user123',
  email: 'user@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  userType: 'adopter',
  status: 'active',
  permissions: [],
  ...overrides,
});

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

    it('should return an empty array when the API omits permissions', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({});

      const result = await service.getUserPermissions('user123');

      expect(result).toEqual([]);
    });

    it('should serve repeated lookups from cache without re-fetching', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({ permissions: ['pets.read'] });

      await service.getUserPermissions('user123');
      await service.getUserPermissions('user123');

      expect(mockApiService.get).toHaveBeenCalledTimes(1);
    });

    it('should bypass the cache when useCache is false', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({ permissions: ['pets.read'] });

      await service.getUserPermissions('user123', false);
      await service.getUserPermissions('user123', false);

      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true when at least one permission is granted', async () => {
      mockApiService.post = vi
        .fn()
        .mockResolvedValueOnce({ hasPermission: false })
        .mockResolvedValueOnce({ hasPermission: true });

      const result = await service.hasAnyPermission('user123', ['pets.read', 'pets.create']);

      expect(result).toBe(true);
    });

    it('returns false when every permission is denied', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({ hasPermission: false });

      const result = await service.hasAnyPermission('user123', ['pets.read', 'pets.create']);

      expect(result).toBe(false);
    });

    it('returns false for an empty permission set', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({ hasPermission: true });

      const result = await service.hasAnyPermission('user123', []);

      expect(result).toBe(false);
      expect(mockApiService.post).not.toHaveBeenCalled();
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true only when all permissions are granted', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({ hasPermission: true });

      const result = await service.hasAllPermissions('user123', ['pets.read', 'pets.create']);

      expect(result).toBe(true);
    });

    it('returns false when any permission is denied', async () => {
      mockApiService.post = vi
        .fn()
        .mockResolvedValueOnce({ hasPermission: true })
        .mockResolvedValueOnce({ hasPermission: false });

      const result = await service.hasAllPermissions('user123', ['pets.read', 'pets.create']);

      expect(result).toBe(false);
    });

    it('returns true (vacuously) for an empty permission set', async () => {
      mockApiService.post = vi.fn();

      const result = await service.hasAllPermissions('user123', []);

      expect(result).toBe(true);
      expect(mockApiService.post).not.toHaveBeenCalled();
    });
  });

  describe('getUserWithPermissions', () => {
    it('returns the user record from the API', async () => {
      const user = buildUser({ userType: 'admin' });
      mockApiService.get = vi.fn().mockResolvedValue(user);

      const result = await service.getUserWithPermissions('user123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/users/user123/with-permissions');
      expect(result).toEqual(user);
    });

    it('returns null on API error', async () => {
      mockApiService.get = vi.fn().mockRejectedValue(new Error('API Error'));

      const result = await service.getUserWithPermissions('user123');

      expect(result).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('returns true when the user has the requested role', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(buildUser({ userType: 'admin' }));

      const result = await service.hasRole('user123', 'admin');

      expect(result).toBe(true);
    });

    it('returns false when the user has a different role', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(buildUser({ userType: 'adopter' }));

      const result = await service.hasRole('user123', 'admin');

      expect(result).toBe(false);
    });

    it('returns false when the user cannot be resolved', async () => {
      mockApiService.get = vi.fn().mockRejectedValue(new Error('API Error'));

      const result = await service.hasRole('user123', 'admin');

      expect(result).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('returns true when the user role is in the allowed set', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(buildUser({ userType: 'moderator' }));

      const result = await service.hasAnyRole('user123', ['admin', 'moderator']);

      expect(result).toBe(true);
    });

    it('returns false when the user role is not in the allowed set', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(buildUser({ userType: 'adopter' }));

      const result = await service.hasAnyRole('user123', ['admin', 'moderator']);

      expect(result).toBe(false);
    });

    it('returns false when the user cannot be resolved', async () => {
      mockApiService.get = vi.fn().mockRejectedValue(new Error('API Error'));

      const result = await service.hasAnyRole('user123', ['admin']);

      expect(result).toBe(false);
    });
  });

  describe('assignRole', () => {
    it('posts the assignment and clears the user cache', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({ permissions: ['pets.read'] });
      mockApiService.post = vi.fn().mockResolvedValue({ success: true });

      // Prime the cache so we can observe it being cleared.
      await service.getUserPermissions('user123');

      const result = await service.assignRole({
        userId: 'user123',
        role: 'rescue_staff',
        assignedBy: 'admin-1',
      });

      expect(result).toBe(true);
      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/users/assign-role', {
        userId: 'user123',
        role: 'rescue_staff',
        assignedBy: 'admin-1',
      });

      // Cache cleared — the next read must re-fetch.
      await service.getUserPermissions('user123');
      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });

    it('re-throws when the assignment fails', async () => {
      mockApiService.post = vi.fn().mockRejectedValue(new Error('Forbidden'));

      await expect(
        service.assignRole({ userId: 'user123', role: 'admin', assignedBy: 'admin-1' })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('grantPermissions', () => {
    it('posts the grant request', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({ success: true });

      const result = await service.grantPermissions({
        userId: 'user123',
        permissions: ['pets.read'],
        grantedBy: 'admin-1',
      });

      expect(result).toBe(true);
      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/users/grant-permissions', {
        userId: 'user123',
        permissions: ['pets.read'],
        grantedBy: 'admin-1',
      });
    });

    it('re-throws when the grant fails', async () => {
      mockApiService.post = vi.fn().mockRejectedValue(new Error('Forbidden'));

      await expect(
        service.grantPermissions({
          userId: 'user123',
          permissions: ['pets.read'],
          grantedBy: 'admin-1',
        })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('revokePermissions', () => {
    it('posts the revoke request with the supplied reason', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({ success: true });

      const result = await service.revokePermissions(
        'user123',
        ['pets.read'],
        'admin-1',
        'policy change'
      );

      expect(result).toBe(true);
      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/users/revoke-permissions', {
        userId: 'user123',
        permissions: ['pets.read'],
        revokedBy: 'admin-1',
        reason: 'policy change',
      });
    });

    it('re-throws when the revoke fails', async () => {
      mockApiService.post = vi.fn().mockRejectedValue(new Error('Forbidden'));

      await expect(service.revokePermissions('user123', ['pets.read'], 'admin-1')).rejects.toThrow(
        'Forbidden'
      );
    });
  });

  describe('getAuditLogs', () => {
    it('returns logs and requests all logs when no user is given', async () => {
      const logs: PermissionAuditLog[] = [
        {
          logId: 'log-1',
          userId: 'user123',
          action: 'granted',
          permission: 'pets.read',
          performedBy: 'admin-1',
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];
      mockApiService.get = vi.fn().mockResolvedValue({ logs });

      const result = await service.getAuditLogs();

      expect(result).toEqual(logs);
      const calledWith = (mockApiService.get as vi.Mock).mock.calls[0][0];
      expect(calledWith).toContain('limit=50');
      expect(calledWith).toContain('offset=0');
      expect(calledWith).not.toContain('userId');
    });

    it('scopes the query to a user and respects limit/offset', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({ logs: [] });

      await service.getAuditLogs('user123', 10, 20);

      const calledWith = (mockApiService.get as vi.Mock).mock.calls[0][0];
      expect(calledWith).toContain('userId=user123');
      expect(calledWith).toContain('limit=10');
      expect(calledWith).toContain('offset=20');
    });

    it('returns an empty array on API error', async () => {
      mockApiService.get = vi.fn().mockRejectedValue(new Error('API Error'));

      const result = await service.getAuditLogs('user123');

      expect(result).toEqual([]);
    });

    it('returns an empty array when the API omits logs', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({});

      const result = await service.getAuditLogs();

      expect(result).toEqual([]);
    });
  });

  describe('clearCache', () => {
    beforeEach(() => {
      mockApiService.get = vi.fn().mockResolvedValue({ permissions: ['pets.read'] });
    });

    it('clears a single user without affecting others', async () => {
      await service.getUserPermissions('user-a');
      await service.getUserPermissions('user-b');

      service.clearCache('user-a');

      await service.getUserPermissions('user-a'); // re-fetch
      await service.getUserPermissions('user-b'); // still cached

      // user-a: 2 fetches, user-b: 1 fetch => 3 total
      expect(mockApiService.get).toHaveBeenCalledTimes(3);
    });

    it('clears all users when called without an argument', async () => {
      await service.getUserPermissions('user-a');
      await service.getUserPermissions('user-b');

      service.clearCache();

      await service.getUserPermissions('user-a');
      await service.getUserPermissions('user-b');

      expect(mockApiService.get).toHaveBeenCalledTimes(4);
    });
  });

  describe('getAllPermissions', () => {
    it('returns the system permission list', async () => {
      const permissions: Permission[] = ['pets.read', 'pets.create'];
      mockApiService.get = vi.fn().mockResolvedValue({ permissions });

      const result = await service.getAllPermissions();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/permissions/list');
      expect(result).toEqual(permissions);
    });

    it('returns an empty array on API error', async () => {
      mockApiService.get = vi.fn().mockRejectedValue(new Error('API Error'));

      const result = await service.getAllPermissions();

      expect(result).toEqual([]);
    });

    it('returns an empty array when the API omits permissions', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({});

      const result = await service.getAllPermissions();

      expect(result).toEqual([]);
    });
  });

  describe('debug logging branches', () => {
    it('logs to console.error on failure when debug is enabled', async () => {
      const debugService = new PermissionsService({ debug: true }, mockApiService);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      mockApiService.post = vi.fn().mockRejectedValue(new Error('boom'));

      const result = await debugService.hasPermission('user123', 'pets.read');

      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('logs on read/role/list failures when debug is enabled', async () => {
      const debugService = new PermissionsService({ debug: true }, mockApiService);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      mockApiService.get = vi.fn().mockRejectedValue(new Error('boom'));

      await debugService.getUserPermissions('user123');
      await debugService.getUserWithPermissions('user123');
      await debugService.hasRole('user123', 'admin');
      await debugService.hasAnyRole('user123', ['admin']);
      await debugService.getAuditLogs('user123');
      await debugService.getAllPermissions();
      await debugService.healthCheck();

      expect(errorSpy.mock.calls.length).toBeGreaterThanOrEqual(7);
      errorSpy.mockRestore();
    });

    it('logs on admin mutation failures when debug is enabled', async () => {
      const debugService = new PermissionsService({ debug: true }, mockApiService);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      mockApiService.post = vi.fn().mockRejectedValue(new Error('boom'));

      await expect(
        debugService.assignRole({ userId: 'user123', role: 'admin', assignedBy: 'a' })
      ).rejects.toThrow('boom');
      await expect(
        debugService.grantPermissions({
          userId: 'user123',
          permissions: ['pets.read'],
          grantedBy: 'a',
        })
      ).rejects.toThrow('boom');
      await expect(debugService.revokePermissions('user123', ['pets.read'], 'a')).rejects.toThrow(
        'boom'
      );

      expect(errorSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
      errorSpy.mockRestore();
    });
  });

  describe('permissions cache', () => {
    it('does not grow the cache beyond MAX_PERMISSIONS_CACHE_SIZE (500) entries', async () => {
      const mockPermissions: Permission[] = ['pets.read'];
      mockApiService.get = vi.fn().mockResolvedValue({ permissions: mockPermissions });

      // Populate 501 distinct user entries — the cache should stay at 500
      for (let i = 0; i < 501; i++) {
        await service.getUserPermissions(`user-${i}`, true);
      }

      // Access the private cache via bracket notation (test-only)
      const cache = (service as unknown as { permissionsCache: Map<string, unknown> })
        .permissionsCache;
      expect(cache.size).toBeLessThanOrEqual(500);
    });

    it('evicts the oldest entry (insertion-order LRU) when the cache is full', async () => {
      const mockPermissions: Permission[] = ['pets.read'];
      mockApiService.get = vi.fn().mockResolvedValue({ permissions: mockPermissions });

      // Fill cache to exactly 500 entries
      for (let i = 0; i < 500; i++) {
        await service.getUserPermissions(`user-${i}`, true);
      }

      const cache = (service as unknown as { permissionsCache: Map<string, unknown> })
        .permissionsCache;
      expect(cache.size).toBe(500);
      expect(cache.has('user-0')).toBe(true);

      // Adding one more must evict user-0 (oldest)
      await service.getUserPermissions('user-500', true);

      expect(cache.size).toBe(500);
      expect(cache.has('user-0')).toBe(false);
      expect(cache.has('user-500')).toBe(true);
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
