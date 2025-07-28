/**
 * Configuration options for PermissionsService
 */
export interface PermissionsServiceConfig {
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * User role types in the system
 */
export type UserRole = 'adopter' | 'rescue_staff' | 'admin' | 'moderator';

/**
 * Permission action types
 */
export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'archive'
  | 'feature'
  | 'publish'
  | 'approve'
  | 'reject'
  | 'review'
  | 'verify'
  | 'suspend'
  | 'moderate';

/**
 * Resource types in the system
 */
export type PermissionResource =
  | 'users'
  | 'pets'
  | 'applications'
  | 'rescues'
  | 'chats'
  | 'messages'
  | 'ratings'
  | 'admin'
  | 'moderation'
  | 'emails'
  | 'notifications';

/**
 * Permission string format: resource.action
 */
export type Permission =
  | `${PermissionResource}.${PermissionAction}`
  | 'admin.dashboard'
  | 'admin.reports'
  | 'admin.audit_logs'
  | 'admin.system_settings'
  | 'admin.feature_flags'
  | 'moderation.reports.review'
  | 'moderation.users.suspend'
  | 'moderation.content.moderate'
  | 'emails.templates.create'
  | 'emails.templates.update'
  | 'emails.templates.delete'
  | 'emails.send'
  | 'emails.queue.manage'
  | 'users.profile.update';

/**
 * User with permissions
 */
export interface UserWithPermissions {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserRole;
  status: string;
  permissions: Permission[];
}

/**
 * Permission check request
 */
export interface PermissionCheckRequest {
  userId: string;
  permission: Permission;
  resourceId?: string;
  context?: Record<string, unknown>;
}

/**
 * Role assignment request
 */
export interface RoleAssignmentRequest {
  userId: string;
  role: UserRole;
  assignedBy: string;
  reason?: string;
}

/**
 * Permission grant request
 */
export interface PermissionGrantRequest {
  userId: string;
  permissions: Permission[];
  grantedBy: string;
  expiresAt?: string;
  reason?: string;
}

/**
 * Permission audit log entry
 */
export interface PermissionAuditLog {
  logId: string;
  userId: string;
  action: 'granted' | 'revoked' | 'checked' | 'denied';
  permission: Permission;
  resourceId?: string;
  performedBy: string;
  context?: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Base response interface
 */
export interface BaseResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * API Response types for permissions service
 */
export interface PermissionCheckResponse {
  hasPermission: boolean;
  reason?: string;
}

export interface UserPermissionsResponse {
  permissions: Permission[];
}

export interface AuditLogsResponse {
  logs: PermissionAuditLog[];
  total: number;
}

export interface SystemPermissionsResponse {
  permissions: Permission[];
}

