// Main exports for @adopt-dont-shop/lib.validation
export { ValidationService } from './services/validation-service';
export type { ValidationServiceConfig, ValidationServiceOptions } from './types';
export * from './types';

// Domain schemas — Zod-first, single source of truth across backend and
// frontend. Add one schema module per entity as the rollout progresses.
export * from './schemas/user';
export * from './schemas/pet';
export * from './schemas/rescue';
