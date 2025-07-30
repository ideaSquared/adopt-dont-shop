// Main exports for @adopt-dont-shop/lib-auth

// Services
export { AuthService, authService } from './services/auth-service';

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
} from './types';

export { RescueRole, Permission, rolePermissions } from './types';

