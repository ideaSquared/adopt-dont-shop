// Export all library services
export {
  applicationService,
  discoveryService,
  matchingService,
  petService,
  rescueService,
  authService,
  chatService,
  api,
  apiService,
} from './libraryServices';

// Re-export types
export type {
  Application,
  ApplicationStatus,
  DiscoveryPet,
  SwipeAction,
  SwipeSession,
  Pet,
  PetSearchFilters,
  PaginatedResponse,
  Rescue,
  User,
  Conversation,
  Message,
  ReadStatusUpdateEvent,
} from './libraryServices';
