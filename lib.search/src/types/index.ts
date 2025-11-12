/**
 * Configuration options for SearchService
 */
export interface SearchServiceConfig {
  /**
   * API base URL
   */
  apiUrl?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Custom headers to include with requests
   */
  headers?: Record<string, string>;
}

/**
 * Options for SearchService operations
 */
export interface SearchServiceOptions {
  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Whether to use caching
   */
  useCache?: boolean;

  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Base response interface
 */
export interface BaseResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Search-specific interfaces

export interface PetSearchFilters {
  type?: string;
  breed?: string;
  size?: string;
  gender?: string;
  location?: string;
  ageGroup?: string;
  status?: string;
  search?: string;
  maxDistance?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  id: string;
  type: 'pet' | 'message' | 'rescue' | 'other';
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  relevanceScore?: number;
  createdAt: string;
  updatedAt?: string;
  highlight?: string;
}

export interface MessageSearchResult {
  id: string;
  conversationId: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  highlight?: string;
}

export interface MessageSearchOptions {
  query: string;
  userId?: string;
  conversationId?: string;
  senderId?: string;
  startDate?: Date;
  endDate?: Date;
  messageType?: string;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'sender';
  sortOrder?: 'ASC' | 'DESC';
}

export interface MessageSearchResponse {
  results: MessageSearchResult[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  queryTime: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'filter' | 'category';
  count?: number;
  category?: string;
}

export interface SearchCache {
  get(key: string): SearchCacheEntry | null;
  set(key: string, entry: SearchCacheEntry): void;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
  getMetrics(): SearchMetrics;
}

export interface SearchCacheEntry {
  results: SearchResult[] | MessageSearchResult[];
  total: number;
  query: string;
  timestamp: number;
  expiresAt: number;
  metadata?: Record<string, unknown>;
}

export interface SearchMetrics {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  averageQueryTime: number;
  popularQueries: Map<string, number>;
  performanceData: {
    fastQueries: number; // < 100ms
    mediumQueries: number; // 100-500ms
    slowQueries: number; // > 500ms
  };
}

export interface AdvancedSearchOptions {
  includeTypes?: string[];
  excludeTypes?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  location?: {
    lat: number;
    lng: number;
    radius: number;
  };
  customFilters?: Record<string, unknown>;
  facets?: string[];
  boost?: Record<string, number>;
}

export interface SearchFacet {
  name: string;
  values: {
    value: string;
    count: number;
    selected?: boolean;
  }[];
}

export interface FacetedSearchResponse {
  results: SearchResult[];
  facets: SearchFacet[];
  total: number;
  page: number;
  totalPages: number;
  queryTime: number;
}
