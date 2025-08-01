import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/services';
import React, { useState } from 'react';
import styled from 'styled-components';

// Interface for dev users with description
interface DevUser extends User {
  description: string;
}

// Seeded rescue staff users for rescue app (only rescue staff types allowed)
const seededDevUsers: DevUser[] = [
  {
    userId: 'user_rescue_staff_001',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@happytails.org',
    userType: 'rescue_staff',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'Denver',
    addressLine1: '123 Rescue Street',
    postalCode: '80202',
    timezone: 'America/Denver',
    language: 'en',
    bio: 'Dedicated rescue staff member with 5+ years of experience.',
    dateOfBirth: '1988-04-12',
    phoneNumber: '(555) 123-4567',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Senior Staff Member',
  },
  {
    userId: 'user_rescue_manager_001',
    firstName: 'David',
    lastName: 'Chen',
    email: 'david.chen@happytails.org',
    userType: 'rescue_staff',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'Portland',
    addressLine1: '456 Management Ave',
    postalCode: '97201',
    timezone: 'America/Los_Angeles',
    language: 'en',
    bio: 'Rescue operations manager overseeing daily activities.',
    dateOfBirth: '1985-09-22',
    phoneNumber: '(555) 987-6543',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Operations Manager',
  },
  {
    userId: 'user_rescue_admin_001',
    firstName: 'Maria',
    lastName: 'Rodriguez',
    email: 'maria.rodriguez@happytails.org',
    userType: 'rescue_staff',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'Seattle',
    addressLine1: '789 Executive Blvd',
    postalCode: '98101',
    timezone: 'America/Los_Angeles',
    language: 'en',
    bio: 'Rescue administrator with full system access.',
    dateOfBirth: '1982-11-30',
    phoneNumber: '(555) 456-7890',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'System Administrator',
  },
  {
    userId: 'user_rescue_volunteer_001',
    firstName: 'Alex',
    lastName: 'Thompson',
    email: 'alex.thompson@happytails.org',
    userType: 'rescue_staff',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'Austin',
    addressLine1: '321 Volunteer Lane',
    postalCode: '73301',
    timezone: 'America/Chicago',
    language: 'en',
    bio: 'Passionate volunteer helping with rescue operations.',
    dateOfBirth: '1995-07-18',
    phoneNumber: '(555) 234-5678',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Active Volunteer',
  },
];

const SEEDED_PASSWORD = 'DevPassword123!';

const DevToggle = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  background: #1f2937;
  color: #fbbf24;
  border: 2px solid #fbbf24;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  z-index: 10000;
  transition: all 0.2s ease;

  &:hover {
    background: #fbbf24;
    color: #1f2937;
  }
`;

const DevPanel = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 70px;
  right: 20px;
  width: 350px;
  max-height: 80vh;
  background: white;
  border: 2px solid #fbbf24;
  border-radius: 12px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 9999;
  overflow: hidden;
  transform: translateX(${props => (props.$isOpen ? '0' : '100%')});
  opacity: ${props => (props.$isOpen ? '1' : '0')};
  transition: all 0.3s ease;
`;

const DevHeader = styled.div`
  background: #1f2937;
  color: #fbbf24;
  padding: 1rem;
  font-weight: 600;
  font-size: 1rem;
  text-align: center;
`;

const DevContent = styled.div`
  padding: 1rem;
  max-height: 60vh;
  overflow-y: auto;
`;

const UserCard = styled.button`
  display: block;
  width: 100%;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    border-color: #fbbf24;
    background: #fffbeb;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #e5e7eb;
  }
`;

const UserName = styled.div`
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
`;

const UserEmail = styled.div`
  color: #6b7280;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
`;

const UserMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const UserRole = styled.span<{ $userType: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  color: white;
  background: ${props => {
    switch (props.$userType) {
      case 'rescue_staff':
        return '#059669';
      case 'admin':
        return '#dc2626';
      case 'moderator':
        return '#7c3aed';
      case 'adopter':
        return '#2563eb';
      default:
        return '#6b7280';
    }
  }};
`;

const UserDescription = styled.span`
  color: #6b7280;
  font-size: 0.75rem;
  font-style: italic;
`;

const CurrentUserPanel = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;

  h4 {
    margin: 0 0 0.5rem 0;
    color: #1e40af;
    font-size: 0.875rem;
  }
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 0.5rem 1rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  transition: background-color 0.2s ease;

  &:hover {
    background: #b91c1c;
  }
`;

const WarningBanner = styled.div`
  background: #fef3c7;
  color: #92400e;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  margin-bottom: 1rem;
  border: 1px solid #fbbf24;
`;

export const DevLoginPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, login, logout, isAuthenticated, setDevUser } = useAuth();

  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  const handleUserLogin = async (devUser: DevUser) => {
    try {
      // In development, we can either use real auth or dev user mode
      // For now, let's use dev user mode for faster development
      if (setDevUser) {
        setDevUser(devUser);
        setIsOpen(false);
      } else {
        // Fallback to real authentication
        await login({ email: devUser.email, password: SEEDED_PASSWORD });
        setIsOpen(false);
      }
    } catch (error) {
      console.error('DevLoginPanel: Login error:', error);
      alert(`Login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('DevLoginPanel: Logout error:', error);
    }
  };

  return (
    <>
      <DevToggle onClick={() => setIsOpen(!isOpen)}>🔧 DEV LOGIN</DevToggle>

      <DevPanel $isOpen={isOpen}>
        <DevHeader>Rescue Dev Login Panel</DevHeader>

        <DevContent>
          <WarningBanner>⚠️ Development only - uses real authentication</WarningBanner>

          {isAuthenticated && user && (
            <CurrentUserPanel>
              <h4>Currently Logged In:</h4>
              <UserName>
                {user.firstName} {user.lastName}
              </UserName>
              <UserEmail>{user.email}</UserEmail>
              <UserRole $userType={user.userType || 'unknown'}>
                {user.userType || 'unknown'}
              </UserRole>
              <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
            </CurrentUserPanel>
          )}

          <h4 style={{ marginBottom: '1rem', color: '#374151', fontSize: '0.9rem' }}>
            Available Rescue Staff (Password: {SEEDED_PASSWORD}):
          </h4>

          {seededDevUsers.map(devUser => (
            <UserCard
              key={devUser.userId}
              onClick={() => handleUserLogin(devUser)}
              disabled={isAuthenticated && user?.email === devUser.email}
            >
              <UserName>
                {devUser.firstName} {devUser.lastName}
              </UserName>
              <UserEmail>{devUser.email}</UserEmail>
              <UserMeta>
                <UserRole $userType={devUser.userType || 'unknown'}>
                  {devUser.userType || 'unknown'}
                </UserRole>
                <UserDescription>{devUser.description}</UserDescription>
              </UserMeta>
              {!devUser.emailVerified && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.7rem',
                    color: '#dc2626',
                    fontWeight: 500,
                  }}
                >
                  ⚠️ Email not verified
                </div>
              )}
            </UserCard>
          ))}
        </DevContent>
      </DevPanel>
    </>
  );
};

export default DevLoginPanel;
