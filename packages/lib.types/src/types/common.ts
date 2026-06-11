// ---------------------------------------------------------------------------
// Common utility types — small, cross-cutting types used across the monorepo
// ---------------------------------------------------------------------------

export type SortOrder = 'asc' | 'desc';

export type DateRange = {
  start: string;
  end: string;
};

export type ServiceConfig = {
  apiUrl?: string;
  debug?: boolean;
  headers?: Record<string, string>;
};

export type ServiceOptions = {
  timeout?: number;
  useCache?: boolean;
  metadata?: Record<string, unknown>;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
};
