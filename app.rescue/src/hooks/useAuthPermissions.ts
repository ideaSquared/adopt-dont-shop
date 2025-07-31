/**
 * Combined Auth and Permissions hook
 * Provides unified access to authentication and permission checking
 */
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions as usePermissionsContext } from '@/contexts/PermissionsContext';
import type { Permission, Role } from '@/types/auth';

export interface CombinedAuthPermissions {
  // Auth state
  user: any;
  rescue: any;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Auth actions
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Permission checks
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  hasRole: (role: Role) => boolean;

  // Permission state
  permissionsLoading: boolean;
  refreshPermissions: () => Promise<void>;
}

/**
 * Combined hook that provides both auth and permissions functionality
 */
export const useAuthWithPermissions = (): CombinedAuthPermissions => {
  const auth = useAuth();
  const permissions = usePermissionsContext();

  const hasRole = useCallback(
    (role: Role): boolean => {
      return auth.user?.role === role;
    },
    [auth.user]
  );

  return {
    // Auth state
    user: auth.user,
    rescue: auth.rescue,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,

    // Auth actions
    login: auth.login,
    logout: auth.logout,
    refreshUser: auth.refreshUser,

    // Permission checks
    hasPermission: permissions.hasPermission,
    hasAnyPermission: permissions.hasAnyPermission,
    hasAllPermissions: permissions.hasAllPermissions,
    hasRole,

    // Permission state
    permissionsLoading: permissions.isLoading,
    refreshPermissions: permissions.refreshPermissions,
  };
};

/**
 * Hook for permission checking only
 * Uses the permissions context directly
 */
export const usePermissions = () => {
  const auth = useAuth();
  const permissions = usePermissionsContext();

  const hasRole = useCallback(
    (role: Role): boolean => {
      return auth.user?.role === role;
    },
    [auth.user]
  );

  return {
    hasPermission: permissions.hasPermission,
    hasAnyPermission: permissions.hasAnyPermission,
    hasAllPermissions: permissions.hasAllPermissions,
    hasRole,
    isLoading: permissions.isLoading,
    refreshPermissions: permissions.refreshPermissions,
  };
};
