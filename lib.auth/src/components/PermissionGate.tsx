import { useMemo, type ReactNode } from 'react';
import type { Permission } from '@adopt-dont-shop/lib.permissions';
import { usePermissions } from '../contexts/PermissionsContext';

type Base = {
  fallback?: ReactNode;
  children: ReactNode;
};

export type PermissionGateProps =
  | (Base & { permission: Permission; anyOf?: never; allOf?: never })
  | (Base & { permission?: never; anyOf: readonly Permission[]; allOf?: never })
  | (Base & { permission?: never; anyOf?: never; allOf: readonly Permission[] });

export const PermissionGate = ({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionGateProps) => {
  const { permissions } = usePermissions();

  const allowed = useMemo(() => {
    if (permission !== undefined) {
      return permissions.includes(permission);
    }
    if (anyOf !== undefined) {
      return anyOf.some((p) => permissions.includes(p));
    }
    if (allOf !== undefined) {
      return allOf.every((p) => permissions.includes(p));
    }
    return false;
  }, [permissions, permission, anyOf, allOf]);

  return <>{allowed ? children : fallback}</>;
};
