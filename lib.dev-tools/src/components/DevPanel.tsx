import React, { useState } from 'react';
import styled from 'styled-components';
import { EtherealCredentialsPanel } from './EtherealCredentialsPanel';
import { isDevelopmentMode } from '../index';
import { useSeededUsers } from '../hooks/useSeededUsers';

// Dev user interface extending base User type
export interface DevUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  status: string;
  emailVerified: boolean;
  country: string;
  city: string;
  addressLine1: string;
  postalCode: string;
  timezone: string;
  language: string;
  bio: string;
  dateOfBirth: string;
  phoneNumber?: string;
  termsAcceptedAt: string;
  privacyPolicyAcceptedAt?: string;
  createdAt: string;
  updatedAt: string;
  description: string;
}

// Auth context interface that apps must provide
export interface DevPanelAuthContext {
  user: any;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export interface DevPanelProps {
  title: string;
  seededUsers?: DevUser[];
  seededPassword?: string;
  authContext: DevPanelAuthContext;
  isDevelopment?: () => boolean;
  userTypes?: string[];
  useApiData?: boolean;
}

// Styled components
const DevToggle = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  box-shadow: 0 8px 25px -5px rgba(102, 126, 234, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px -5px rgba(102, 126, 234, 0.6);
  }

  &:active {
    transform: translateY(0);
  }
`;

const DevPanel = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: ${props => props.$isOpen ? '0' : '-420px'};
  width: 420px;
  height: 100vh;
  background: linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%);
  border-left: 1px solid #e2e8f0;
  box-shadow: -20px 0 40px -10px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
`;

const DevHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  font-weight: 700;
  font-size: 1.1rem;
  text-align: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  }
`;

const DevContent = styled.div`
  padding: 1.5rem;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const UserCard = styled.button`
  display: block;
  width: 100%;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(to bottom, #667eea, #764ba2);
    transform: scaleY(0);
    transition: transform 0.3s ease;
  }

  &:hover {
    border-color: #667eea;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    transform: translateY(-2px);
    box-shadow: 0 12px 25px -5px rgba(102, 126, 234, 0.25);
    
    &::before {
      transform: scaleY(1);
    }
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: #f1f5f9;
    
    &:hover {
      transform: none;
      box-shadow: none;
    }
  }
`;

const UserName = styled.div`
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  letter-spacing: -0.025em;
`;

const UserEmail = styled.div`
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const UserDescription = styled.div`
  color: #475569;
  font-size: 0.8rem;
  line-height: 1.4;
  font-style: italic;
  opacity: 0.9;
`;

const CurrentUserPanel = styled.div`
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
  border: 1px solid #86efac;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.1);

  h4 {
    margin: 0 0 0.75rem 0;
    color: #166534;
    font-size: 1rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &::before {
      content: '👤';
      font-size: 1.2rem;
    }
  }
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  margin-top: 0.75rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const WarningBanner = styled.div`
  background: linear-gradient(135deg, #fef3c7 0%, #fef7cd 100%);
  color: #92400e;
  padding: 1rem;
  border-radius: 12px;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  border: 1px solid #fbbf24;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.15);
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &::before {
    content: '⚠️';
    font-size: 1.2rem;
  }
`;

export const DevPanelComponent: React.FC<DevPanelProps> = ({
  title,
  seededUsers: propSeededUsers,
  seededPassword: propSeededPassword = 'DevPassword123!',
  authContext,
  isDevelopment: isDev = isDevelopmentMode,
  userTypes,
  useApiData = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, login, logout, isAuthenticated } = authContext;

  // Use API data if requested, otherwise use prop data
  const {
    users: apiUsers,
    loading: usersLoading,
    error: usersError
  } = useSeededUsers({
    userTypes,
    fallbackToLocal: true
  });

  const users = useApiData ? apiUsers : (propSeededUsers || []);
  const seededPassword = propSeededPassword;

  // Only show in development mode
  if (!isDev()) {
    return null;
  }

  const handleUserLogin = async (devUser: DevUser) => {
    try {
      // Use real authentication with backend seeded users
      await login({ email: devUser.email, password: seededPassword });
      setIsOpen(false);
    } catch (error) {
      console.error('DevPanel: Login error:', error);
      alert(`Login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('DevPanel: Logout error:', error);
    }
  };

  return (
    <>
      <DevToggle onClick={() => setIsOpen(!isOpen)}>🔧 DEV LOGIN</DevToggle>

      <DevPanel $isOpen={isOpen}>
        <DevHeader>{title}</DevHeader>

        <DevContent>
          <WarningBanner>⚠️ Development only - uses backend seeded users with real authentication</WarningBanner>

          {isAuthenticated && user && (
            <CurrentUserPanel>
              <h4>Currently Logged In:</h4>
              <UserName>{user.firstName} {user.lastName}</UserName>
              <UserEmail>{user.email}</UserEmail>
              <UserDescription>User Type: {user.userType}</UserDescription>
              <LogoutButton onClick={handleLogout}>
                🚪 Logout
              </LogoutButton>
            </CurrentUserPanel>
          )}

          {/* Ethereal Email Credentials */}
          <EtherealCredentialsPanel />

          <h4 style={{ marginBottom: '1rem', color: '#374151', fontSize: '0.9rem' }}>
            Available Users (Password: {seededPassword}):
          </h4>

          {usersLoading && useApiData && (
            <div style={{ color: '#6b7280', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
              Loading users from database...
            </div>
          )}

          {usersError && useApiData && (
            <div style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: '1rem', padding: '0.5rem', background: '#fef2f2', borderRadius: '4px' }}>
              ⚠️ {usersError}
            </div>
          )}

          {users.map((devUser: DevUser) => (
            <UserCard
              key={devUser.userId}
              onClick={() => handleUserLogin(devUser)}
              disabled={isAuthenticated && user?.email === devUser.email}
            >
              <UserName>
                {devUser.firstName} {devUser.lastName}
              </UserName>
              <UserEmail>{devUser.email}</UserEmail>
              <UserDescription>{devUser.description}</UserDescription>
            </UserCard>
          ))}
        </DevContent>
      </DevPanel>
    </>
  );
};
