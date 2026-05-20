import { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '@/contexts/AuthContext';
import { User, RescueRole } from '@adopt-dont-shop/lib.auth';

const DevPanel = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 16px;
  border-radius: 8px;
  z-index: 1000;
  min-width: 250px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);

  @media (max-width: 768px) {
    position: relative;
    top: auto;
    right: auto;
    margin: 16px;
    width: calc(100% - 32px);
  }
`;

const DevButton = styled.button`
  background: #007acc;
  color: white;
  border: none;
  padding: 8px 12px;
  margin: 4px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  
  &:hover {
    background: #005a9e;
  }
`;

const DevTitle = styled.h4`
  margin: 0 0 12px 0;
  color: #00ff88;
  font-size: 14px;
`;

const UserInfo = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 11px;
`;

// Seeded development users
const seededDevUsers: User[] = [
  {
    userId: 'dev-admin',
    email: 'admin@dev.local',
    firstName: 'Admin',
    lastName: 'User',
    emailVerified: true,
    userType: 'admin',
    status: 'active',
    role: RescueRole.RESCUE_ADMIN,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    userId: 'dev-staff', 
    email: 'staff@dev.local',
    firstName: 'Staff',
    lastName: 'User',
    emailVerified: true,
    userType: 'rescue_staff',
    status: 'active',
    role: RescueRole.RESCUE_STAFF,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    userId: 'dev-volunteer',
    email: 'volunteer@dev.local', 
    firstName: 'Volunteer',
    lastName: 'User',
    emailVerified: true,
    userType: 'rescue_staff',
    status: 'active',
    role: RescueRole.RESCUE_VOLUNTEER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    userId: 'dev-adopter',
    email: 'adopter@dev.local',
    firstName: 'Potential',
    lastName: 'Adopter',
    emailVerified: true,
    userType: 'adopter',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const DevLoginPanel = () => {
  const { user, logout, setDevUser } = useAuth();
  const [isVisible, setIsVisible] = useState(import.meta.env.NODE_ENV === 'development');

  if (!isVisible || import.meta.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleUserLogin = (devUser: User) => {
    setDevUser(devUser);
  };

  return (
    <DevPanel>
      <DevTitle>🔧 Dev Login</DevTitle>
      
      {user ? (
        <UserInfo>
          <div>👤 {user.firstName} {user.lastName}</div>
          <div>📧 {user.email}</div>
          <div>🎭 {user.role}</div>
          <DevButton onClick={logout}>Logout</DevButton>
        </UserInfo>
      ) : (
        <div>
          {seededDevUsers.map((devUser) => (
            <DevButton
              key={devUser.userId}
              onClick={() => handleUserLogin(devUser)}
              title={`Login as ${devUser.firstName} ${devUser.lastName} (${devUser.role})`}
            >
              {devUser.firstName} {devUser.lastName}
            </DevButton>
          ))}
        </div>
      )}
      
      <DevButton 
        onClick={() => setIsVisible(false)}
        style={{ marginTop: '8px', background: '#666' }}
      >
        Hide
      </DevButton>
    </DevPanel>
  );
};