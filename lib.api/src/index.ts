// Main exports for @adopt-dont-shop/lib-api

// Services
export { ApiService, apiService, api } from './services/api-service';

// Types
export type {
  // Configuration types
  ApiServiceConfig,
  ApiServiceOptions,
  FetchOptions,
  
  // Response types
  BaseResponse,
  ErrorResponse,
  ApiResponse,
  PaginatedResponse,
  
  // Pet types
  ApiPet,
  TransformedPet,
  PetImage,
  PetLocation,
  PetRescue,
} from './types';

// Re-export all types
export * from './types';
