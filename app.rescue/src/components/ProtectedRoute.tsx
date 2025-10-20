import React from 'react';
import { useAuth } from '@adopt-dont-shop/lib-auth';
import LoginPage from '../pages/LoginPage';
import { Text, Card } from '@adopt-dont-shop/components';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const LoadingCard = styled(Card)`
  padding: 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingCard>
          <LoadingSpinner />
          <Text>Loading...</Text>
        </LoadingCard>
      </LoadingContainer>
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
