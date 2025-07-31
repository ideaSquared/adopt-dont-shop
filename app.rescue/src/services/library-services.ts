/**
 * Services configuration using external libraries
 * This file configures all services using the @adopt-dont-shop/lib-* packages
 */

import { ApiService } from '@adopt-dont-shop/lib-api';
import { PetsService } from '@adopt-dont-shop/lib-pets';
import { ApplicationsService } from '@adopt-dont-shop/lib-applications';
import { RescueService } from '@adopt-dont-shop/lib-rescue';
import { AnalyticsService } from '@adopt-dont-shop/lib-analytics';
import { NotificationsService } from '@adopt-dont-shop/lib-notifications';
import { ChatService } from '@adopt-dont-shop/lib-chat';
import { DiscoveryService } from '@adopt-dont-shop/lib-discovery';
import { SearchService } from '@adopt-dont-shop/lib-search';
import { FeatureFlagsService } from '@adopt-dont-shop/lib-feature-flags';
import { ValidationService } from '@adopt-dont-shop/lib-validation';
import { PermissionsService } from '@adopt-dont-shop/lib-permissions';

// 🔧 DEBUG: Log environment variables
console.log('🔧 DEBUG: VITE_API_BASE_URL =', import.meta.env.VITE_API_BASE_URL);
console.log('🔧 DEBUG: MODE =', import.meta.env.MODE);
console.log('🔧 DEBUG: DEV =', import.meta.env.DEV);

// ✅ INDUSTRY STANDARD: Configure the global apiService FIRST
// This is critical because domain services (like AuthService) use the global apiService
import { apiService as globalApiService } from '@adopt-dont-shop/lib-api';

// Configure with the proper base URL (no '/api' path - that's added by services)
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
globalApiService.updateConfig({
  apiUrl: baseUrl,
  debug: import.meta.env.DEV,
});

console.log('🔧 DEBUG: Global ApiService configured with baseUrl:', baseUrl);
console.log('🔧 DEBUG: Global ApiService config:', globalApiService.getConfig());

// Now import domain services AFTER configuring the global apiService
import { AuthService } from '@adopt-dont-shop/lib-auth';

// ✅ CENTRALIZED: Use consistent base URL for all services
const serviceConfig = {
  apiUrl: baseUrl,
  debug: import.meta.env.DEV,
};

// Create shared API service instance with proper configuration
const apiService = new ApiService({
  apiUrl: baseUrl,
  debug: import.meta.env.MODE === 'development',
});

// Create configured service instances following app.client pattern
export const petsService = new PetsService(globalApiService);

export const applicationsService = new ApplicationsService(globalApiService, serviceConfig);

export const rescueService = new RescueService(globalApiService, serviceConfig);

export const analyticsService = new AnalyticsService(serviceConfig);

export const notificationsService = new NotificationsService(serviceConfig);

export const chatService = new ChatService({
  ...serviceConfig,
  headers: {
    Authorization: () => {
      const token = authService.getToken();
      return token ? `Bearer ${token}` : '';
    },
  },
});

export const discoveryService = new DiscoveryService(serviceConfig);

export const searchService = new SearchService({
  apiUrl: baseUrl,
  debug: import.meta.env.DEV,
});

export const featureFlagsService = new FeatureFlagsService({
  apiUrl: baseUrl,
  debug: import.meta.env.DEV,
});

export const validationService = new ValidationService();

export const permissionsService = new PermissionsService(
  {
    debug: import.meta.env.DEV,
  },
  globalApiService
);

// ✅ AuthService uses the pre-configured global apiService
export const authService = new AuthService();

// Export the API service for direct use
export { apiService, globalApiService };

// Export service classes for custom instantiation if needed
export {
  PetsService,
  ApplicationsService,
  RescueService,
  AnalyticsService,
  NotificationsService,
  ApiService,
  AuthService,
  ChatService,
  DiscoveryService,
  SearchService,
  FeatureFlagsService,
  ValidationService,
  PermissionsService,
};

// Service types re-exported for convenience
export type {
  Pet,
  PetImage,
  PetVideo,
  PetSearchFilters,
  PetStats,
} from '@adopt-dont-shop/lib-pets';

export type {
  Application,
  ApplicationData,
  ApplicationStatus,
  ApplicationWithPetInfo,
} from '@adopt-dont-shop/lib-applications';

export type {
  Rescue,
  RescueAPIResponse,
  RescueSearchFilters,
  RescueStatus,
  RescueLocation,
} from '@adopt-dont-shop/lib-rescue';

export type { AnalyticsServiceConfig, UserEngagementEvent } from '@adopt-dont-shop/lib-analytics';

export type { Notification } from '@adopt-dont-shop/lib-notifications';

export type { Permission, UserWithPermissions } from '@adopt-dont-shop/lib-permissions';
