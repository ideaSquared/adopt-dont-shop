import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGate } from './PermissionGate';
import { Spinner } from '@adopt-dont-shop/components';
import { Permission, Role } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  requiredRole?: Role;
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Component that protects routes based on authentication and permissions
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredPermissions,
  requiredRole,
  requireAll = false,
  fallback,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Spinner size='lg' />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  // If no specific permissions are required, just check authentication
  if (!requiredPermission && !requiredPermissions && !requiredRole) {
    return <>{children}</>;
  }

  // Use PermissionGate for permission checking
  return (
    <PermissionGate
      permission={requiredPermission}
      permissions={requiredPermissions}
      role={requiredRole}
      requireAll={requireAll}
      fallback={
        fallback || (
          <div className='flex items-center justify-center min-h-screen'>
            <div className='text-center'>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>Access Denied</h2>
              <p className='text-gray-600 mb-6'>
                You don&apos;t have permission to access this page.
              </p>
              <button
                onClick={() => window.history.back()}
                className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
              >
                Go Back
              </button>
            </div>
          </div>
        )
      }
    >
      {children}
    </PermissionGate>
  );
};

// Convenience components for common route protection patterns
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole={Role.RESCUE_ADMIN}>{children}</ProtectedRoute>
);

export const ManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    requiredPermissions={[
      Permission.RESCUE_SETTINGS_VIEW,
      Permission.STAFF_VIEW,
      Permission.ANALYTICS_VIEW,
    ]}
    requireAll={false}
  >
    {children}
  </ProtectedRoute>
);

export const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    requiredPermissions={[Permission.PETS_VIEW, Permission.APPLICATIONS_VIEW]}
    requireAll={false}
  >
    {children}
  </ProtectedRoute>
);
