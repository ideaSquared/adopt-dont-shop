// Re-export all domain types from schemas (source of truth)
export type {
  ApplicationData,
  DocumentUpload,
  Document,
  Application,
  ApplicationWithPetInfo,
} from '../schemas';

import type { ServiceConfig, ServiceOptions } from '@adopt-dont-shop/lib.types';

export type ApplicationsServiceConfig = ServiceConfig;
export type ApplicationsServiceOptions = ServiceOptions;
