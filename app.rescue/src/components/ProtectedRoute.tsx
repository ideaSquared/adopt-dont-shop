import React from 'react';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import LoginPage from '../pages/LoginPage';
import { Text, Card } from '@adopt-dont-shop/lib.components';
import * as styles from './ProtectedRoute.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

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

  // Show auth page if not authenticated
  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  // Render protected content
  return <>{children}</>;
};

export default ProtectedRoute;
