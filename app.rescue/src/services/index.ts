// Re-export all library services for easy importing
export { AuthService } from '@adopt-dont-shop/lib-auth';
export { PetsService } from '@adopt-dont-shop/lib-pets';
export { RescueService } from '@adopt-dont-shop/lib-rescue';
export { ApplicationsService } from '@adopt-dont-shop/lib-applications';
export { ChatService } from '@adopt-dont-shop/lib-chat';
export { AnalyticsService } from '@adopt-dont-shop/lib-analytics';
export { NotificationsService } from '@adopt-dont-shop/lib-notifications';
export { FeatureFlagsService } from '@adopt-dont-shop/lib-feature-flags';
export { PermissionsService } from '@adopt-dont-shop/lib-permissions';

// Export custom rescue app services
export { RescueApplicationService } from './applicationService';
export { SearchService } from '@adopt-dont-shop/lib-search';
export { DiscoveryService } from '@adopt-dont-shop/lib-discovery';
export { ValidationService } from '@adopt-dont-shop/lib-validation';

// Export legacy library services instances for compatibility
export {
  analyticsService,
  applicationService,
  petService,
  rescueService,
  chatService,
  notificationsService,
  permissionsService,
  validationService,
  authService,
  apiService,
} from './libraryServices';

// Export dashboard service
export { dashboardService } from './dashboardService';

// Re-export types from libraries
export type { LoginRequest, RegisterRequest, User, AuthResponse } from '@adopt-dont-shop/lib-auth';

export type { Pet } from '@adopt-dont-shop/lib-pets';

export type { Application, ApplicationStatus } from '@adopt-dont-shop/lib-applications';

export type { Rescue } from '@adopt-dont-shop/lib-rescue';

export type { Conversation, Message } from '@adopt-dont-shop/lib-chat';
