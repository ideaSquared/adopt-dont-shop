import type { Permission } from '@adopt-dont-shop/lib.permissions';
import { usePermissions } from '../contexts/PermissionsContext';

/**
 * ADS-757: result shape that exposes the loading and error state of the
 * underlying permissions fetch alongside the allow decision. Callers must
 * render a skeleton/null while `isLoading === true` to avoid flashing a
 * false-negative state during the post-login window.
 */
export type PermissionCheckResult = {
  allowed: boolean;
  isLoading: boolean;
  error: Error | null;
};

export const useHasPermission = (permission: Permission): PermissionCheckResult => {
  const { permissions, isLoading, error } = usePermissions();
  return {
    allowed: permissions.includes(permission),
    isLoading,
    error,
  };
};

export const useHasAnyPermission = (required: readonly Permission[]): PermissionCheckResult => {
  const { permissions, isLoading, error } = usePermissions();
  return {
    allowed: required.some((p) => permissions.includes(p)),
    isLoading,
    error,
  };
};

export const useHasAllPermissions = (required: readonly Permission[]): PermissionCheckResult => {
  const { permissions, isLoading, error } = usePermissions();
  return {
    allowed: required.every((p) => permissions.includes(p)),
    isLoading,
    error,
  };
};
