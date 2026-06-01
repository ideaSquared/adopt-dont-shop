import type { Permission } from '@adopt-dont-shop/lib.permissions';
import { usePermissions } from '../contexts/PermissionsContext';

export const useHasPermission = (permission: Permission): boolean => {
  const { permissions } = usePermissions();
  return permissions.includes(permission);
};

export const useHasAnyPermission = (required: readonly Permission[]): boolean => {
  const { permissions } = usePermissions();
  return required.some((p) => permissions.includes(p));
};

export const useHasAllPermissions = (required: readonly Permission[]): boolean => {
  const { permissions } = usePermissions();
  return required.every((p) => permissions.includes(p));
};
