// Re-export auth types from lib.auth - no local duplicates needed
export type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ChangePasswordRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  Rescue,
} from '@adopt-dont-shop/lib-auth';

// Re-export role and permission types from lib.auth
export { RescueRole as Role, Permission, rolePermissions } from '@adopt-dont-shop/lib-auth';

// Import for type alias
import type { LoginRequest } from '@adopt-dont-shop/lib-auth';

// Type alias for backward compatibility - use LoginRequest from lib.auth
export type LoginCredentials = LoginRequest;
