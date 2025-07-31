/**
 * Rescue-specific permissions hook
 * Provides easy access to rescue permission constants and checking functions
 */
import {
  RescuePermissions,
  RescuePermissionGroups,
  PETS_VIEW,
  PETS_CREATE,
  PETS_UPDATE,
  PETS_DELETE,
  APPLICATIONS_VIEW,
  APPLICATIONS_APPROVE,
  APPLICATIONS_REJECT,
  STAFF_VIEW,
  STAFF_CREATE,
  STAFF_UPDATE,
  ANALYTICS_VIEW,
  RESCUE_SETTINGS_VIEW,
  CHAT_VIEW,
  MESSAGES_SEND,
} from '@adopt-dont-shop/lib-permissions';
import { usePermissions } from './useAuthPermissions';

/**
 * Hook that provides rescue-specific permission checking with convenient methods
 */
export const useRescuePermissions = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = usePermissions();

  // Convenience functions for common permission checks
  const canManagePets = () => hasAnyPermission([PETS_CREATE, PETS_UPDATE, PETS_DELETE]);
  const canViewPets = () => hasPermission(PETS_VIEW);

  const canProcessApplications = () =>
    hasAnyPermission([APPLICATIONS_APPROVE, APPLICATIONS_REJECT]);
  const canViewApplications = () => hasPermission(APPLICATIONS_VIEW);

  const canManageStaff = () => hasAnyPermission([STAFF_CREATE, STAFF_UPDATE]);
  const canViewStaff = () => hasPermission(STAFF_VIEW);

  const canViewAnalytics = () => hasPermission(ANALYTICS_VIEW);
  const canManageRescueSettings = () => hasPermission(RESCUE_SETTINGS_VIEW);

  const canCommunicate = () => hasAnyPermission([CHAT_VIEW, MESSAGES_SEND]);

  // Role-based convenience functions
  const isRescueAdmin = () => hasRole('RESCUE_ADMIN' as any);
  const isRescueManager = () => hasRole('RESCUE_MANAGER' as any);
  const isRescueStaff = () => hasRole('RESCUE_STAFF' as any);
  const isVolunteer = () => hasRole('VOLUNTEER' as any);

  return {
    // Base permission functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,

    // Permission constants
    permissions: RescuePermissions,
    permissionGroups: RescuePermissionGroups,

    // Convenience functions
    canManagePets,
    canViewPets,
    canProcessApplications,
    canViewApplications,
    canManageStaff,
    canViewStaff,
    canViewAnalytics,
    canManageRescueSettings,
    canCommunicate,

    // Role checks
    isRescueAdmin,
    isRescueManager,
    isRescueStaff,
    isVolunteer,

    // Individual permission constants for easy access
    PETS_VIEW,
    PETS_CREATE,
    PETS_UPDATE,
    PETS_DELETE,
    APPLICATIONS_VIEW,
    APPLICATIONS_APPROVE,
    APPLICATIONS_REJECT,
    STAFF_VIEW,
    STAFF_CREATE,
    STAFF_UPDATE,
    ANALYTICS_VIEW,
    RESCUE_SETTINGS_VIEW,
    CHAT_VIEW,
    MESSAGES_SEND,
  };
};
