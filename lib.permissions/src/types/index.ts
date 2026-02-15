// Re-export all RBAC types from the shared types package.
// lib.types is the source of truth; lib.permissions re-exports for
// backwards compatibility so existing frontend consumers don't break.
export type {
  PermissionsServiceConfig,
  UserRole,
  PermissionAction,
  PermissionResource,
  Permission,
  UserWithPermissions,
  PermissionCheckRequest,
  RoleAssignmentRequest,
  PermissionGrantRequest,
  PermissionAuditLog,
  BaseResponse,
  ErrorResponse,
  PaginatedResponse,
  PermissionCheckResponse,
  UserPermissionsResponse,
  AuditLogsResponse,
  SystemPermissionsResponse,
} from '@adopt-dont-shop/lib.types';
