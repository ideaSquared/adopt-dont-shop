// Main exports for @adopt-dont-shop/lib.pets
export { PetsService, petsService } from './services/pets-service';
export { PetManagementService, petManagementService } from './services/pets-management-service';

// Export schemas for consumers that need runtime validation
export * from './schemas';

// Re-export non-schema types from types module
export type { PaginatedResponse, PetsServiceConfig } from './types';

export * from './constants';
