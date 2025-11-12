import { ApiService } from '@adopt-dont-shop/lib-api';
import {
  PermissionsServiceConfig,
  Permission,
  UserRole,
  UserWithPermissions,
  PermissionCheckRequest,
  RoleAssignmentRequest,
  PermissionGrantRequest,
  PermissionAuditLog,
  PermissionCheckResponse,
  UserPermissionsResponse,
  AuditLogsResponse,
  SystemPermissionsResponse,
} from '../types';

/**
 * PermissionsService - Handles role-based access control and permissions
 */
export class PermissionsService {
  private config: PermissionsServiceConfig;
  private apiService: ApiService;
  private permissionsCache = new Map<string, { permissions: Permission[]; expires: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<PermissionsServiceConfig> = {}, apiService?: ApiService) {
    this.config = {
      debug: false,
      ...config,
    };

    this.apiService = apiService || new ApiService();

    if (this.config.debug) {
      console.log(`${PermissionsService.name} initialized with config:`, this.config);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): PermissionsServiceConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  public updateConfig(updates: Partial<PermissionsServiceConfig>): void {
    this.config = { ...this.config, ...updates };

    if (this.config.debug) {
      console.log(`${PermissionsService.name} config updated:`, this.config);
    }
  }

  /**
   * Check if a user has a specific permission
   */
  public async hasPermission(
    userId: string,
    permission: Permission,
    resourceId?: string
  ): Promise<boolean> {
    try {
      const request: PermissionCheckRequest = {
        userId,
        permission,
        resourceId,
      };

      const response = (await this.apiService.post(
        '/api/v1/permissions/check',
        request
      )) as PermissionCheckResponse;

      if (this.config.debug) {
        console.log(`Permission check for ${userId}: ${permission} = ${response.hasPermission}`);
      }

      return response.hasPermission;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Permission check failed for ${userId}:`, error);
      }
      return false; // Deny access on error
    }
  }

  /**
   * Check if a user has any of the specified permissions
   */
  public async hasAnyPermission(
    userId: string,
    permissions: Permission[],
    resourceId?: string
  ): Promise<boolean> {
    try {
      const checks = await Promise.all(
        permissions.map((permission) => this.hasPermission(userId, permission, resourceId))
      );

      return checks.some((hasPermission) => hasPermission);
    } catch (error) {
      if (this.config.debug) {
        console.error(`Bulk permission check failed for ${userId}:`, error);
      }
      return false;
    }
  }

  /**
   * Check if a user has all of the specified permissions
   */
  public async hasAllPermissions(
    userId: string,
    permissions: Permission[],
    resourceId?: string
  ): Promise<boolean> {
    try {
      const checks = await Promise.all(
        permissions.map((permission) => this.hasPermission(userId, permission, resourceId))
      );

      return checks.every((hasPermission) => hasPermission);
    } catch (error) {
      if (this.config.debug) {
        console.error(`Bulk permission check failed for ${userId}:`, error);
      }
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  public async getUserPermissions(userId: string, useCache = true): Promise<Permission[]> {
    // Check cache first
    if (useCache) {
      const cached = this.permissionsCache.get(userId);
      if (cached && Date.now() < cached.expires) {
        if (this.config.debug) {
          console.log(`Retrieved cached permissions for ${userId}`);
        }
        return cached.permissions;
      }
    }

    try {
      const response = (await this.apiService.get(
        `/api/v1/users/${userId}/permissions`
      )) as UserPermissionsResponse;
      const permissions: Permission[] = response.permissions || [];

      // Cache the permissions
      if (useCache) {
        this.permissionsCache.set(userId, {
          permissions,
          expires: Date.now() + this.cacheTimeout,
        });
      }

      if (this.config.debug) {
        console.log(`Retrieved ${permissions.length} permissions for ${userId}`);
      }

      return permissions;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Failed to get permissions for ${userId}:`, error);
      }
      return [];
    }
  }

  /**
   * Get user with their permissions
   */
  public async getUserWithPermissions(userId: string): Promise<UserWithPermissions | null> {
    try {
      const response = (await this.apiService.get(
        `/api/v1/users/${userId}/with-permissions`
      )) as UserWithPermissions;

      if (this.config.debug) {
        console.log(`Retrieved user with permissions: ${userId}`);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Failed to get user with permissions ${userId}:`, error);
      }
      return null;
    }
  }

  /**
   * Check if a user has a specific role
   */
  public async hasRole(userId: string, role: UserRole): Promise<boolean> {
    try {
      const user = await this.getUserWithPermissions(userId);
      return user?.userType === role || false;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Role check failed for ${userId}:`, error);
      }
      return false;
    }
  }

  /**
   * Check if a user has any of the specified roles
   */
  public async hasAnyRole(userId: string, roles: UserRole[]): Promise<boolean> {
    try {
      const user = await this.getUserWithPermissions(userId);
      return user ? roles.includes(user.userType) : false;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Bulk role check failed for ${userId}:`, error);
      }
      return false;
    }
  }

  /**
   * Assign a role to a user (admin only)
   */
  public async assignRole(request: RoleAssignmentRequest): Promise<boolean> {
    try {
      await this.apiService.post('/api/v1/users/assign-role', request);

      // Clear cache for the user
      this.permissionsCache.delete(request.userId);

      if (this.config.debug) {
        console.log(`Role ${request.role} assigned to user ${request.userId}`);
      }

      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Failed to assign role to ${request.userId}:`, error);
      }
      throw error;
    }
  }

  /**
   * Grant specific permissions to a user (admin only)
   */
  public async grantPermissions(request: PermissionGrantRequest): Promise<boolean> {
    try {
      await this.apiService.post('/api/v1/users/grant-permissions', request);

      // Clear cache for the user
      this.permissionsCache.delete(request.userId);

      if (this.config.debug) {
        console.log(`Granted ${request.permissions.length} permissions to user ${request.userId}`);
      }

      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Failed to grant permissions to ${request.userId}:`, error);
      }
      throw error;
    }
  }

  /**
   * Revoke specific permissions from a user (admin only)
   */
  public async revokePermissions(
    userId: string,
    permissions: Permission[],
    revokedBy: string,
    reason?: string
  ): Promise<boolean> {
    try {
      await this.apiService.post('/api/v1/users/revoke-permissions', {
        userId,
        permissions,
        revokedBy,
        reason,
      });

      // Clear cache for the user
      this.permissionsCache.delete(userId);

      if (this.config.debug) {
        console.log(`Revoked ${permissions.length} permissions from user ${userId}`);
      }

      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Failed to revoke permissions from ${userId}:`, error);
      }
      throw error;
    }
  }

  /**
   * Get permission audit logs
   */
  public async getAuditLogs(
    userId?: string,
    limit = 50,
    offset = 0
  ): Promise<PermissionAuditLog[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (userId) {
        params.append('userId', userId);
      }

      const response = (await this.apiService.get(
        `/api/v1/permissions/audit-logs?${params}`
      )) as AuditLogsResponse;

      if (this.config.debug) {
        console.log(`Retrieved ${response.logs?.length || 0} audit log entries`);
      }

      return response.logs || [];
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get audit logs:', error);
      }
      return [];
    }
  }

  /**
   * Clear permissions cache for a user or all users
   */
  public clearCache(userId?: string): void {
    if (userId) {
      this.permissionsCache.delete(userId);
      if (this.config.debug) {
        console.log(`Cleared permissions cache for user ${userId}`);
      }
    } else {
      this.permissionsCache.clear();
      if (this.config.debug) {
        console.log('Cleared all permissions cache');
      }
    }
  }

  /**
   * Get all available permissions in the system
   */
  public async getAllPermissions(): Promise<Permission[]> {
    try {
      const response = (await this.apiService.get(
        '/api/v1/permissions/list'
      )) as SystemPermissionsResponse;

      if (this.config.debug) {
        console.log(`Retrieved ${response.permissions?.length || 0} system permissions`);
      }

      return response.permissions || [];
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get system permissions:', error);
      }
      return [];
    }
  }

  /**
   * Check if the permissions service is healthy
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.apiService.get('/api/v1/permissions/health');
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error('Permissions service health check failed:', error);
      }
      return false;
    }
  }
}
