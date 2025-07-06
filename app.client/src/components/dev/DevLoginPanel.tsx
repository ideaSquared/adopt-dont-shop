import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import React, { useState } from 'react';
import styled from 'styled-components';

interface DevUser extends User {
  role: 'adopter' | 'rescue_admin' | 'admin';
  password: string; // For dev purposes
}

const devUsers: DevUser[] = [
  {
    userId: 'user-1',
    email: 'john.adopter@example.com',
    firstName: 'John',
    lastName: 'Adopter',
    role: 'adopter',
    password: 'dev123',
    phone: '(555) 123-4567',
    location: {
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
    },
    emailVerified: true,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    userId: 'user-2',
    email: 'jane.petlover@example.com',
    firstName: 'Jane',
    lastName: 'Pet Lover',
    role: 'adopter',
    password: 'dev123',
    phone: '(555) 987-6543',
    location: {
      address: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
    },
    emailVerified: true,
    createdAt: '2024-02-20T14:15:00Z',
    updatedAt: '2024-02-20T14:15:00Z',
  },
  {
    userId: 'user-3',
    email: 'sarah.rescue@example.com',
    firstName: 'Sarah',
    lastName: 'Rescue Admin',
    role: 'rescue_admin',
    password: 'dev123',
    phone: '(555) 456-7890',
    location: {
      address: '789 Elm St',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
    },
    emailVerified: true,
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-01T09:00:00Z',
  },
  {
    userId: 'user-4',
    email: 'mike.admin@example.com',
    firstName: 'Mike',
    lastName: 'Super Admin',
    role: 'admin',
    password: 'dev123',
    phone: '(555) 111-2222',
    location: {
      address: '321 Pine St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
    },
    emailVerified: true,
    createdAt: '2023-12-01T08:00:00Z',
    updatedAt: '2023-12-01T08:00:00Z',
  },
  {
    userId: 'user-5',
    email: 'alex.newcomer@example.com',
    firstName: 'Alex',
    lastName: 'Newcomer',
    role: 'adopter',
    password: 'dev123',
    emailVerified: false,
    createdAt: '2024-07-01T16:30:00Z',
    updatedAt: '2024-07-01T16:30:00Z',
  },
];

const DevPanel = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: ${props => (props.$isOpen ? '0' : '-350px')};
  width: 350px;
  height: 100vh;
  background: ${props => props.theme.background.primary};
  border-left: 1px solid ${props => props.theme.border.color.primary};
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  overflow-y: auto;
  transition: right 0.3s ease;
  padding: 1rem;
`;

const ToggleButton = styled.button<{ $isOpen: boolean }>`
  position: fixed;
  top: 50%;
  right: ${props => (props.$isOpen ? '350px' : '0')};
  transform: translateY(-50%);
  background: ${props => props.theme.colors.primary[500]};
  color: white;
  border: none;
  padding: 1rem 0.5rem;
  border-radius: 6px 0 0 6px;
  cursor: pointer;
  z-index: 10000;
  transition: right 0.3s ease;
  font-size: 0.75rem;
  writing-mode: vertical-rl;
  text-orientation: mixed;

  &:hover {
    background: ${props => props.theme.colors.primary[600]};
  }
`;

const PanelHeader = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};

  h3 {
    margin: 0 0 0.5rem 0;
    color: ${props => props.theme.colors.neutral[900]};
    font-size: 1.1rem;
  }

  p {
    margin: 0;
    color: ${props => props.theme.colors.neutral[600]};
    font-size: 0.875rem;
  }
`;

const UserCard = styled.div`
  background: ${props => props.theme.background.secondary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary[300]};
    background: ${props => props.theme.colors.primary[50]};
  }
`;

const UserName = styled.div`
  font-weight: 600;
  color: ${props => props.theme.colors.neutral[900]};
  margin-bottom: 0.25rem;
`;

const UserEmail = styled.div`
  color: ${props => props.theme.colors.neutral[600]};
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
`;

const UserRole = styled.span<{ $role: string }>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;

  ${props => {
    switch (props.$role) {
      case 'adopter':
        return `
          background: ${props.theme.colors.semantic.success[100]};
          color: ${props.theme.colors.semantic.success[700]};
        `;
      case 'rescue_admin':
        return `
          background: ${props.theme.colors.primary[100]};
          color: ${props.theme.colors.primary[700]};
        `;
      case 'admin':
        return `
          background: ${props.theme.colors.secondary[100]};
          color: ${props.theme.colors.secondary[700]};
        `;
      default:
        return `
          background: ${props.theme.colors.neutral[100]};
          color: ${props.theme.colors.neutral[700]};
        `;
    }
  }}
