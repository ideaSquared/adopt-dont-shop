/**
 * Configuration options for ApiService
 */
export interface ApiServiceConfig {
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
 * Options for ApiService operations
 */
export interface ApiServiceOptions {
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
