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

// PaginatedResponse is generic and cannot be derived from a Zod schema directly
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type PetsServiceConfig = {
  apiUrl?: string;
  debug?: boolean;
  headers?: Record<string, string>;
};
