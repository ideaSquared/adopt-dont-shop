// Main exports for @adopt-dont-shop/lib.auth

// Services
export { AuthService, authService } from './services/auth-service';

// Context & Hooks
export { AuthProvider, AuthContext } from './contexts/AuthContext';
export type { AuthContextType, AuthProviderProps } from './contexts/AuthContext';
export { useAuth } from './hooks/useAuth';
export {
  PermissionsProvider,
  PermissionsContext,
  usePermissions,
} from './contexts/PermissionsContext';
export type {
  PermissionsProviderProps,
  PermissionsContextValue,
} from './contexts/PermissionsContext';
export {
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
} from './hooks/useHasPermission';
export type { PermissionCheckResult } from './hooks/useHasPermission';

// Components
export { PermissionGate } from './components/PermissionGate';
export type { PermissionGateProps } from './components/PermissionGate';
export { AuthLayout } from './components/AuthLayout';
export type { AuthLayoutProps } from './components/AuthLayout';
export { LoginForm } from './components/LoginForm';
export type { LoginFormProps } from './components/LoginForm';
export { RegisterForm } from './components/RegisterForm';
export type { RegisterFormProps } from './components/RegisterForm';
export { SocialSignInButtons } from './components/SocialSignInButtons';
export type { SocialSignInButtonsProps, SocialProvider } from './components/SocialSignInButtons';
export { TwoFactorSettings } from './components/TwoFactorSettings';
export type { TwoFactorSettingsProps } from './components/TwoFactorSettings';
export { BackupCodesReveal } from './components/BackupCodesReveal';
export type { BackupCodesRevealProps } from './components/BackupCodesReveal';

// Types
export * from './types';

// Re-export specific types for convenience
export type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ChangePasswordRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  TwoFactorSetupResponse,
  TwoFactorEnableResponse,
  TwoFactorDisableResponse,
  TwoFactorBackupCodesResponse,
} from './types';

export { RescueRole, Permission, rolePermissions } from './types';
