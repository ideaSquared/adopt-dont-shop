// Streamlined API service for app.rescue using shared libraries
import {
  ApiService,
  defaultApiService,
  petDataTransformer,
  type ApiConfig,
} from '@adopt-dont-shop/lib-api';
import {
  AuthService,
  type AuthConfig,
  type User,
  type AuthResponse,
  type LoginRequest,
  type RegisterRequest,
  Role,
} from '@adopt-dont-shop/lib-auth';

// Configure the API service for rescue app
const apiConfig: ApiConfig = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  defaultTimeout: 10000,
};

// Create configured instances
export const apiService = new ApiService(apiConfig);
export const api = apiService;

// Register pet data transformer for automatic pet data transformation
apiService.registerTransformer('/pets', petDataTransformer);

// Configure auth service
const authConfig: AuthConfig = {
  devMode: import.meta.env.DEV,
  userStorageKey: 'user',
  onUnauthorized: () => {
    // Custom unauthorized handler for rescue app
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  },
};

export const authService = new AuthService(apiService, authConfig);

// Re-export types for convenience
export type { User, AuthResponse, LoginRequest, RegisterRequest };
export { Role };

// Rescue-specific auth helpers
export const rescueAuthHelpers = {
  // Check if user can manage pets
  canManagePets(): boolean {
    return authService.hasAnyRole([Role.RESCUE_STAFF, Role.RESCUE_MANAGER, Role.RESCUE_ADMIN]);
  },

  // Check if user can manage applications
  canManageApplications(): boolean {
    return authService.hasAnyRole([Role.RESCUE_MANAGER, Role.RESCUE_ADMIN]);
  },

  // Check if user can manage rescue settings
  canManageRescueSettings(): boolean {
    return authService.hasRole(Role.RESCUE_ADMIN);
  },

  // Dev login shortcuts for rescue app
  async devLoginAsStaff(): Promise<void> {
    await authService.loginWithDevToken({
      userType: 'rescue_staff',
      role: Role.RESCUE_STAFF,
      mockData: {
        first_name: 'Staff',
        last_name: 'Member',
        email: 'staff@dev.local',
      },
    });
  },

  async devLoginAsManager(): Promise<void> {
    await authService.loginWithDevToken({
      userType: 'rescue_manager',
      role: Role.RESCUE_MANAGER,
      mockData: {
        first_name: 'Rescue',
        last_name: 'Manager',
        email: 'manager@dev.local',
      },
    });
  },

  async devLoginAsAdmin(): Promise<void> {
    await authService.loginWithDevToken({
      userType: 'rescue_admin',
      role: Role.RESCUE_ADMIN,
      mockData: {
        first_name: 'Rescue',
        last_name: 'Admin',
        email: 'admin@dev.local',
      },
    });
  },
};

// Export everything apps might need
export {
  // Core services
  apiService as default,

  // Auth helpers
  rescueAuthHelpers,
};
