// Use the shared lib.api singleton. AuthProvider from @adopt-dont-shop/lib.auth
// registers onUnauthorized on this singleton via updateConfig(), which clears
// React state, invalidates React Query cache, and shows the session-expired
// toast. A separate ApiService instance would bypass all of that.
import { apiService } from '@adopt-dont-shop/lib.api';

// Configure the singleton with the admin app's base URL.
apiService.updateConfig({
  apiUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  debug: import.meta.env.DEV,
});

// Export the configured API service
export const globalApiService = apiService;
export { apiService };
export const api = apiService;

// Re-export types for convenience
export type { User, AdminUser, UserType, UserStatus } from '../types/user';

// NOTE: The original lib-admin package does not exist in this monorepo.
// Admin-specific services should be created in app.admin/src/services/ as needed.
// For example: rescueService.ts, userService.ts, etc.
//
// These services use the globalApiService instance configured above.
