import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Text, Card } from '@adopt-dont-shop/lib.components';
import * as styles from './ProtectedRoute.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Card className={styles.loadingCard}>
          <div className={styles.loadingSpinner} />
          <Text>Loading...</Text>
        </Card>
      </div>
    );
  }

  // Redirect to login if not authenticated, preserving the attempted
  // location so the login page can return the user there after sign-in.
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
};

export default ProtectedRoute;
