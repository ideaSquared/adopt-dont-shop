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

// PaginatedResponse is generic and cannot be derived from a Zod schema directly
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: Pagination;
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
