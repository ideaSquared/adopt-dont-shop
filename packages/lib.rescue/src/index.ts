// Main exports for @adopt-dont-shop/lib.rescue
export { RescueService, rescueService } from './services/rescue-service';

// Export schemas for consumers that need runtime validation
export * from './schemas';

// Re-export non-schema types from types module
export type {
  Pagination,
  PaginatedResponse,
  Pet,
  RescueServiceConfig,
  RescueServiceOptions,
} from './types';

export * from './constants';
