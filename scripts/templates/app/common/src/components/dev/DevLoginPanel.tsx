import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, RescueRole } from '@adopt-dont-shop/lib.auth';
import * as styles from './DevLoginPanel.css';

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
    <div className={styles.devPanel}>
      <h4 className={styles.devTitle}>🔧 Dev Login</h4>

      {user ? (
        <div className={styles.userInfo}>
          <div>👤 {user.firstName} {user.lastName}</div>
          <div>📧 {user.email}</div>
          <div>🎭 {user.role}</div>
          <button className={styles.devButton} onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>
          {seededDevUsers.map((devUser) => (
            <button
              className={styles.devButton}
              key={devUser.userId}
              onClick={() => handleUserLogin(devUser)}
              title={`Login as ${devUser.firstName} ${devUser.lastName} (${devUser.role})`}
            >
              {devUser.firstName} {devUser.lastName}
            </button>
          ))}
        </div>
      )}

      <button
        className={styles.devButton}
        onClick={() => setIsVisible(false)}
        style={{ marginTop: '8px', background: '#666' }}
      >
        Hide
      </button>
    </div>
  );
};
