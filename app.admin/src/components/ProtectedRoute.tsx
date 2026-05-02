import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { ADMIN_USER_TYPES } from '@/types';
import * as styles from './ProtectedRoute.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'moderator' | 'super_admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Verifying admin access...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to='/login' replace />;
  }

  // Check if user has admin privileges
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
          <button className={styles.backButton} onClick={() => (window.location.href = '/')}>Return to Home</button>
        </div>
      </div>
    );
  }

  // Check specific role requirements if provided; super_admin bypasses all role gates
  if (requiredRole && user.userType !== 'super_admin') {
    if (user.userType !== requiredRole) {
      return (
        <div className={styles.unauthorizedContainer}>
          <div className={styles.unauthorizedCard}>
            <div className={styles.unauthorizedIcon}>⚠️</div>
            <h1 className={styles.unauthorizedTitle}>Insufficient Permissions</h1>
            <p className={styles.unauthorizedMessage}>
              This section requires {requiredRole} privileges. Please contact your system
              administrator if you need access.
            </p>
            <button className={styles.backButton} onClick={() => window.history.back()}>Go Back</button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
