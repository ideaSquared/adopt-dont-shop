import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockGet = vi.fn();

vi.mock('./libraryServices', () => ({
  apiService: {
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

const mockStorage = new Map<string, string>();
vi.mock('./safeStorage', () => ({
  safeStorage: {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
  },
}));

// Import after mocks are defined
import { authService } from './authService';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fakeUser = {
  userId: 'u1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  userType: 'admin' as const,
  status: 'active' as const,
  emailVerified: true,
  phoneNumber: null,
  phoneVerified: false,
  profileImageUrl: null,
  bio: null,
  country: null,
  city: null,
  addressLine1: null,
  addressLine2: null,
  postalCode: null,
  rescueId: null,
  rescueName: null,
  lastLoginAt: null,
  lastLogin: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.clear();
});

describe('AuthService', () => {
  describe('login', () => {
    it('calls the admin login endpoint and stores user data', async () => {
      const authResponse = { user: fakeUser, token: 'tok' };
      mockPost.mockResolvedValueOnce(authResponse);

      const result = await authService.login({
        email: 'admin@example.com',
        password: 'pass123',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/admin/login', {
        email: 'admin@example.com',
        password: 'pass123',
      });
      expect(result).toEqual(authResponse);
      expect(mockStorage.get('user')).toBe(JSON.stringify(fakeUser));
    });
  });

  describe('register', () => {
    it('calls the admin register endpoint and stores user data', async () => {
      const authResponse = { user: fakeUser, token: 'tok' };
      mockPost.mockResolvedValueOnce(authResponse);

      const result = await authService.register({
        email: 'new@example.com',
        password: 'pass123',
        firstName: 'New',
        lastName: 'Admin',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/admin/register', {
        email: 'new@example.com',
        password: 'pass123',
        firstName: 'New',
        lastName: 'Admin',
      });
      expect(result).toEqual(authResponse);
      expect(mockStorage.get('user')).toBe(JSON.stringify(fakeUser));
    });
  });

  describe('logout', () => {
    it('calls the logout endpoint and clears stored data', async () => {
      mockStorage.set('user', JSON.stringify(fakeUser));
      mockStorage.set('impersonating', 'true');
      mockPost.mockResolvedValueOnce(undefined);

      await authService.logout();

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/admin/logout');
      expect(mockStorage.has('user')).toBe(false);
      expect(mockStorage.has('impersonating')).toBe(false);
    });

    it('clears stored data even when the API call fails', async () => {
      mockStorage.set('user', JSON.stringify(fakeUser));
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      await authService.logout();

      expect(mockStorage.has('user')).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('returns the user from storage', () => {
      mockStorage.set('user', JSON.stringify(fakeUser));

      expect(authService.getCurrentUser()).toEqual(fakeUser);
    });

    it('returns null when no user is stored', () => {
      expect(authService.getCurrentUser()).toBeNull();
    });

    it('returns null when stored data is invalid JSON', () => {
      mockStorage.set('user', '{invalid');

      expect(authService.getCurrentUser()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when user data is present', () => {
      mockStorage.set('user', JSON.stringify(fakeUser));

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('returns false when no user data is stored', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('returns true when user has the specified role', () => {
      mockStorage.set('user', JSON.stringify(fakeUser));

      expect(authService.hasRole('admin')).toBe(true);
    });

    it('returns false when user has a different role', () => {
      mockStorage.set('user', JSON.stringify(fakeUser));

      expect(authService.hasRole('super_admin')).toBe(false);
    });
  });

  describe('isSuperAdmin', () => {
    it('returns true for super_admin users', () => {
      mockStorage.set('user', JSON.stringify({ ...fakeUser, userType: 'super_admin' }));

      expect(authService.isSuperAdmin()).toBe(true);
    });

    it('returns false for non-super_admin users', () => {
      mockStorage.set('user', JSON.stringify(fakeUser));

      expect(authService.isSuperAdmin()).toBe(false);
    });
  });

  describe('isAdminStaff', () => {
    it('returns true for admin user types', () => {
      const adminTypes = ['admin', 'moderator', 'super_admin', 'support_agent'] as const;
      for (const userType of adminTypes) {
        mockStorage.set('user', JSON.stringify({ ...fakeUser, userType }));
        expect(authService.isAdminStaff()).toBe(true);
      }
    });

    it('returns false for non-admin user types', () => {
      mockStorage.set('user', JSON.stringify({ ...fakeUser, userType: 'adopter' }));

      expect(authService.isAdminStaff()).toBe(false);
    });

    it('returns false when no user is stored', () => {
      expect(authService.isAdminStaff()).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('calls the refresh token endpoint', async () => {
      mockPost.mockResolvedValueOnce(undefined);

      await authService.refreshToken();

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/admin/refresh-token', {});
    });
  });

  describe('updateProfile', () => {
    it('sends partial update and stores the returned user', async () => {
      const updated = { ...fakeUser, firstName: 'Updated' };
      mockPatch.mockResolvedValueOnce(updated);

      const result = await authService.updateProfile({ firstName: 'Updated' });

      expect(mockPatch).toHaveBeenCalledWith('/api/v1/admin/profile', { firstName: 'Updated' });
      expect(result).toEqual(updated);
      expect(mockStorage.get('user')).toBe(JSON.stringify(updated));
    });
  });

  describe('changePassword', () => {
    it('calls the change password endpoint with current and new passwords', async () => {
      mockPost.mockResolvedValueOnce(undefined);

      await authService.changePassword('oldPass', 'newPass');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/admin/change-password', {
        currentPassword: 'oldPass',
        newPassword: 'newPass',
      });
    });
  });

  describe('getPermissions', () => {
    it('returns the permissions array from the API', async () => {
      mockGet.mockResolvedValueOnce({ permissions: ['users:read', 'users:write'] });

      const perms = await authService.getPermissions();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/permissions');
      expect(perms).toEqual(['users:read', 'users:write']);
    });

    it('returns empty array when the API call fails', async () => {
      mockGet.mockRejectedValueOnce(new Error('Forbidden'));

      const perms = await authService.getPermissions();

      expect(perms).toEqual([]);
    });
  });

  describe('verifySession', () => {
    it('returns true when session is valid', async () => {
      mockGet.mockResolvedValueOnce({});

      expect(await authService.verifySession()).toBe(true);
    });

    it('returns false when session verification fails', async () => {
      mockGet.mockRejectedValueOnce(new Error('Unauthorized'));

      expect(await authService.verifySession()).toBe(false);
    });
  });

  describe('impersonateUser', () => {
    it('calls impersonate endpoint and stores impersonation state', async () => {
      const impersonatedUser = { ...fakeUser, userId: 'u2', userType: 'adopter' as const };
      mockStorage.set('user', JSON.stringify({ ...fakeUser, userType: 'super_admin' }));
      mockPost.mockResolvedValueOnce({ user: impersonatedUser });

      await authService.impersonateUser('u2');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/impersonate', { userId: 'u2' });
      expect(mockStorage.get('impersonating')).toBe('true');
      expect(mockStorage.get('user')).toBe(JSON.stringify(impersonatedUser));
    });

    it('throws when the current user is not a super admin', async () => {
      mockStorage.set('user', JSON.stringify(fakeUser));

      await expect(authService.impersonateUser('u2')).rejects.toThrow(
        'Only super admins can impersonate users'
      );
    });
  });

  describe('stopImpersonation', () => {
    it('clears impersonation state and refreshes user from server', async () => {
      mockStorage.set('impersonating', 'true');
      mockPost.mockResolvedValueOnce(undefined);
      mockGet.mockResolvedValueOnce(fakeUser);

      await authService.stopImpersonation();

      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/impersonate/stop', {});
      expect(mockStorage.has('impersonating')).toBe(false);
      expect(mockStorage.get('user')).toBe(JSON.stringify(fakeUser));
    });
  });

  describe('isImpersonating', () => {
    it('returns true when impersonating flag is set', () => {
      mockStorage.set('impersonating', 'true');

      expect(authService.isImpersonating()).toBe(true);
    });

    it('returns false when impersonating flag is not set', () => {
      expect(authService.isImpersonating()).toBe(false);
    });
  });
});
