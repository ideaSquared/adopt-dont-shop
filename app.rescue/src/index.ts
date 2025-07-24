// Component exports for the Rescue App

// Navigation components
export { ProtectedRoute } from './components/navigation/ProtectedRoute';

// Authentication pages
export { LoginPage } from './pages/auth/LoginPage';

// Dashboard pages
export { DashboardPage } from './pages/dashboard/DashboardPage';

// Contexts
export { AuthProvider, useAuth, usePermissions } from './contexts/AuthContext';

// Types
export type { User, Role, Permission, LoginRequest, ApiResponse } from './types';