`;

const CurrentUser = styled.div`
  background: ${props => props.theme.colors.primary[50]};
  border: 1px solid ${props => props.theme.colors.primary[200]};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;

  h4 {
    margin: 0 0 0.5rem 0;
    color: ${props => props.theme.colors.primary[800]};
    font-size: 0.875rem;
  }
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 0.5rem 1rem;
  background: ${props => props.theme.colors.semantic.error[500]};
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  margin-top: 1rem;

  &:hover {
    background: ${props => props.theme.colors.semantic.error[600]};
  }
`;

const WarningBanner = styled.div`
  background: ${props => props.theme.colors.semantic.warning[100]};
  color: ${props => props.theme.colors.semantic.warning[800]};
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  border: 1px solid ${props => props.theme.colors.semantic.warning[200]};
`;

export const DevLoginPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, setDevUser, isAuthenticated, isLoading } = useAuth();

  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }
  const handleUserLogin = async (devUser: DevUser) => {
    try {
      // Use the development setDevUser method
      if (setDevUser) {
        // Remove the role and password properties since they're not in the User type
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { role, password, ...userWithoutRole } = devUser;

        // Generate a mock authentication token for dev users
        const mockToken = `dev-token-${userWithoutRole.userId}-${Date.now()}`;
        localStorage.setItem('accessToken', mockToken);
        localStorage.setItem('authToken', mockToken); // For compatibility

        // Dev login success (for debugging in development)
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('DevLoginPanel: Setting dev user:', devUser.email, `(${role})`);
          // eslint-disable-next-line no-console
          console.log('DevLoginPanel: Generated mock token:', mockToken);
        }

        setDevUser(userWithoutRole);

        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('DevLoginPanel: User data set:', userWithoutRole);
        }

        // Wait a bit longer to ensure React state updates
        await new Promise(resolve => setTimeout(resolve, 200));

        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('DevLoginPanel: Login completed, closing panel');
        }

        setIsOpen(false);
      } else {
        console.warn('setDevUser method not available - make sure you are in development mode');
      }
    } catch (error) {
      console.error('Dev login failed:', error);
      alert('Dev login failed. Please check the console for details.');
    }
  };

  return (
    <>
      <ToggleButton $isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? 'CLOSE DEV' : 'DEV LOGIN'}
      </ToggleButton>

      <DevPanel $isOpen={isOpen}>
        <PanelHeader>
          <h3>🔧 Dev Login Panel</h3>
          <p>Quick login as different user types</p>
        </PanelHeader>

        <WarningBanner>⚠️ Development mode only - not available in production</WarningBanner>

        {/* Debug info */}
        <div
          style={{
            background: '#f3f4f6',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
          }}
        >
          <div>Auth Status:</div>
          <div>• isAuthenticated: {isAuthenticated ? '✅ true' : '❌ false'}</div>
          <div>• isLoading: {isLoading ? '⏳ true' : '✅ false'}</div>
          <div>• user: {user ? `✅ ${user.email}` : '❌ null'}</div>
        </div>

        {user && (
          <CurrentUser>
            <h4>Currently logged in as:</h4>
            <UserName>
              {user.firstName} {user.lastName}
            </UserName>
            <UserEmail>{user.email}</UserEmail>
            <LogoutButton onClick={logout}>Logout</LogoutButton>
          </CurrentUser>
        )}

        <div>
          <h4 style={{ marginBottom: '1rem', color: '#374151' }}>Available Dev Users:</h4>
          {devUsers.map(devUser => (
            <UserCard key={devUser.userId} onClick={() => handleUserLogin(devUser)}>
              <UserName>
                {devUser.firstName} {devUser.lastName}
              </UserName>
              <UserEmail>{devUser.email}</UserEmail>
              <UserRole $role={devUser.role}>{devUser.role}</UserRole>
              {!devUser.emailVerified && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#dc2626',
                  }}
                >
                  ❌ Email not verified
                </div>
              )}
            </UserCard>
          ))}
        </div>
      </DevPanel>
    </>
  );
};
