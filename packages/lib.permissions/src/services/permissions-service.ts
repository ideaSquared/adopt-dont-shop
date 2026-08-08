import { ApiService } from '@adopt-dont-shop/lib.api';
import {
  PermissionsServiceConfig,
  Permission,
  UserRole,
  UserWithPermissions,
  RoleAssignmentRequest,
  PermissionAuditLog,
} from '../types';

const MAX_PERMISSIONS_CACHE_SIZE = 500;

// The gateway serves a user's permission list wrapped in the standard
// `{ success, data }` envelope (GET /api/v1/users/:id/permissions →
// `{ data: { permissions } }`). Older/simpler responses put `permissions`
// at the top level, so we accept either shape.
type UserPermissionsPayload = {
  permissions?: Permission[];
  data?: { permissions?: Permission[] };
};

// Narrow an unknown value to a plain record for safe property access —
// mirrors the guard style used by FieldPermissionsService.
const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

// Map an audit event's domain action verb onto the PermissionAuditLog
// action union. Unknown verbs fall back to 'checked'.
const toAuditAction = (action: string): PermissionAuditLog['action'] => {
  const lower = action.toLowerCase();
  if (lower.includes('revoke')) {
    return 'revoked';
  }
  if (lower.includes('grant') || lower.includes('assign')) {
    return 'granted';
  }
  if (lower.includes('den')) {
    return 'denied';
  }
  return 'checked';
};

// Adapt one audit-service event (audit.Query response) into the
// PermissionAuditLog shape the frontend consumes.
const toPermissionAuditLog = (event: unknown): PermissionAuditLog => {
  const rec = asRecord(event);
  const ipAddress = rec['ipAddress'];
  const userAgent = rec['userAgent'];
  return {
    logId: asString(rec['eventId']),
    userId: asString(rec['aggregateId']),
    action: toAuditAction(asString(rec['action'])),
    // The role-based model records domain actions, not per-permission
    // grants, so there is no literal Permission on an audit event. We
    // surface the event's subject in the `permission` slot so the log
    // shape stays populated for display.
    permission: asString(rec['subject']) as Permission,
    performedBy: asString(rec['actorUserId']),
    timestamp: asString(rec['occurredAt']),
    ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
    userAgent: typeof userAgent === 'string' ? userAgent : undefined,
  };
};

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
  }

  /**
   * Check if a user has a specific permission.
   *
   * In the role-based model permissions are derived from the user's role,
   * so a membership test against the user's flattened permission set is
   * authoritative — no server round-trip beyond fetching that set (which
   * is cached).
   */
  public async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  /**
   * Check if a user has any of the specified permissions
   */
  public async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    if (permissions.length === 0) {
      return false;
    }
    const granted = await this.getUserPermissions(userId);
    return permissions.some((permission) => granted.includes(permission));
  }

  /**
   * Check if a user has all of the specified permissions
   */
  public async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    if (permissions.length === 0) {
      return true;
    }
    const granted = await this.getUserPermissions(userId);
    return permissions.every((permission) => granted.includes(permission));
  }

  /**
   * Get all permissions for a user
   */
  public async getUserPermissions(userId: string, useCache = true): Promise<Permission[]> {
    // Check cache first
    if (useCache) {
      const cached = this.permissionsCache.get(userId);
      if (cached && Date.now() < cached.expires) {
        return cached.permissions;
      }
    }

    try {
      const response = (await this.apiService.get(
        `/api/v1/users/${userId}/permissions`
      )) as UserPermissionsPayload;
      const permissions: Permission[] = response.data?.permissions ?? response.permissions ?? [];

      // Cache the permissions; evict oldest entry if at capacity
      if (useCache) {
        if (this.permissionsCache.size >= MAX_PERMISSIONS_CACHE_SIZE) {
          const oldestKey = this.permissionsCache.keys().next().value;
          if (oldestKey !== undefined) {
            this.permissionsCache.delete(oldestKey);
          }
        }
        this.permissionsCache.set(userId, {
          permissions,
          expires: Date.now() + this.cacheTimeout,
        });
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
      await this.apiService.post('/api/v1/auth/assign-role', {
        targetUserId: request.userId,
        role: request.role,
        reason: request.reason,
      });

      // Clear cache for the user
      this.permissionsCache.delete(request.userId);

      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Failed to assign role to ${request.userId}:`, error);
      }
      throw error;
    }
  }

  /**
   * Get permission audit logs.
   *
   * Backed by the audit service (GET /api/v1/audit). When a userId is
   * supplied we scope to events that user triggered; the audit events are
   * adapted into the PermissionAuditLog shape.
   */
  public async getAuditLogs(userId?: string, limit = 50): Promise<PermissionAuditLog[]> {
    try {
      const params: Record<string, string | number> = { limit };
      if (userId) {
        params.actor_user_id = userId;
      }

      const response = (await this.apiService.get('/api/v1/audit', params)) as { events?: unknown };
      const events = Array.isArray(response.events) ? response.events : [];

      return events.map(toPermissionAuditLog);
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
    } else {
      this.permissionsCache.clear();
    }
  }

  /**
   * Check if the permissions service is healthy
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.apiService.get('/health/ready');
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error('Permissions service health check failed:', error);
      }
      return false;
    }
  }
}
