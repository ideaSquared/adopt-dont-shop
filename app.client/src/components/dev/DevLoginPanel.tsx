import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import React, { useState } from 'react';
import styled from 'styled-components';

// Interface for dev users with description
interface DevUser extends User {
  description: string;
}

// Seeded users copied directly from backend/src/seeders/04-users.ts
const seededDevUsers: DevUser[] = [
  {
    userId: 'user_superadmin_001',
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@adoptdontshop.dev',
    userType: 'admin',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'New York',
    timezone: 'America/New_York',
    language: 'en',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Full system access',
  },
  {
    userId: 'user_admin_001',
    firstName: 'System',
    lastName: 'Administrator',
    email: 'admin@adoptdontshop.dev',
    userType: 'admin',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
    language: 'en',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Platform administrator',
  },
  {
    userId: 'user_moderator_001',
    firstName: 'Content',
    lastName: 'Moderator',
    email: 'moderator@adoptdontshop.dev',
    userType: 'moderator',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'Chicago',
    timezone: 'America/Chicago',
    language: 'en',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Content moderator',
  },
  {
    userId: 'user_rescue_admin_001',
    firstName: 'Rescue',
    lastName: 'Manager',
    email: 'rescue.manager@pawsrescue.dev',
    userType: 'rescue_staff',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'Austin',
    timezone: 'America/Chicago',
    language: 'en',
    bio: 'Passionate about animal rescue and finding homes for pets in need.',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Paws Rescue manager',
  },
  {
    userId: 'user_rescue_staff_001',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@pawsrescue.dev',
    userType: 'rescue_staff',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'Austin',
    timezone: 'America/Chicago',
    language: 'en',
    bio: 'Veterinary technician helping rescued animals get healthy and ready for adoption.',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Veterinary technician',
  },
  {
    userId: 'user_rescue_admin_002',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria@happytailsrescue.dev',
    userType: 'rescue_staff',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'Miami',
    timezone: 'America/New_York',
    language: 'en',
    bio: 'Director of Happy Tails Rescue, specializing in senior dog adoption.',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Happy Tails director',
  },
  {
    userId: 'user_adopter_001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@gmail.com',
    userType: 'adopter',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'Denver',
    addressLine1: '123 Main Street',
    postalCode: '80202',
    timezone: 'America/Denver',
    language: 'en',
    bio: 'Looking to adopt a friendly dog for my family.',
    dateOfBirth: '1985-06-15',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Family dog seeker',
  },
  {
    userId: 'user_adopter_002',
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@yahoo.com',
    userType: 'adopter',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'Portland',
    addressLine1: '456 Oak Avenue',
    postalCode: '97201',
    timezone: 'America/Los_Angeles',
    language: 'en',
    bio: 'Cat lover looking for a special feline companion.',
    dateOfBirth: '1992-03-22',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Cat lover',
  },
  {
    userId: 'user_adopter_003',
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'michael.brown@outlook.com',
    userType: 'adopter',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'Seattle',
    addressLine1: '789 Pine Street',
    postalCode: '98101',
    timezone: 'America/Los_Angeles',
    language: 'en',
    bio: 'Experienced dog owner looking for an active companion for hiking.',
    dateOfBirth: '1988-11-10',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Active dog owner',
  },
  {
    userId: 'user_adopter_004',
    firstName: 'Jessica',
    lastName: 'Wilson',
    email: 'jessica.wilson@gmail.com',
    userType: 'adopter',
    status: 'active',
    emailVerified: true,
    country: 'US',
    city: 'Boston',
    addressLine1: '321 Elm Street',
    postalCode: '02101',
    timezone: 'America/New_York',
    language: 'en',
    bio: 'First-time pet owner looking for a gentle, well-trained pet.',
    dateOfBirth: '1990-07-18',
    termsAcceptedAt: new Date().toISOString(),
    privacyPolicyAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'First-time pet owner',
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
  gap: 0.5rem;
`;

const UserRole = styled.span<{ $userType: string }>`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;

  ${props => {
    switch (props.$userType) {
      case 'adopter':
        return `
          background: #dcfce7;
          color: #166534;
        `;
      case 'rescue_staff':
        return `
          background: #dbeafe;
          color: #1e40af;
        `;
      case 'admin':
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      case 'volunteer':
        return `
          background: #e0e7ff;
          color: #3730a3;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
        `;
    }
  }}
`;

const UserDescription = styled.div`
  font-size: 0.7rem;
  color: #9ca3af;
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
  const { user, login, logout, isAuthenticated } = useAuth();

  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }
  const handleUserLogin = async (devUser: DevUser) => {
    try {
      await login({ email: devUser.email, password: SEEDED_PASSWORD });
      setIsOpen(false);
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
        <DevHeader>Development Login Panel</DevHeader>

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
            Available Users (Password: {SEEDED_PASSWORD}):
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
                  }}
                >
                  ❌ Email not verified
                </div>
              )}
            </UserCard>
          ))}
        </DevContent>
      </DevPanel>
    </>
  );
};
