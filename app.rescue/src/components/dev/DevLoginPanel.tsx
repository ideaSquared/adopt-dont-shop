import { useAuth } from '@/contexts/AuthContext';
import { User, Role } from '@/types/auth';
import React, { useState } from 'react';
import styled from 'styled-components';

// Interface for dev users with description
interface DevUser extends User {
  description: string;
}

// Seeded rescue staff users for the rescue app (from service.backend/src/seeders/04-users.ts)
const seededDevUsers: DevUser[] = [
  {
    user_id: 'user_rescue_admin_001',
    first_name: 'Rescue',
    last_name: 'Manager',
    email: 'rescue.manager@pawsrescue.dev',
    role: Role.RESCUE_ADMIN,
    rescue_id: 'rescue_001',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    description: 'Rescue Administrator - Paws Rescue',
  },
  {
    user_id: 'user_rescue_staff_001',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.johnson@pawsrescue.dev',
    role: Role.RESCUE_STAFF,
    rescue_id: 'rescue_001',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    description: 'Veterinary Technician - Paws Rescue',
  },
  {
    user_id: 'user_rescue_admin_002',
    first_name: 'Maria',
    last_name: 'Garcia',
    email: 'maria@happytailsrescue.dev',
    role: Role.RESCUE_ADMIN,
    rescue_id: 'rescue_002',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    description: 'Director - Happy Tails Rescue',
  },
];

const SEEDED_PASSWORD = 'DevPassword123!';

const DevToggle = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  background: #1f2937;
  color: #10b981;
  border: 2px solid #10b981;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  z-index: 10000;
  transition: all 0.2s ease;

  &:hover {
    background: #10b981;
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
  border: 2px solid #10b981;
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
  color: #10b981;
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
    border-color: #10b981;
    background: #ecfdf5;
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

const UserRole = styled.span<{ $role: Role }>`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;

  ${props => {
    switch (props.$role) {
      case Role.RESCUE_ADMIN:
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      case Role.RESCUE_MANAGER:
        return `
          background: #dbeafe;
          color: #1e40af;
        `;
      case Role.RESCUE_STAFF:
        return `
          background: #dcfce7;
          color: #166534;
        `;
      case Role.VOLUNTEER:
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
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;

  h4 {
    margin: 0 0 0.5rem 0;
    color: #047857;
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
      <DevToggle onClick={() => setIsOpen(!isOpen)}>🐾 DEV LOGIN</DevToggle>

      <DevPanel $isOpen={isOpen}>
        <DevHeader>Rescue Dev Login Panel</DevHeader>

        <DevContent>
          <WarningBanner>⚠️ Development only - uses real authentication</WarningBanner>

          {isAuthenticated && user && (
            <CurrentUserPanel>
              <h4>Currently Logged In:</h4>
              <UserName>
                {user.first_name} {user.last_name}
              </UserName>
              <UserEmail>{user.email}</UserEmail>
              <UserRole $role={user.role}>{user.role.replace('_', ' ')}</UserRole>
              <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
            </CurrentUserPanel>
          )}

          <h4 style={{ marginBottom: '1rem', color: '#374151', fontSize: '0.9rem' }}>
            Available Rescue Staff (Password: {SEEDED_PASSWORD}):
          </h4>

          {seededDevUsers.map(devUser => (
            <UserCard
              key={devUser.user_id}
              onClick={() => handleUserLogin(devUser)}
              disabled={isAuthenticated && user?.email === devUser.email}
            >
              <UserName>
                {devUser.first_name} {devUser.last_name}
              </UserName>
              <UserEmail>{devUser.email}</UserEmail>
              <UserMeta>
                <UserRole $role={devUser.role}>{devUser.role.replace('_', ' ')}</UserRole>
                <UserDescription>{devUser.description}</UserDescription>
              </UserMeta>
            </UserCard>
          ))}
        </DevContent>
      </DevPanel>
    </>
  );
};
