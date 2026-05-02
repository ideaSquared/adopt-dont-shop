import { ApiService, AuthenticationError } from '@adopt-dont-shop/lib.api';

// Create the global API service instance (tokens are in HttpOnly cookies)
export const globalApiService = new ApiService({
  apiUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  debug: import.meta.env.DEV,
});

// Add error interceptor for handling 401 responses
globalApiService.interceptors.addErrorInterceptor((error: unknown) => {
  if (
    error instanceof AuthenticationError ||
    (error as { response?: { status?: number } })?.response?.status === 401
  ) {
    // Clear non-sensitive user data
    localStorage.removeItem('user');

    // Redirect to login page
    window.location.href = '/login';
  }

  throw error;
});

// Export the configured API service
export const apiService = globalApiService;

// Export additional API service alias for compatibility
export const api = globalApiService;

// Re-export types for convenience
export type { User, AdminUser, UserType, UserStatus } from '../types/user';

// NOTE: The original lib-admin package does not exist in this monorepo.
// Admin-specific services should be created in app.admin/src/services/ as needed.
// For example: rescueService.ts, userService.ts, etc.
//
// These services use the globalApiService instance configured above.
