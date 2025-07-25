// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  code?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    currentPage?: number;
    totalItems?: number;
    itemsPerPage?: number;
    totalPages?: number;
  };
  pagination?: {
    currentPage?: number;
    totalItems?: number;
    itemsPerPage?: number;
    totalPages?: number;
  };
}

// Pet Data Types
export interface PetImage {
  image_id?: string;
  photoId?: string;
  url: string;
  is_primary?: boolean;
  isPrimary?: boolean;
  caption?: string;
  order_index?: number;
  order?: number;
}

export interface PetLocation {
  coordinates?: [number, number];
  type?: string;
  city?: string;
  state?: string;
}

export interface PetRescue {
  rescue_id?: string;
  rescueId?: string;
  name: string;
  location?: PetLocation | string;
}

export interface ApiPet {
  pet_id?: string;
  petId?: string;
  images?: PetImage[];
  short_description?: string;
  shortDescription?: string;
  long_description?: string;
  longDescription?: string;
  rescue_id?: string;
  rescueId?: string;
  location?: PetLocation | string;
  rescue?: PetRescue;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface TransformedPet {
  petId?: string;
  photos: Array<{
    photoId?: string;
    url: string;
    isPrimary: boolean;
    caption?: string;
    order: number;
  }>;
  shortDescription?: string;
  longDescription?: string;
  rescueId?: string;
  location: string;
  rescue?: {
    rescueId?: string;
    name: string;
    location?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

// API Service Configuration
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
   * Default request timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Custom headers to include with requests
   */
  headers?: Record<string, string>;

  /**
   * Function to get authentication token
   */
  getAuthToken?: () => string | null;
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  requireAuth?: boolean;
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
  timestamp: string;
  details?: unknown;
}


