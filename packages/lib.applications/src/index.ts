// Main exports for @adopt-dont-shop/lib.applications
export { ApplicationsService, applicationsService } from './services/applications-service';

// Export schemas for consumers that need runtime validation
export * from './schemas';

// Re-export config/options types from types module
export type { ApplicationsServiceConfig, ApplicationsServiceOptions } from './types';
