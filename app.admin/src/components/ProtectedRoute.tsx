import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, usePermissions } from '@adopt-dont-shop/lib.auth';
import type { Permission } from '@adopt-dont-shop/lib.permissions';
import { ADMIN_USER_TYPES } from '@/types';
import * as styles from './ProtectedRoute.css';

type ProtectedRouteProps = {
  children: React.ReactNode;
  /**
   * Permission required to view this route. When omitted, only the base
   * "is an admin-tier user" check applies. For routes that should accept
   * any of several permissions, use {@link anyOf} instead.
   */
  requiredPermission?: Permission;
  /**
   * Accept any of these permissions. Mutually exclusive with
   * {@link requiredPermission}.
   */
  anyOf?: readonly Permission[];
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  anyOf,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { permissions, isLoading: permissionsLoading } = usePermissions();

  if (isLoading || permissionsLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Verifying admin access...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to='/login' replace />;
  }

  // Identity check: only signed-in admin-tier users can see the admin app at
  // all. This is "who you are", not "what you can do" — capability checks
  // below use permissions.
  const isAdmin = (ADMIN_USER_TYPES as readonly string[]).includes(user.userType);
  if (!isAdmin) {
    return (
      <div className={styles.unauthorizedContainer}>
        <div className={styles.unauthorizedCard}>
          <div className={styles.unauthorizedIcon}>🔒</div>
          <h1 className={styles.unauthorizedTitle}>Access Denied</h1>
          <p className={styles.unauthorizedMessage}>
            You don't have permission to access the admin panel. This area is restricted to platform
            administrators only.
          </p>
          <button className={styles.backButton} onClick={() => (window.location.href = '/')}>
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const required = requiredPermission ? [requiredPermission] : anyOf;
  const allowed = !required || required.some(p => permissions.includes(p));

  if (!allowed) {
    return (
      <div className={styles.unauthorizedContainer}>
        <div className={styles.unauthorizedCard}>
          <div className={styles.unauthorizedIcon}>⚠️</div>
          <h1 className={styles.unauthorizedTitle}>Insufficient Permissions</h1>
          <p className={styles.unauthorizedMessage}>
            You don't have permission to view this section. Please contact your system administrator
            if you need access.
          </p>
          <button className={styles.backButton} onClick={() => window.history.back()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
