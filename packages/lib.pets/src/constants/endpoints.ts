/**
 * API Endpoints for Pets Service
 * Centralized endpoint definitions following industry standard patterns
 */

export const PETS_ENDPOINTS = {
  // Core pet operations
  PETS: '/api/v1/pets',
  PET_BY_ID: (id: string) => `/api/v1/pets/${id}`,

  // Breed information
  PET_BREEDS: '/api/v1/pets/breeds',
  PET_BREEDS_BY_TYPE: (type: string) => `/api/v1/pets/breeds/${type}`,

  // Favorites management
  ADD_TO_FAVORITES: (petId: string) => `/api/v1/pets/${petId}/favorite`,
  REMOVE_FROM_FAVORITES: (petId: string) => `/api/v1/pets/${petId}/favorite`,
  FAVORITE_STATUS: (petId: string) => `/api/v1/pets/${petId}/favorite/status`,
  USER_FAVORITES: '/api/v1/pets/favorites/user',

  // Similar pets and recommendations
  SIMILAR_PETS: (petId: string) => `/api/v1/pets/${petId}/similar`,

  // Pet reporting
  REPORT_PET: (petId: string) => `/api/v1/pets/${petId}/report`,

  // Statistics and analytics — services/gateway/src/routes/pets.ts registers
  // this as /stats, not /statistics (ADS-1327: was a dead path, 404ing).
  PET_STATISTICS: '/api/v1/pets/stats',
} as const;

// Export individual endpoint groups for easier imports
export const {
  PETS,
  PET_BY_ID,
  PET_BREEDS,
  PET_BREEDS_BY_TYPE,
  ADD_TO_FAVORITES,
  REMOVE_FROM_FAVORITES,
  FAVORITE_STATUS,
  USER_FAVORITES,
  SIMILAR_PETS,
  REPORT_PET,
  PET_STATISTICS,
} = PETS_ENDPOINTS;
