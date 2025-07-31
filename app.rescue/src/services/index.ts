// Export configured service instances from library-services
export {
  authService,
  petsService,
  applicationsService,
  rescueService,
  analyticsService,
  notificationsService,
  chatService,
  discoveryService,
  searchService,
  featureFlagsService,
  validationService,
  permissionsService,
  apiService,
} from './library-services';

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
} from './library-services';

// Re-export types for convenience from library-services
export type {
  Pet,
  PetImage,
  PetVideo,
  PetSearchFilters,
  PetStats,
  Application,
  ApplicationData,
  ApplicationStatus,
  ApplicationWithPetInfo,
  Rescue,
  RescueAPIResponse,
  RescueSearchFilters,
  RescueStatus,
  RescueLocation,
  AnalyticsServiceConfig,
  UserEngagementEvent,
  Notification,
} from './library-services';

// Re-export auth types directly (these are commonly used)
export type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ChangePasswordRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '@adopt-dont-shop/lib-auth';

// Re-export API types directly (these are commonly used)
export type { ApiResponse, PaginatedResponse } from '@adopt-dont-shop/lib-api';
