// Export all services for the rescue app
export { api, apiService } from './api';
export { authService } from './authService';
export { chatService } from './chatService';
export { applicationService } from './applicationService';
export { petService } from './enhancedPetService';

// Re-export existing API services
export * from './api/authService';
export * from './api/baseService';
export * from './api/dashboardService';
export * from './api/petService';

// Export types from enhanced services
export type {
  Pet,
  PetPhoto,
  CreatePetRequest,
  UpdatePetRequest,
  PetListResponse,
  PetFilters,
} from './enhancedPetService';
