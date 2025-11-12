import React from 'react';

// Hooks
export { useEtherealCredentials } from './hooks/useEtherealCredentials';
export { useSeededUsers } from './hooks/useSeededUsers';

// Components
export { EtherealCredentialsPanel } from './components/EtherealCredentialsPanel';
export {
  DevPanelComponent,
  type DevUser,
  type DevPanelAuthContext,
  type DevPanelProps,
} from './components/DevPanel';

// Seeded dev user data and utilities
export {
  seededDevUsers,
  SEEDED_PASSWORD,
  getDevUsersByType,
  getAdminUsers,
  getRescueUsers,
  getAdopterUsers,
  getAllDevUsers,
} from './data/seededUsers';

// Utils (could add dev utilities here in the future)
export const isDevelopmentMode = () => {
  if (typeof window !== 'undefined') {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('dev')
    );
  }
  return process.env.NODE_ENV === 'development';
};

// Development-only wrapper component
export interface DevOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const DevOnly: React.FC<DevOnlyProps> = ({ children, fallback = null }) => {
  return isDevelopmentMode() ? children : fallback;
};
