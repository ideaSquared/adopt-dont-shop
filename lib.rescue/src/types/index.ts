// Re-export all domain types from schemas (source of truth)
export type {
  RescueStatus,
  RescueType,
  VerificationSource,
  RescueLocation,
  AdoptionPolicy,
  Rescue,
  RescueAPIResponse,
  RescueSearchFilters,
} from '../schemas';

// ADS-262: response envelopes are owned by @adopt-dont-shop/lib.types.
export type { PaginatedResponse } from '@adopt-dont-shop/lib.types';

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

// Internal Pet type used within rescue context
export type Pet = {
  id: string;
  name: string;
  type: string;
  breed?: string;
  age?: number;
  size?: string;
  rescueId: string;
  status?: string;
};

export type RescueServiceConfig = {
  apiUrl?: string;
  debug?: boolean;
  headers?: Record<string, string>;
};

export type RescueServiceOptions = {
  timeout?: number;
  headers?: Record<string, string>;
  retry?: boolean;
};
