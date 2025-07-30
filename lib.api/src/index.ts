// Main exports for @adopt-dont-shop/lib-api

// Services
export { ApiService, apiService, api } from './services/api-service';

// Path constants for URL construction
export { API_PATHS, buildApiPath } from './constants/api-paths';

// Infrastructure
export * from './interceptors';
export * from './errors';

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
