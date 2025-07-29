// Export all library services
export {
  analyticsService,
  applicationService,
  discoveryService,
  petService,
  rescueService,
  authService,
  chatService,
  searchService,
  notificationsService,
  featureFlagsService,
  permissionsService,
} from './libraryServices';

// Legacy API utilities (kept for compatibility)
export { api } from './api';

// Re-export types
export type {
  UserEngagementEvent,
  PageViewEvent,
  Application,
  ApplicationData,
  ApplicationStatus,
  DiscoveryPet,
  SwipeAction,
  SwipeStats,
  SwipeSession,
  Pet,
  PetSearchFilters,
  PaginatedResponse,
  Rescue,
  RescueSearchFilters,
  RescueStatus,
  RescueType,
  RescueLocation,
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ChatServiceConfig,
  Conversation,
  Message,
  TypingIndicator,
  SearchServiceConfig,
  SearchServiceOptions,
  Notification,
  NotificationPreferences,
  FeatureFlag,
  DynamicConfig,
  Permission,
  UserWithPermissions,
} from './libraryServices';
