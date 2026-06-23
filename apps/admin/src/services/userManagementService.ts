import type { BulkUserUpdateData } from '@adopt-dont-shop/lib.validation';
import { apiService } from './libraryServices';
import { User, PaginatedResponse } from '@/types';

// User management types - exported for use in hooks
export interface UserFilters {
  userType?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  created_from?: string;
  created_to?: string;
}

export type AdminCreateRole =
  | 'admin'
  | 'moderator'
  | 'super_admin'
  | 'support_agent'
  | 'rescue_staff'
  | 'adopter';

export interface CreateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  role: AdminCreateRole;
  is_active?: boolean;
  send_invitation?: boolean;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  role?: AdminCreateRole;
  is_active?: boolean;
}

/**
 * User Management Service for Admin App
 *
 * Provides comprehensive user management functionality for administrators.
 * Includes user creation, modification, role management, and analytics.
 */
class UserManagementService {
  /**
   * Get all users with filters and pagination
   */
  async getUsers(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    try {
      return await apiService.get<PaginatedResponse<User>>('/api/v1/admin/users', filters);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a specific user by ID
   */
  async getUserById(userId: string): Promise<User> {
    try {
      return await apiService.get<User>(`/api/v1/admin/users/${userId}`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      return await apiService.post<User>('/api/v1/admin/users', userData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    try {
      return await apiService.patch<User>(`/api/v1/admin/users/${userId}`, userData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Suspend a user
   */
  async suspendUser(userId: string, reason?: string): Promise<User> {
    try {
      return await apiService.patch<User>(`/api/v1/admin/users/${userId}/action`, {
        action: 'suspend',
        reason,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Unsuspend a user
   */
  async unsuspendUser(userId: string): Promise<User> {
    try {
      return await apiService.patch<User>(`/api/v1/admin/users/${userId}/action`, {
        action: 'unsuspend',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify a user
   */
  async verifyUser(userId: string): Promise<User> {
    try {
      return await apiService.patch<User>(`/api/v1/admin/users/${userId}/action`, {
        action: 'verify',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a user (soft delete)
   */
  async deleteUser(userId: string, reason?: string): Promise<void> {
    try {
      await apiService.patch<void>(`/api/v1/admin/users/${userId}/action`, {
        action: 'delete',
        reason,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId: string): Promise<{ temporary_password: string }> {
    try {
      return await apiService.post<{ temporary_password: string }>(
        `/api/v1/admin/users/${userId}/reset-password`
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk update users
   *
   * Hits the backend bulk endpoint (`POST /api/v1/users/bulk-update`) with the
   * shape defined by `BulkUserUpdateRequestSchema` in lib.validation:
   * `{ userIds, updateData, reason }`. The backend's `updateData` schema is
   * strict — only `status` is accepted — so callers translate UI-level intent
   * (activate/deactivate) into a `status` value here.
   */
  async bulkUpdateUsers(
    userIds: string[],
    updateData: BulkUserUpdateData,
    reason?: string
  ): Promise<{ success: number; failed: number }> {
    try {
      // ADS-651: forward the operator-supplied reason so the backend
      // bulk endpoint can persist it against each affected user's audit row.
      return await apiService.post('/api/v1/users/bulk-update', {
        userIds,
        updateData,
        reason,
      });
    } catch (error) {
      throw error;
    }
  }
}

export const userManagementService = new UserManagementService();
