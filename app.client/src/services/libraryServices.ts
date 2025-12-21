/**
 * Library Service Exports
 * This file provides access to all the new library services
 * Part of Phase 2 - Core Infrastructure Migration
 */

// Import library services (removed unused ApiService import)
import { AnalyticsService } from '@adopt-dont-shop/lib.analytics';
import { ApplicationsService } from '@adopt-dont-shop/lib.applications';
import { DiscoveryService } from '@adopt-dont-shop/lib.discovery';
import { PetsService } from '@adopt-dont-shop/lib.pets';
import { RescueService } from '@adopt-dont-shop/lib.rescue';
import { ChatService } from '@adopt-dont-shop/lib.chat';
import { SearchService } from '@adopt-dont-shop/lib.search';
import { NotificationsService } from '@adopt-dont-shop/lib.notifications';
import { PermissionsService } from '@adopt-dont-shop/lib.permissions';

// 🔧 DEBUG: Log environment variables
console.log('🔧 DEBUG: VITE_API_BASE_URL =', import.meta.env.VITE_API_BASE_URL);
console.log('🔧 DEBUG: MODE =', import.meta.env.MODE);
console.log('🔧 DEBUG: DEV =', import.meta.env.DEV);

// ✅ INDUSTRY STANDARD: Configure the global apiService FIRST
// This is critical because domain services (like AuthService) use the global apiService
import { apiService as globalApiService } from '@adopt-dont-shop/lib.api';

// Configure with the proper base URL (no '/api' path - that's added by services)
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
globalApiService.updateConfig({
  apiUrl: baseUrl,
  debug: import.meta.env.DEV,
});

console.log('🔧 DEBUG: Global ApiService configured with baseUrl:', baseUrl);
console.log('🔧 DEBUG: Global ApiService config:', globalApiService.getConfig());

// Now import domain services AFTER configuring the global apiService
import { AuthService } from '@adopt-dont-shop/lib.auth';

// ✅ CENTRALIZED: Use consistent base URL for all services
const serviceConfig = {
  apiUrl: baseUrl,
  debug: import.meta.env.DEV,
};

// Create configured service instances with centralized configuration
export const analyticsService = new AnalyticsService(serviceConfig);

export const applicationService = new ApplicationsService(globalApiService, serviceConfig);

export const discoveryService = new DiscoveryService(serviceConfig);

export const petService = new PetsService(globalApiService);

export const rescueService = new RescueService(globalApiService, serviceConfig);

// ✅ AuthService uses the pre-configured global apiService
export const authService = new AuthService();

// Export the configured API service for direct use
export const apiService = globalApiService;
export const api = globalApiService;

// ✅ Configure chatService with authentication headers and Socket.IO URL
export const chatService = new ChatService({
  ...serviceConfig,
  socketUrl: baseUrl, // Socket.IO connects directly to base URL
  headers: {
    Authorization: () => {
      const token = authService.getToken();
      return token ? `Bearer ${token}` : '';
    },
  },
});

export const searchService = new SearchService({
  ...serviceConfig,
  debug: import.meta.env.MODE === 'development',
});

export const notificationsService = new NotificationsService(serviceConfig);

export const permissionsService = new PermissionsService({
  debug: import.meta.env.DEV,
});

// Re-export types for convenience
export type { UserEngagementEvent, PageViewEvent } from '@adopt-dont-shop/lib.analytics';

export type {
  Application,
  ApplicationData,
  ApplicationStatus,
} from '@adopt-dont-shop/lib.applications';

export type {
  DiscoveryPet,
  SwipeAction,
  SwipeStats,
  SwipeSession,
} from '@adopt-dont-shop/lib.discovery';

export type { Pet, PetSearchFilters, PaginatedResponse } from '@adopt-dont-shop/lib.pets';

export type {
  Rescue,
  RescueSearchFilters,
  RescueStatus,
  RescueType,
  RescueLocation,
} from '@adopt-dont-shop/lib.rescue';

export type { User, AuthResponse, LoginRequest, RegisterRequest } from '@adopt-dont-shop/lib.auth';

export type {
  ChatServiceConfig,
  Conversation,
  Message,
  TypingIndicator,
  ConnectionStatus,
  ReconnectionConfig,
  QueuedMessage,
} from '@adopt-dont-shop/lib.chat';

export { useConnectionStatus } from '@adopt-dont-shop/lib.chat';

export type { SearchServiceConfig, SearchServiceOptions } from '@adopt-dont-shop/lib.search';

export type { Notification, NotificationPreferences } from '@adopt-dont-shop/lib.notifications';

export type { Permission, UserWithPermissions } from '@adopt-dont-shop/lib.permissions';
