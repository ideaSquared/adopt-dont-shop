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
import { AuthService } from '@adopt-dont-shop/lib-auth';

// Create shared API service instance with proper configuration
const apiService = new ApiService({
  apiUrl: import.meta.env.VITE_API_BASE_URL || '',
  debug: import.meta.env.MODE === 'development',
});

// Create configured service instances following app.client pattern
export const petsService = new PetsService(apiService);

export const applicationsService = new ApplicationsService(apiService, {
  apiUrl: import.meta.env.VITE_API_BASE_URL || '',
  debug: import.meta.env.DEV,
});

export const rescueService = new RescueService(apiService, {
  apiUrl: import.meta.env.VITE_API_BASE_URL || '',
});

export const analyticsService = new AnalyticsService({
  apiUrl: import.meta.env.VITE_API_BASE_URL || '',
  debug: import.meta.env.DEV,
  provider: 'internal' as const,
  autoTrackPageViews: true,
  sessionTimeout: 30,
  sampleRate: 100,
});

export const notificationsService = new NotificationsService({
  apiUrl: import.meta.env.VITE_API_BASE_URL || '',
  debug: import.meta.env.DEV,
});

// Create auth service without parameters like app.client
export const authService = new AuthService();

// Export the API service for direct use
export { apiService };

// Export service classes for custom instantiation if needed
export {
  PetsService,
  ApplicationsService,
  RescueService,
  AnalyticsService,
  NotificationsService,
  ApiService,
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
