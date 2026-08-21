/**
 * Rescue-specific permission constants
 * These permissions are specifically designed for rescue management applications
 */
import type { Permission } from './index.js';

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
 * Moderation Permissions
 *
 * Grouped, dedicated permissions for the moderation service. These replace
 * the ADMIN_DASHBOARD placeholder the moderation handlers previously gated on.
 * "view" is read-only; "manage" covers acting on / mutating the resource.
 */
export const MODERATION_REPORTS_VIEW = 'moderation.reports.view' satisfies Permission;
export const MODERATION_REPORTS_MANAGE = 'moderation.reports.manage' satisfies Permission;
export const MODERATION_SANCTIONS_MANAGE = 'moderation.sanctions.manage' satisfies Permission;
export const MODERATION_TICKETS_MANAGE = 'moderation.tickets.manage' satisfies Permission;
export const MODERATION_ACTIONS_MANAGE = 'moderation.actions.manage' satisfies Permission;

/**
 * Admin Permissions
 */
export const ADMIN_DASHBOARD = 'admin.dashboard' satisfies Permission;
export const ADMIN_AUDIT_LOGS = 'admin.audit_logs' satisfies Permission;
export const ADMIN_FEATURE_FLAGS = 'admin.feature_flags' satisfies Permission;
export const ADMIN_SYSTEM_SETTINGS = 'admin.system_settings' satisfies Permission;

/**
 * Admin User Management Permissions (ADS-1235)
 *
 * The admin console's /api/v1/users/* surface (services/auth/src/grpc/
 * admin-handlers.ts). ADMIN_USERS_BROADCAST is granted to no role in the
 * RBAC seed — the only caller is the notifications service's system
 * principal, which stamps it directly rather than resolving it from a
 * role's DB grants.
 */
export const ADMIN_USERS_SEARCH = 'admin.users.search' satisfies Permission;
export const ADMIN_USERS_READ = 'admin.users.read' satisfies Permission;
export const ADMIN_USERS_UPDATE = 'admin.users.update' satisfies Permission;
export const ADMIN_USERS_CREATE = 'admin.users.create' satisfies Permission;
export const ADMIN_USERS_DEACTIVATE = 'admin.users.deactivate' satisfies Permission;
export const ADMIN_USERS_REACTIVATE = 'admin.users.reactivate' satisfies Permission;
export const ADMIN_USERS_BULK_UPDATE = 'admin.users.bulk_update' satisfies Permission;
export const ADMIN_USERS_BROADCAST = 'admin.users.broadcast' satisfies Permission;

/**
 * Admin Field-Permissions Management (ADS-1235)
 *
 * Admin-only CRUD over the field-level permission overrides
 * (services/auth/src/grpc/field-permission-handlers.ts).
 */
export const ADMIN_FIELD_PERMISSIONS_READ = 'admin.field_permissions.read' satisfies Permission;
export const ADMIN_FIELD_PERMISSIONS_WRITE = 'admin.field_permissions.write' satisfies Permission;

/**
 * CMS Permissions (ADS-1235)
 *
 * Admin-facing content + navigation-menu management
 * (services/cms/src/grpc/handlers.ts). Public reads are unauthenticated
 * and need no permission.
 */
export const CMS_CONTENT_READ = 'cms.content.read' satisfies Permission;
export const CMS_CONTENT_CREATE = 'cms.content.create' satisfies Permission;
export const CMS_CONTENT_UPDATE = 'cms.content.update' satisfies Permission;
export const CMS_CONTENT_DELETE = 'cms.content.delete' satisfies Permission;
export const CMS_CONTENT_PUBLISH = 'cms.content.publish' satisfies Permission;
export const CMS_MENU_READ = 'cms.menu.read' satisfies Permission;
export const CMS_MENU_CREATE = 'cms.menu.create' satisfies Permission;
export const CMS_MENU_UPDATE = 'cms.menu.update' satisfies Permission;
export const CMS_MENU_DELETE = 'cms.menu.delete' satisfies Permission;

