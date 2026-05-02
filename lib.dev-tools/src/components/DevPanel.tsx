import React, { useState } from 'react';
import { EtherealCredentialsPanel } from './EtherealCredentialsPanel';
import { isDevelopmentMode } from '../index';
import { useSeededUsers } from '../hooks/useSeededUsers';
import * as styles from './DevPanel.css';

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

export const DevPanelComponent: React.FC<DevPanelProps> = ({
  title,
  seededUsers: propSeededUsers,
  seededPassword: propSeededPassword = 'DevPassword123!',
  authContext,
  isDevelopment: isDev = isDevelopmentMode,
  userTypes,
  useApiData = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, login, logout, isAuthenticated } = authContext;

  // Use API data if requested, otherwise use prop data
  const {
    users: apiUsers,
    loading: usersLoading,
    error: usersError,
  } = useSeededUsers({
    userTypes,
    fallbackToLocal: true,
  });

  const users = useApiData ? apiUsers : propSeededUsers || [];
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
      <button className={styles.devToggle} onClick={() => setIsOpen(!isOpen)}>
        🔧 DEV LOGIN
      </button>

      <div className={styles.devPanel({ isOpen: isOpen ? 'open' : 'closed' })}>
        <div className={styles.devHeader}>{title}</div>

        <div className={styles.devContent}>
          <div className={styles.warningBanner}>
            ⚠️ Development only - uses backend seeded users with real authentication
          </div>

          {isAuthenticated && user && (
            <div className={styles.currentUserPanel}>
              <h4>Currently Logged In:</h4>
              <div className={styles.userName}>
                {user.firstName} {user.lastName}
              </div>
              <div className={styles.userEmail}>{user.email}</div>
              <div className={styles.userDescription}>User Type: {user.userType}</div>
              <button className={styles.logoutButton} onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          )}

          {/* Ethereal Email Credentials */}
          <EtherealCredentialsPanel />

          <h4 style={{ marginBottom: '1rem', color: '#374151', fontSize: '0.9rem' }}>
            Available Users (Password: {seededPassword}):
          </h4>

          {usersLoading && useApiData && (
            <div
              style={{ color: '#6b7280', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}
            >
              Loading users from database...
            </div>
          )}

          {usersError && useApiData && (
            <div
              style={{
                color: '#dc2626',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                padding: '0.5rem',
                background: '#fef2f2',
                borderRadius: '4px',
              }}
            >
              ⚠️ {usersError}
            </div>
          )}

          {users.map((devUser: DevUser) => (
            <button
              className={styles.userCard}
              key={devUser.userId}
              onClick={() => handleUserLogin(devUser)}
              disabled={isAuthenticated && user?.email === devUser.email}
            >
              <div className={styles.userName}>
                {devUser.firstName} {devUser.lastName}
              </div>
              <div className={styles.userEmail}>{devUser.email}</div>
              <div className={styles.userDescription}>{devUser.description}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
