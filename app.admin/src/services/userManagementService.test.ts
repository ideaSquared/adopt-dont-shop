import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('./libraryServices', () => ({
  apiService: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

import { userManagementService } from './userManagementService';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fakeUser = {
  userId: 'u1',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  userType: 'adopter' as const,
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

const paginatedUsers = {
  data: [fakeUser],
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UserManagementService', () => {
  describe('getUsers', () => {
    it('fetches users with default empty filters', async () => {
      mockGet.mockResolvedValueOnce(paginatedUsers);

      const result = await userManagementService.getUsers();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/users', {});
      expect(result).toEqual(paginatedUsers);
    });

    it('forwards pagination and filter params', async () => {
      mockGet.mockResolvedValueOnce(paginatedUsers);

      await userManagementService.getUsers({ page: 2, limit: 25, status: 'active', search: 'jo' });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/users', {
        page: 2,
        limit: 25,
        status: 'active',
        search: 'jo',
      });
    });

    it('re-throws errors from the API', async () => {
      mockGet.mockRejectedValueOnce(new Error('Server error'));

      await expect(userManagementService.getUsers()).rejects.toThrow('Server error');
    });
  });

  describe('getUserById', () => {
    it('fetches a single user by ID', async () => {
      mockGet.mockResolvedValueOnce(fakeUser);

      const result = await userManagementService.getUserById('u1');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/users/u1');
      expect(result).toEqual(fakeUser);
    });

    it('re-throws when the user is not found', async () => {
      mockGet.mockRejectedValueOnce(new Error('Not found'));

      await expect(userManagementService.getUserById('bad-id')).rejects.toThrow('Not found');
    });
  });

  describe('createUser', () => {
    it('posts new user data to the correct endpoint', async () => {
      mockPost.mockResolvedValueOnce(fakeUser);

      const result = await userManagementService.createUser({
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'adopter',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/users', {
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'adopter',
      });
      expect(result).toEqual(fakeUser);
    });
  });

  describe('updateUser', () => {
    it('patches user data at the correct endpoint', async () => {
      const updated = { ...fakeUser, firstName: 'Jane' };
      mockPatch.mockResolvedValueOnce(updated);

      const result = await userManagementService.updateUser('u1', { first_name: 'Jane' });

      expect(mockPatch).toHaveBeenCalledWith('/api/v1/admin/users/u1', { first_name: 'Jane' });
      expect(result).toEqual(updated);
    });
  });

  describe('suspendUser', () => {
    it('sends a suspend action with a reason', async () => {
      mockPatch.mockResolvedValueOnce({ ...fakeUser, status: 'suspended' });

      const result = await userManagementService.suspendUser('u1', 'Policy violation');

      expect(mockPatch).toHaveBeenCalledWith('/api/v1/admin/users/u1/action', {
        action: 'suspend',
        reason: 'Policy violation',
      });
      expect(result.status).toBe('suspended');
    });

    it('sends a suspend action without a reason', async () => {
      mockPatch.mockResolvedValueOnce({ ...fakeUser, status: 'suspended' });

      await userManagementService.suspendUser('u1');

      expect(mockPatch).toHaveBeenCalledWith('/api/v1/admin/users/u1/action', {
        action: 'suspend',
        reason: undefined,
      });
    });
  });

  describe('unsuspendUser', () => {
    it('sends an unsuspend action', async () => {
      mockPatch.mockResolvedValueOnce({ ...fakeUser, status: 'active' });

      const result = await userManagementService.unsuspendUser('u1');

      expect(mockPatch).toHaveBeenCalledWith('/api/v1/admin/users/u1/action', {
        action: 'unsuspend',
      });
      expect(result.status).toBe('active');
    });
  });

  describe('verifyUser', () => {
    it('sends a verify action', async () => {
      mockPatch.mockResolvedValueOnce({ ...fakeUser, emailVerified: true });

      await userManagementService.verifyUser('u1');

      expect(mockPatch).toHaveBeenCalledWith('/api/v1/admin/users/u1/action', {
        action: 'verify',
      });
    });
  });

  describe('deleteUser', () => {
    it('sends a delete action with a reason', async () => {
      mockPatch.mockResolvedValueOnce(undefined);

      await userManagementService.deleteUser('u1', 'Spam account');

      expect(mockPatch).toHaveBeenCalledWith('/api/v1/admin/users/u1/action', {
        action: 'delete',
        reason: 'Spam account',
      });
    });

    it('sends a delete action without a reason', async () => {
      mockPatch.mockResolvedValueOnce(undefined);

      await userManagementService.deleteUser('u1');

      expect(mockPatch).toHaveBeenCalledWith('/api/v1/admin/users/u1/action', {
        action: 'delete',
        reason: undefined,
      });
    });
  });

  describe('resetUserPassword', () => {
    it('calls the reset-password endpoint and returns the temporary password', async () => {
      mockPost.mockResolvedValueOnce({ temporary_password: 'tmp123' });

      const result = await userManagementService.resetUserPassword('u1');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/users/u1/reset-password');
      expect(result).toEqual({ temporary_password: 'tmp123' });
    });
  });

  describe('getUserActivity', () => {
    it('fetches activity with filters', async () => {
      const activities = [
        {
          activityId: 1,
          activityType: 'login',
          action: 'USER_LOGIN',
          description: 'Logged into account',
          category: 'AUTH',
          ipAddress: null,
          userAgent: null,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      mockGet.mockResolvedValueOnce({ success: true, data: activities });

      const result = await userManagementService.getUserActivity('u1', { limit: 10 });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/users/u1/activity', { limit: 10 });
      expect(result).toEqual(activities);
    });
  });

  describe('searchUsers', () => {
    it('passes query and filters to the search endpoint', async () => {
      mockGet.mockResolvedValueOnce(paginatedUsers);

      const result = await userManagementService.searchUsers('john', { page: 1, limit: 10 });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/users/search', {
        query: 'john',
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(paginatedUsers);
    });
  });

  describe('getUserStats', () => {
    it('fetches user statistics', async () => {
      const stats = {
        total_users: 100,
        active_users: 80,
        inactive_users: 20,
        by_role: { adopter: 60, admin: 5 },
        recent_registrations: 12,
      };
      mockGet.mockResolvedValueOnce(stats);

      const result = await userManagementService.getUserStats();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/users/stats');
      expect(result).toEqual(stats);
    });
  });

  describe('bulkUpdateUsers', () => {
    it('posts bulk update with userIds, updateData, and reason', async () => {
      mockPost.mockResolvedValueOnce({ success: 2, failed: 0 });

      const result = await userManagementService.bulkUpdateUsers(
        ['u1', 'u2'],
        { status: 'suspended' },
        'Policy violations'
      );

      expect(mockPost).toHaveBeenCalledWith('/api/v1/users/bulk-update', {
        userIds: ['u1', 'u2'],
        updateData: { status: 'suspended' },
        reason: 'Policy violations',
      });
      expect(result).toEqual({ success: 2, failed: 0 });
    });

    it('posts bulk update without a reason', async () => {
      mockPost.mockResolvedValueOnce({ success: 1, failed: 0 });

      await userManagementService.bulkUpdateUsers(['u1'], { status: 'active' });

      expect(mockPost).toHaveBeenCalledWith('/api/v1/users/bulk-update', {
        userIds: ['u1'],
        updateData: { status: 'active' },
        reason: undefined,
      });
    });
  });

  describe('exportUsers', () => {
    it('calls the export endpoint with format param', async () => {
      const blob = new Blob(['data'], { type: 'text/csv' });
      mockGet.mockResolvedValueOnce(blob);

      const result = await userManagementService.exportUsers({ status: 'active' }, 'csv');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/users/export', {
        status: 'active',
        format: 'csv',
      });
      expect(result).toBe(blob);
    });

    it('defaults to csv format', async () => {
      const blob = new Blob(['data']);
      mockGet.mockResolvedValueOnce(blob);

      await userManagementService.exportUsers();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/users/export', { format: 'csv' });
    });
  });

  describe('sendNotification', () => {
    it('posts a notification to the correct user endpoint', async () => {
      mockPost.mockResolvedValueOnce(undefined);

      await userManagementService.sendNotification('u1', {
        title: 'Hello',
        message: 'Welcome!',
        type: 'info',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/users/u1/notifications', {
        title: 'Hello',
        message: 'Welcome!',
        type: 'info',
      });
    });
  });

  describe('getUserRescues', () => {
    it('fetches rescues associated with a user', async () => {
      const rescues = [
        { rescue_id: 'r1', rescue_name: 'Happy Paws', role: 'staff', joined_at: '2024-01-01' },
      ];
      mockGet.mockResolvedValueOnce(rescues);

      const result = await userManagementService.getUserRescues('u1');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/users/u1/rescues');
      expect(result).toEqual(rescues);
    });
  });

  describe('getUserApplications', () => {
    it('fetches adoption applications for a user', async () => {
      const apps = [
        {
          application_id: 'app1',
          pet_name: 'Buddy',
          rescue_name: 'Happy Paws',
          status: 'pending',
          created_at: '2024-01-01',
        },
      ];
      mockGet.mockResolvedValueOnce(apps);

      const result = await userManagementService.getUserApplications('u1');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/users/u1/applications');
      expect(result).toEqual(apps);
    });
  });
});
