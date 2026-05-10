// Re-export all domain types from schemas (source of truth)
export type {
  ApplicationStatus,
  ApplicationPriority,
  PersonalInfo,
  LivingSituation,
  PetExperience,
  References,
  AdditionalInfo,
  ApplicationData,
  ApplicationDocument,
  DocumentUpload,
  Document,
  Application,
  ApplicationWithPetInfo,
  ApplicationStats,
} from '../schemas';

/**
 * Configuration options for ApplicationsService
 */
export type ApplicationsServiceConfig = {
  apiUrl?: string;
  debug?: boolean;
  headers?: Record<string, string>;
};

/**
 * Options for ApplicationsService operations
 */
export type ApplicationsServiceOptions = {
  timeout?: number;
  useCache?: boolean;
  metadata?: Record<string, unknown>;
};

// ADS-262: response envelopes are owned by @adopt-dont-shop/lib.types.
export type { BaseResponse, ErrorResponse, PaginatedResponse } from '@adopt-dont-shop/lib.types';
