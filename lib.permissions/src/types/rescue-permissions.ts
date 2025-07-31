/**
 * Rescue-specific permission constants
 * These permissions are specifically designed for rescue management applications
 */
import type { Permission } from './index';

/**
 * Pet Management Permissions
 */
export const PETS_VIEW = 'pets.read' as Permission;
export const PETS_CREATE = 'pets.create' as Permission;
export const PETS_UPDATE = 'pets.update' as Permission;
export const PETS_DELETE = 'pets.delete' as Permission;
export const PETS_LIST = 'pets.list' as Permission;
export const PETS_ARCHIVE = 'pets.archive' as Permission;

/**
 * Application Management Permissions
 */
export const APPLICATIONS_VIEW = 'applications.read' as Permission;
export const APPLICATIONS_CREATE = 'applications.create' as Permission;
export const APPLICATIONS_UPDATE = 'applications.update' as Permission;
export const APPLICATIONS_PROCESS = 'applications.review' as Permission;
export const APPLICATIONS_APPROVE = 'applications.approve' as Permission;
export const APPLICATIONS_REJECT = 'applications.reject' as Permission;
export const APPLICATIONS_LIST = 'applications.list' as Permission;

/**
 * Staff Management Permissions
 */
export const STAFF_VIEW = 'users.read' as Permission;
export const STAFF_CREATE = 'users.create' as Permission;
export const STAFF_UPDATE = 'users.update' as Permission;
export const STAFF_DELETE = 'users.delete' as Permission;
export const STAFF_LIST = 'users.list' as Permission;
export const STAFF_SUSPEND = 'users.suspend' as Permission;

/**
 * Rescue Management Permissions
 */
export const RESCUE_SETTINGS_VIEW = 'rescues.read' as Permission;
export const RESCUE_SETTINGS_UPDATE = 'rescues.update' as Permission;
export const RESCUE_BILLING_VIEW = 'admin.dashboard' as Permission;
export const RESCUE_BILLING_MANAGE = 'admin.system_settings' as Permission;

/**
 * Analytics & Reporting Permissions
 */
export const ANALYTICS_VIEW = 'admin.reports' as Permission;
export const ANALYTICS_EXPORT = 'admin.reports' as Permission;
export const REPORTS_GENERATE = 'admin.reports' as Permission;

/**
 * Communication Permissions
 */
export const CHAT_VIEW = 'chats.read' as Permission;
export const CHAT_CREATE = 'chats.create' as Permission;
export const CHAT_UPDATE = 'chats.update' as Permission;
export const MESSAGES_VIEW = 'messages.read' as Permission;
export const MESSAGES_SEND = 'messages.create' as Permission;

/**
 * Notification Permissions
 */
export const NOTIFICATIONS_VIEW = 'notifications.read' as Permission;
export const NOTIFICATIONS_CREATE = 'notifications.create' as Permission;
export const NOTIFICATIONS_UPDATE = 'notifications.update' as Permission;

/**
 * Admin Permissions
 */
export const ADMIN_DASHBOARD = 'admin.dashboard' as Permission;
export const ADMIN_AUDIT_LOGS = 'admin.audit_logs' as Permission;
export const ADMIN_FEATURE_FLAGS = 'admin.feature_flags' as Permission;
export const ADMIN_SYSTEM_SETTINGS = 'admin.system_settings' as Permission;

/**
 * Grouped permissions for common use cases
 */
export const RescuePermissions = {
  // Pet Management
  PETS_VIEW,
  PETS_CREATE,
  PETS_UPDATE,
  PETS_DELETE,
  PETS_LIST,
  PETS_ARCHIVE,

  // Application Management
  APPLICATIONS_VIEW,
  APPLICATIONS_CREATE,
  APPLICATIONS_UPDATE,
  APPLICATIONS_PROCESS,
  APPLICATIONS_APPROVE,
  APPLICATIONS_REJECT,
  APPLICATIONS_LIST,

  // Staff Management
  STAFF_VIEW,
  STAFF_CREATE,
  STAFF_UPDATE,
  STAFF_DELETE,
  STAFF_LIST,
  STAFF_SUSPEND,

  // Rescue Management
  RESCUE_SETTINGS_VIEW,
  RESCUE_SETTINGS_UPDATE,
  RESCUE_BILLING_VIEW,
  RESCUE_BILLING_MANAGE,

  // Analytics & Reporting
  ANALYTICS_VIEW,
  ANALYTICS_EXPORT,
  REPORTS_GENERATE,

  // Communication
  CHAT_VIEW,
  CHAT_CREATE,
  CHAT_UPDATE,
  MESSAGES_VIEW,
  MESSAGES_SEND,

  // Notifications
  NOTIFICATIONS_VIEW,
  NOTIFICATIONS_CREATE,
  NOTIFICATIONS_UPDATE,

  // Admin
  ADMIN_DASHBOARD,
  ADMIN_AUDIT_LOGS,
  ADMIN_FEATURE_FLAGS,
  ADMIN_SYSTEM_SETTINGS,
} as const;

/**
 * Permission groups for different roles
 */
export const RescuePermissionGroups = {
  RESCUE_ADMIN: [...Object.values(RescuePermissions)],

  RESCUE_MANAGER: [
    PETS_VIEW,
    PETS_CREATE,
    PETS_UPDATE,
    APPLICATIONS_VIEW,
    APPLICATIONS_PROCESS,
    APPLICATIONS_APPROVE,
    APPLICATIONS_REJECT,
    STAFF_VIEW,
    STAFF_CREATE,
    STAFF_UPDATE,
    ANALYTICS_VIEW,
    ANALYTICS_EXPORT,
    RESCUE_SETTINGS_VIEW,
    RESCUE_SETTINGS_UPDATE,
    CHAT_VIEW,
    CHAT_CREATE,
    MESSAGES_VIEW,
    MESSAGES_SEND,
    NOTIFICATIONS_VIEW,
    NOTIFICATIONS_CREATE,
  ],

  RESCUE_STAFF: [
    PETS_VIEW,
    PETS_CREATE,
    PETS_UPDATE,
    APPLICATIONS_VIEW,
    APPLICATIONS_PROCESS,
    ANALYTICS_VIEW,
    CHAT_VIEW,
    CHAT_CREATE,
    MESSAGES_VIEW,
    MESSAGES_SEND,
    NOTIFICATIONS_VIEW,
  ],

  VOLUNTEER: [PETS_VIEW, ANALYTICS_VIEW, NOTIFICATIONS_VIEW],
} as const;
