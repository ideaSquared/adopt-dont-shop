/**
 * Rescue-specific permission constants
 * These permissions are specifically designed for rescue management applications
 */
import type { Permission } from './index';

/**
 * Pet Management Permissions
 */
export const PETS_VIEW = 'pets.read' satisfies Permission;
export const PETS_CREATE = 'pets.create' satisfies Permission;
export const PETS_UPDATE = 'pets.update' satisfies Permission;
export const PETS_DELETE = 'pets.delete' satisfies Permission;
export const PETS_LIST = 'pets.list' satisfies Permission;
export const PETS_ARCHIVE = 'pets.archive' satisfies Permission;

/**
 * Application Management Permissions
 */
export const APPLICATIONS_VIEW = 'applications.read' satisfies Permission;
export const APPLICATIONS_CREATE = 'applications.create' satisfies Permission;
export const APPLICATIONS_UPDATE = 'applications.update' satisfies Permission;
export const APPLICATIONS_PROCESS = 'applications.review' satisfies Permission;
export const APPLICATIONS_APPROVE = 'applications.approve' satisfies Permission;
export const APPLICATIONS_REJECT = 'applications.reject' satisfies Permission;
export const APPLICATIONS_LIST = 'applications.list' satisfies Permission;

/**
 * Staff Management Permissions
 */
export const STAFF_VIEW = 'staff.read' satisfies Permission;
export const STAFF_CREATE = 'staff.create' satisfies Permission;
export const STAFF_UPDATE = 'staff.update' satisfies Permission;
export const STAFF_DELETE = 'staff.delete' satisfies Permission;
export const STAFF_LIST = 'staff.list' satisfies Permission;
export const STAFF_SUSPEND = 'staff.suspend' satisfies Permission;

/**
 * Rescue Management Permissions
 */
export const RESCUE_SETTINGS_VIEW = 'rescues.read' satisfies Permission;
export const RESCUE_SETTINGS_UPDATE = 'rescues.update' satisfies Permission;
export const RESCUE_BILLING_VIEW = 'admin.dashboard' satisfies Permission;
export const RESCUE_BILLING_MANAGE = 'admin.system_settings' satisfies Permission;

/**
 * Analytics & Reporting Permissions
 */
export const ANALYTICS_VIEW = 'admin.reports' satisfies Permission;
export const ANALYTICS_EXPORT = 'admin.reports' satisfies Permission;
export const REPORTS_GENERATE = 'admin.reports' satisfies Permission;

/**
 * Communication Permissions
 */
export const CHAT_VIEW = 'chats.read' satisfies Permission;
export const CHAT_CREATE = 'chats.create' satisfies Permission;
export const CHAT_UPDATE = 'chats.update' satisfies Permission;
export const MESSAGES_VIEW = 'messages.read' satisfies Permission;
export const MESSAGES_SEND = 'messages.create' satisfies Permission;

/**
 * Notification Permissions
 */
export const NOTIFICATIONS_VIEW = 'notifications.read' satisfies Permission;
export const NOTIFICATIONS_CREATE = 'notifications.create' satisfies Permission;
export const NOTIFICATIONS_UPDATE = 'notifications.update' satisfies Permission;

/**
 * Admin Permissions
 */
export const ADMIN_DASHBOARD = 'admin.dashboard' satisfies Permission;
export const ADMIN_AUDIT_LOGS = 'admin.audit_logs' satisfies Permission;
export const ADMIN_FEATURE_FLAGS = 'admin.feature_flags' satisfies Permission;
export const ADMIN_SYSTEM_SETTINGS = 'admin.system_settings' satisfies Permission;

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