/**
 * Email Template Permissions (ADS-1235)
 *
 * Admin CRUD over the notifications service's email templates
 * (services/notifications/src/grpc/email-template-handlers.ts). Singular
 * "email.*" — see the Permission type definition for why this is distinct
 * from the pre-existing "emails.*" (plural) literals.
 */
export const EMAIL_TEMPLATES_READ = 'email.templates.read' satisfies Permission;
export const EMAIL_TEMPLATES_CREATE = 'email.templates.create' satisfies Permission;
export const EMAIL_TEMPLATES_UPDATE = 'email.templates.update' satisfies Permission;
export const EMAIL_TEMPLATES_DELETE = 'email.templates.delete' satisfies Permission;

/**
 * Privacy Preferences Permissions (ADS-1235)
 *
 * Self-service by design (services/auth/src/grpc/privacy-prefs-handlers.ts)
 * — every user-facing role holds the base read/update permission so callers
 * can manage their own row; the ":any" variants are the admin-only
 * cross-user escape hatch.
 */
export const AUTH_PRIVACY_PREFS_READ = 'auth.privacy-prefs.read' satisfies Permission;
export const AUTH_PRIVACY_PREFS_READ_ANY = 'auth.privacy-prefs.read:any' satisfies Permission;
export const AUTH_PRIVACY_PREFS_UPDATE = 'auth.privacy-prefs.update' satisfies Permission;
export const AUTH_PRIVACY_PREFS_UPDATE_ANY = 'auth.privacy-prefs.update:any' satisfies Permission;

/**
 * Chat Moderation Permissions (ADS-1235)
 *
 * The cross-user escape hatch for DeleteMessage
 * (services/chat/src/grpc/handlers.ts) — a sender may always delete their
 * own message; this permission lets moderators/admins delete anyone's.
 */
export const CHAT_MESSAGE_DELETE_ANY = 'chat.message.delete:any' satisfies Permission;

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

  // Moderation
  MODERATION_REPORTS_VIEW,
  MODERATION_REPORTS_MANAGE,
  MODERATION_SANCTIONS_MANAGE,
  MODERATION_TICKETS_MANAGE,
  MODERATION_ACTIONS_MANAGE,

  // Admin
  ADMIN_DASHBOARD,
  ADMIN_AUDIT_LOGS,
  ADMIN_FEATURE_FLAGS,
  ADMIN_SYSTEM_SETTINGS,

  // Admin User Management
  ADMIN_USERS_SEARCH,
  ADMIN_USERS_READ,
  ADMIN_USERS_UPDATE,
  ADMIN_USERS_CREATE,
  ADMIN_USERS_DEACTIVATE,
  ADMIN_USERS_REACTIVATE,
  ADMIN_USERS_BULK_UPDATE,
  ADMIN_USERS_BROADCAST,

  // Admin Field-Permissions Management
  ADMIN_FIELD_PERMISSIONS_READ,
  ADMIN_FIELD_PERMISSIONS_WRITE,

  // CMS
  CMS_CONTENT_READ,
  CMS_CONTENT_CREATE,
  CMS_CONTENT_UPDATE,
  CMS_CONTENT_DELETE,
  CMS_CONTENT_PUBLISH,
  CMS_MENU_READ,
  CMS_MENU_CREATE,
  CMS_MENU_UPDATE,
  CMS_MENU_DELETE,

  // Email Templates
  EMAIL_TEMPLATES_READ,
  EMAIL_TEMPLATES_CREATE,
  EMAIL_TEMPLATES_UPDATE,
  EMAIL_TEMPLATES_DELETE,

  // Privacy Preferences
  AUTH_PRIVACY_PREFS_READ,
  AUTH_PRIVACY_PREFS_READ_ANY,
  AUTH_PRIVACY_PREFS_UPDATE,
  AUTH_PRIVACY_PREFS_UPDATE_ANY,

  // Chat Moderation
  CHAT_MESSAGE_DELETE_ANY,
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
