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
  USER_CREATE: 'users.create',
  USER_READ: 'users.read',
  USER_UPDATE: 'users.update',
  USER_DELETE: 'users.delete',
  USER_READ_OWN: 'users.read.own',
  USER_UPDATE_OWN: 'users.update.own',

  // Pet Management
  PET_CREATE: 'pets.create',
  PET_READ: 'pets.read',
  PET_UPDATE: 'pets.update',
  PET_DELETE: 'pets.delete',
  PET_MANAGE_OWN: 'pets.manage.own',

  // Application Management
  APPLICATION_CREATE: 'applications.create',
  APPLICATION_READ: 'applications.read',
  APPLICATION_UPDATE: 'applications.update',
  APPLICATION_DELETE: 'applications.delete',
  APPLICATION_MANAGE_OWN: 'applications.manage.own',
  APPLICATION_APPROVE: 'applications.approve',
  APPLICATION_REJECT: 'applications.reject',

  // Rescue Management
  RESCUE_CREATE: 'rescues.create',
  RESCUE_READ: 'rescues.read',
  RESCUE_UPDATE: 'rescues.update',
  RESCUE_DELETE: 'rescues.delete',
  RESCUE_MANAGE_OWN: 'rescues.manage.own',

  // Chat/Communication
  CHAT_CREATE: 'chats.create',
  CHAT_READ: 'chats.read',
  CHAT_UPDATE: 'chats.update',
  CHAT_DELETE: 'chats.delete',
  CHAT_PARTICIPATE: 'chats.participate',

  // Support Ticket Management
  SUPPORT_TICKET_CREATE: 'support_tickets.create',
  SUPPORT_TICKET_READ: 'support_tickets.read',
  SUPPORT_TICKET_UPDATE: 'support_tickets.update',
  SUPPORT_TICKET_DELETE: 'support_tickets.delete',
  SUPPORT_TICKET_ASSIGN: 'support_tickets.assign',
  SUPPORT_TICKET_ESCALATE: 'support_tickets.escalate',
  SUPPORT_TICKET_REPLY: 'support_tickets.reply',
  SUPPORT_TICKET_MANAGE_OWN: 'support_tickets.manage_own',
  SUPPORT_TICKET_LIST: 'support_tickets.list',

  // Admin Management
  ADMIN_PANEL: 'admin.panel',
  ADMIN_USERS: 'admin.users',
  ADMIN_REPORTS: 'admin.reports',
  ADMIN_SYSTEM: 'admin.system',
  ADMIN_METRICS_READ: 'admin.metrics.read',
  ADMIN_ANALYTICS_READ: 'admin.analytics.read',
  ADMIN_SYSTEM_HEALTH_READ: 'admin.system.health.read',
  ADMIN_CONFIG_READ: 'admin.config.read',
  ADMIN_CONFIG_UPDATE: 'admin.config.update',
  ADMIN_USER_SEARCH: 'admin.users.search',
  ADMIN_USER_READ: 'admin.users.read',
  ADMIN_USER_UPDATE: 'admin.users.update',
  ADMIN_USER_ROLE_UPDATE: 'admin.users.role.update',
  ADMIN_USER_DEACTIVATE: 'admin.users.deactivate',
  ADMIN_USER_REACTIVATE: 'admin.users.reactivate',
  ADMIN_USER_BULK_UPDATE: 'admin.users.bulk_update',
  ADMIN_RESCUE_MANAGEMENT: 'admin.rescues.manage',
  ADMIN_AUDIT_LOGS_READ: 'admin.audit.read',
  ADMIN_DATA_EXPORT: 'admin.data.export',

  // Moderation
  MODERATION_REPORTS_READ: 'moderation.reports.read',
  MODERATION_REPORTS_CREATE: 'moderation.reports.create',
  MODERATION_REPORTS_UPDATE: 'moderation.reports.update',
  MODERATION_REPORTS_ASSIGN: 'moderation.reports.assign',
  MODERATION_REPORTS_ESCALATE: 'moderation.reports.escalate',
  MODERATION_REPORTS_BULK_UPDATE: 'moderation.reports.bulk_update',
  MODERATION_ACTIONS_CREATE: 'moderation.actions.create',
  MODERATION_ACTIONS_READ: 'moderation.actions.read',
  MODERATION_METRICS_READ: 'moderation.metrics.read',

  // Chat Analytics
  CHAT_ANALYTICS_READ: 'chat.analytics.read',

  // Notifications
  NOTIFICATION_CREATE: 'notifications.create',
  NOTIFICATION_BULK_CREATE: 'notifications.bulk_create',
  NOTIFICATION_CLEANUP: 'notifications.cleanup',

  // System
  AUDIT_LOG_READ: 'audit.read',
  FEATURE_FLAG_MANAGE: 'feature.manage',
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
  | 'support_ticket'
  | 'admin'
  | 'audit'
  | 'feature_flag'
  | 'moderation'
  | 'notification';

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
