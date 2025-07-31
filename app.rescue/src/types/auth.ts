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

// Re-export role from lib.auth and permission from lib.permissions
export { RescueRole as Role, rolePermissions } from '@adopt-dont-shop/lib-auth';

// Import for type alias
import type { LoginRequest } from '@adopt-dont-shop/lib-auth';

// Type alias for backward compatibility - use LoginRequest from lib.auth
export type LoginCredentials = LoginRequest;

// Re-export Permission type from lib-permissions (no longer need local permissions file)
export type { Permission } from '@adopt-dont-shop/lib-permissions';
