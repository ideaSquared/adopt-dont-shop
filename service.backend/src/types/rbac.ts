import { UserType } from '../models/User';
import { JsonValue } from './common';

// Core RBAC Types
export interface Permission {
  permission_id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Role {
  role_id: string;
  name: string;
  description?: string;
  permissions?: Permission[];
  created_at: Date;
  updated_at: Date;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  assigned_at: Date;
  assigned_by: string;
  expires_at?: Date;
}

// Permission Definitions
export const PERMISSIONS = {
  // User Management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_READ_OWN: 'user:read:own',
  USER_UPDATE_OWN: 'user:update:own',

  // Pet Management
  PET_CREATE: 'pet:create',
  PET_READ: 'pet:read',
  PET_UPDATE: 'pet:update',
  PET_DELETE: 'pet:delete',
  PET_MANAGE_OWN: 'pet:manage:own',

  // Application Management
  APPLICATION_CREATE: 'application:create',
  APPLICATION_READ: 'application:read',
  APPLICATION_UPDATE: 'application:update',
  APPLICATION_DELETE: 'application:delete',
  APPLICATION_MANAGE_OWN: 'application:manage:own',
  APPLICATION_APPROVE: 'application:approve',
  APPLICATION_REJECT: 'application:reject',

  // Rescue Management
  RESCUE_CREATE: 'rescue:create',
  RESCUE_READ: 'rescue:read',
  RESCUE_UPDATE: 'rescue:update',
  RESCUE_DELETE: 'rescue:delete',
  RESCUE_MANAGE_OWN: 'rescue:manage:own',

  // Chat/Communication
  CHAT_CREATE: 'chat:create',
  CHAT_READ: 'chat:read',
  CHAT_UPDATE: 'chat:update',
  CHAT_DELETE: 'chat:delete',
  CHAT_PARTICIPATE: 'chat:participate',

  // Admin Functions
  ADMIN_PANEL: 'admin:panel',
  ADMIN_USERS: 'admin:users',
  ADMIN_REPORTS: 'admin:reports',
  ADMIN_SYSTEM: 'admin:system',

  // System
  AUDIT_LOG_READ: 'audit:read',
  FEATURE_FLAG_MANAGE: 'feature:manage',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Resource Types
export type ResourceType =
  | 'user'
  | 'pet'
  | 'application'
  | 'rescue'
  | 'chat'
  | 'message'
  | 'admin'
  | 'audit'
  | 'feature_flag';

export type ActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'manage'
  | 'approve'
  | 'reject'
  | 'participate';

// Access Control Types
export interface AccessControlContext {
  userId: string;
  userType: UserType;
  roles: Role[];
  permissions: Permission[];
  resourceId?: string;
  resourceType?: ResourceType;
  action: ActionType;
}

export interface AccessControlResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: PermissionName[];
}

// Role Management Types
export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface AssignRoleRequest {
  user_id: string;
  role_id: string;
  expires_at?: Date;
}

export interface RoleAssignment {
  user_id: string;
  role_id: string;
  role_name: string;
  assigned_at: Date;
  assigned_by: string;
  expires_at?: Date;
  is_active: boolean;
}

// Permission Management Types
export interface CreatePermissionRequest {
  name: string;
  resource: ResourceType;
  action: ActionType;
  description?: string;
}

export interface UpdatePermissionRequest {
  name?: string;
  description?: string;
}

export interface PermissionCheck {
  permission: PermissionName;
  resource?: string;
  action?: ActionType;
}

// Role Hierarchy Types
export interface RoleHierarchy {
  parent_role: string;
  child_role: string;
  created_at: Date;
}

export interface RoleInheritance {
  role_id: string;
  inherited_permissions: Permission[];
  direct_permissions: Permission[];
  all_permissions: Permission[];
}

// Permission Groups
export interface PermissionGroup {
  group_id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  created_at: Date;
  updated_at: Date;
}

// Security Policy Types
export interface SecurityPolicy {
  policy_id: string;
  name: string;
  description?: string;
  rules: PolicyRule[];
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PolicyRule {
  rule_id: string;
  resource: ResourceType;
  action: ActionType;
  conditions: PolicyCondition[];
  effect: 'allow' | 'deny';
  priority: number;
}

export interface PolicyCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: JsonValue;
}

// Middleware Types
export interface RBACMiddlewareOptions {
  permissions?: PermissionName[];
  roles?: UserType[];
  requireAll?: boolean;
  checkOwnership?: boolean;
  resourceParam?: string;
}

// Audit Types for RBAC
export interface RBACauditLog {
  audit_id: string;
  user_id: string;
  action: 'permission_check' | 'role_assign' | 'permission_grant' | 'access_denied';
  resource: ResourceType;
  resource_id?: string;
  permission: PermissionName;
  result: 'allowed' | 'denied';
  reason?: string;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
}

// Permission Cache Types
export interface PermissionCache {
  user_id: string;
  permissions: Set<PermissionName>;
  roles: Set<string>;
  last_updated: Date;
  expires_at: Date;
}

// Authorization Helper Types
export interface AuthorizationHelper {
  hasPermission(permission: PermissionName): boolean;
  hasRole(role: UserType): boolean;
  hasAnyPermission(permissions: PermissionName[]): boolean;
  hasAllPermissions(permissions: PermissionName[]): boolean;
  canAccess(resource: ResourceType, action: ActionType): boolean;
  ownsResource(resourceId: string): boolean;
}
