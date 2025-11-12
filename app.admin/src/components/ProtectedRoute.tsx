import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@adopt-dont-shop/lib-auth';
import styled from 'styled-components';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'moderator';
}

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f3f4f6;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: ${props => props.theme.colors.primary[500]};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.p`
  margin-top: 1rem;
  color: #6b7280;
  font-size: 0.875rem;
`;

const UnauthorizedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f3f4f6;
  padding: 2rem;
  text-align: center;
`;

const UnauthorizedCard = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 3rem 2rem;
  max-width: 500px;
`;

const UnauthorizedIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1.5rem;
`;

const UnauthorizedTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 1rem 0;
`;

const UnauthorizedMessage = styled.p`
  font-size: 1rem;
  color: #6b7280;
  margin: 0 0 2rem 0;
  line-height: 1.6;
`;

const BackButton = styled.button`
  background: ${props => props.theme.colors.primary[600]};
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary[700]};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  }
`;

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <LoadingText>Verifying admin access...</LoadingText>
      </LoadingContainer>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to='/login' replace />;
  }

  // Check if user has admin privileges
  // userType values are: 'adopter' | 'rescue_staff' | 'admin' | 'moderator'
  const isAdmin = user.userType === 'admin' || user.userType === 'moderator';

  if (!isAdmin) {
    return (
      <UnauthorizedContainer>
        <UnauthorizedCard>
          <UnauthorizedIcon>🔒</UnauthorizedIcon>
          <UnauthorizedTitle>Access Denied</UnauthorizedTitle>
          <UnauthorizedMessage>
            You don't have permission to access the admin panel. This area is restricted to platform
            administrators only.
          </UnauthorizedMessage>
          <BackButton onClick={() => (window.location.href = '/')}>Return to Home</BackButton>
        </UnauthorizedCard>
      </UnauthorizedContainer>
    );
  }

  // Check specific role requirements if provided
  if (requiredRole) {
    // Check specific role match
    if (user.userType !== requiredRole) {
      return (
        <UnauthorizedContainer>
          <UnauthorizedCard>
            <UnauthorizedIcon>⚠️</UnauthorizedIcon>
            <UnauthorizedTitle>Insufficient Permissions</UnauthorizedTitle>
            <UnauthorizedMessage>
              This section requires {requiredRole} privileges. Please contact your system
              administrator if you need access.
            </UnauthorizedMessage>
            <BackButton onClick={() => window.history.back()}>Go Back</BackButton>
          </UnauthorizedCard>
        </UnauthorizedContainer>
      );
    }
  }

  return <>{children}</>;
};
