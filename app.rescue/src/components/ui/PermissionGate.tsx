import React from 'react';
import { usePermissions } from '@/hooks/useAuthPermissions';
import { Permission, Role } from '@/types/auth';
import { 
  RESCUE_SETTINGS_VIEW, 
  STAFF_VIEW, 
  ANALYTICS_VIEW, 
  PETS_VIEW, 
  APPLICATIONS_VIEW 
} from '@adopt-dont-shop/lib-permissions';

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  role?: Role;
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 *
 * @param permission - Single permission to check
 * @param permissions - Array of permissions to check
 * @param role - Specific role to check
 * @param requireAll - If true, user must have ALL permissions. If false, user needs ANY permission
 * @param fallback - Component to render when access is denied
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  permissions,
  role,
  requireAll = false,
  fallback = null,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = usePermissions();

  // Check role first if specified
  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);

    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

// Convenience components for common use cases
export const AdminOnly: React.FC<Omit<PermissionGateProps, 'role'>> = ({ children, ...props }) => (
  <PermissionGate role={Role.RESCUE_ADMIN} {...props}>
    {children}
  </PermissionGate>
);

export const ManagerAndAbove: React.FC<Omit<PermissionGateProps, 'permissions'>> = ({
  children,
  ...props
}) => (
  <PermissionGate
    permissions={[
      RESCUE_SETTINGS_VIEW,
      STAFF_VIEW,
      ANALYTICS_VIEW,
    ]}
    requireAll={false}
    {...props}
  >
    {children}
  </PermissionGate>
);

export const StaffAndAbove: React.FC<Omit<PermissionGateProps, 'permissions'>> = ({
  children,
  ...props
}) => (
  <PermissionGate
    permissions={[PETS_VIEW, APPLICATIONS_VIEW]}
    requireAll={false}
    {...props}
  >
    {children}
  </PermissionGate>
);
