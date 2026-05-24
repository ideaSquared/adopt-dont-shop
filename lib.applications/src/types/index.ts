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

import type { ServiceConfig, ServiceOptions } from '@adopt-dont-shop/lib.types';

export type ApplicationsServiceConfig = ServiceConfig;
export type ApplicationsServiceOptions = ServiceOptions;

// ADS-262: response envelopes are owned by @adopt-dont-shop/lib.types.
export type { BaseResponse, ErrorResponse, PaginatedResponse } from '@adopt-dont-shop/lib.types';
