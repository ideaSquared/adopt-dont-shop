// Main exports for @adopt-dont-shop/lib.auth

// Services
export { AuthService, authService } from './services/auth-service';

// Context & Hooks
export { AuthProvider, AuthContext } from './contexts/AuthContext';
export type { AuthContextType, AuthProviderProps } from './contexts/AuthContext';
export { useAuth } from './hooks/useAuth';

// Components
export { AuthLayout } from './components/AuthLayout';
export type { AuthLayoutProps } from './components/AuthLayout';
export { LoginForm } from './components/LoginForm';
export type { LoginFormProps } from './components/LoginForm';
export { RegisterForm } from './components/RegisterForm';
export type { RegisterFormProps } from './components/RegisterForm';
export { TwoFactorSettings } from './components/TwoFactorSettings';
export type { TwoFactorSettingsProps } from './components/TwoFactorSettings';

// Types
export * from './types';

// Re-export specific types for convenience
export type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Rescue,
  ChangePasswordRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  TwoFactorSetupResponse,
  TwoFactorEnableResponse,
  TwoFactorDisableResponse,
  TwoFactorBackupCodesResponse,
} from './types';

export { RescueRole, Permission, rolePermissions } from './types';
