import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner } from '@adopt-dont-shop/components';
import { useAuth, usePermissions } from '@/contexts/AuthContext';
import type { Permission, Role } from '@/types';

interface ProtectedRouteProps {
  /**
   * Content to render when authenticated and authorized
   */
  children: ReactNode;
  /**
   * Required permission to access this route
   */
  requiredPermission?: Permission;
  /**
   * Required role to access this route
   */
  requiredRole?: Role;
  /**
   * Multiple permissions - user needs ANY of these
   */
  anyPermissions?: Permission[];
  /**
   * Multiple permissions - user needs ALL of these
   */
  allPermissions?: Permission[];
  /**
   * Redirect path when not authenticated
   */
  redirectTo?: string;
  /**
   * Custom fallback component for unauthorized access
   */
  fallback?: ReactNode;
  /**
   * Custom check function for more complex authorization logic
   */
  customCheck?: () => boolean;
}

/**
 * ProtectedRoute component for route-level authentication and authorization
 *
 * Uses your existing Spinner component and follows established patterns
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  anyPermissions,
  allPermissions,
  redirectTo = '/login',
  fallback,
  customCheck,
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = usePermissions();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spinner size='lg' label='Loading...' />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Custom authorization check
  if (customCheck && !customCheck()) {
    return fallback ? <>{fallback}</> : <AccessDenied />;
  }

  // Check required role
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback ? <>{fallback}</> : <AccessDenied />;
  }

  // Check single required permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback ? <>{fallback}</> : <AccessDenied />;
  }

  // Check if user has ANY of the required permissions
  if (anyPermissions && !hasAnyPermission(anyPermissions)) {
    return fallback ? <>{fallback}</> : <AccessDenied />;
  }

  // Check if user has ALL of the required permissions
  if (allPermissions && !hasAllPermissions(allPermissions)) {
    return fallback ? <>{fallback}</> : <AccessDenied />;
  }

  // All checks passed, render protected content
  return <>{children}</>;
};

/**
 * Default access denied component
 * Uses your existing component library
 */
const AccessDenied: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <h2>Access Denied</h2>
      <p>You don&apos;t have permission to view this page.</p>
      <p>Please contact your administrator if you believe this is an error.</p>
    </div>
  );
};
