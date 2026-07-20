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

// Frontend test factories (ADS-718)
export { createMockUser, resetMockUserCounter, type MockUser } from './test-utils/factories';

// Utils (could add dev utilities here in the future)
export const isDevelopmentMode = () => {
  if (typeof window !== 'undefined') {
    // Only treat explicitly local hostnames as dev. The previous
    // hostname.includes('dev') check would have exposed dev tooling on
    // production-adjacent hosts like dev.example.com — removed intentionally.
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }
  // Case-insensitive so a "Development" or "DEVELOPMENT" NODE_ENV
  // doesn't silently disable dev tooling on the server side.
  return process.env.NODE_ENV?.trim().toLowerCase() === 'development';
};

// Development-only wrapper component
export interface DevOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const DevOnly: React.FC<DevOnlyProps> = ({ children, fallback = null }) => {
  return isDevelopmentMode() ? children : fallback;
};
