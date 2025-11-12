/**
 * Configuration options for UtilsService
 */
export interface UtilsServiceConfig {
  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Default timezone for date operations
   */
  timezone?: string;

  /**
   * Default currency for formatting
   */
  currency?: string;

  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Options for UtilsService operations
 */
export interface UtilsServiceOptions {
  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;
}

// ===== UTILITY TYPES =====

/**
 * Date formatting options
 */
export interface DateFormatOptions {
  format?: string;
  timezone?: string;
  locale?: string;
}

/**
 * File validation options
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

/**
 * String truncation options
 */
export interface TruncateOptions {
  length: number;
  suffix?: string;
  preserveWords?: boolean;
}

/**
 * Address object structure
 */
export interface AddressObject {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedValue?: string;
}

/**
 * Deep clone options
 */
export interface CloneOptions {
  preserveFunctions?: boolean;
  preserveUndefined?: boolean;
}

/**
 * Array to map options
 */
export interface ArrayToMapOptions<T> {
  keyField: keyof T;
  valueField?: keyof T;
}

/**
 * Merge objects options
 */
export interface MergeOptions {
  deep?: boolean;
  arrayMergeStrategy?: 'replace' | 'concat' | 'merge';
}

/**
 * Flatten/unflatten options
 */
export interface FlattenOptions {
  delimiter?: string;
  maxDepth?: number;
  preserveArrays?: boolean;
}

/**
 * Currency formatting options
 */
export interface CurrencyOptions {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Phone number formatting options
 */
export interface PhoneFormatOptions {
  country?: string;
  format?: 'national' | 'international' | 'e164';
}

/**
 * Slug generation options
 */
export interface SlugOptions {
  lowercase?: boolean;
  separator?: string;
  maxLength?: number;
  removeAccents?: boolean;
}

/**
 * ID generation options
 */
export interface IdGenerationOptions {
  length?: number;
  prefix?: string;
  suffix?: string;
  includeTimestamp?: boolean;
  charset?: 'alphanumeric' | 'alphabetic' | 'numeric' | 'hex';
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
