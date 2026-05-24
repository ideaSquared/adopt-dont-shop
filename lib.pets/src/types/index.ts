// Re-export all domain types from schemas (source of truth)
export type {
  PetStatus,
  PetImage,
  PetVideo,
  Pet,
  PetSearchFilters,
  PetStats,
  PetCreateData,
  PetUpdateData,
} from '../schemas';

// ADS-262: response envelopes are owned by @adopt-dont-shop/lib.types.
export type { PaginatedResponse } from '@adopt-dont-shop/lib.types';

export type PetsServiceConfig = {
  apiUrl?: string;
  debug?: boolean;
  headers?: Record<string, string>;
};
