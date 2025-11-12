import {
  UtilsServiceConfig,
  DateFormatOptions,
  FileValidationOptions,
  TruncateOptions,
  AddressObject,
  ValidationResult,
  CloneOptions,
  ArrayToMapOptions,
  FlattenOptions,
  CurrencyOptions,
  PhoneFormatOptions,
  SlugOptions,
  IdGenerationOptions,
} from '../types';

/**
 * UtilsService - Production-ready utility functions for common operations
 * Provides date/time utilities, string processing, data transformation, validation, and formatting
 */
export class UtilsService {
  private config: UtilsServiceConfig;

  constructor(config: Partial<UtilsServiceConfig> = {}) {
    this.config = {
      debug: false,
      timezone: 'UTC',
      currency: 'USD',
      ...config,
    };

    if (this.config.debug) {
      console.log(`${UtilsService.name} initialized with config:`, this.config);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): UtilsServiceConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  public updateConfig(updates: Partial<UtilsServiceConfig>): void {
    this.config = { ...this.config, ...updates };

    if (this.config.debug) {
      console.log(`${UtilsService.name} config updated:`, this.config);
    }
  }

  // ===== DATE & TIME UTILITIES =====

  /**
   * Format a date with consistent formatting
   */
  public formatDate(date: Date | string, options: DateFormatOptions = {}): string {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;

      // Check if date is invalid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }

      const format = options.format || 'YYYY-MM-DD';
      const locale = options.locale || 'en-US';

      // Simple format implementation (could be extended with more sophisticated formatting)
      if (format === 'ISO') {
        return dateObj.toISOString();
      }

      if (format === 'locale') {
        return dateObj.toLocaleDateString(locale);
      }

      // Basic YYYY-MM-DD format
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      if (this.config.debug) {
        console.error('formatDate error:', error);
      }
      return 'Invalid Date';
    }
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  public formatRelativeTime(date: Date | string): string {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      if (diffDays < 30)
        return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
      if (diffDays < 365)
        return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;

      return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? 's' : ''} ago`;
    } catch (error) {
      if (this.config.debug) {
        console.error('formatRelativeTime error:', error);
      }
      return 'Invalid Date';
    }
  }

  /**
   * Parse date string safely
   */
  public parseDate(dateString: string): Date | null {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      if (this.config.debug) {
        console.error('parseDate error:', error);
      }
      return null;
    }
  }

  /**
   * Get user timezone (browser environment)
   */
  public getTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      return this.config.timezone || 'UTC';
    }
  }

  /**
   * Check if current time is within business hours
   */
  public isBusinessHours(
    date: Date = new Date(),
    startHour: number = 9,
    endHour: number = 17
  ): boolean {
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    // Monday = 1, Sunday = 0
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isBusinessHour = hour >= startHour && hour < endHour;

    return isWeekday && isBusinessHour;
  }

  // ===== STRING UTILITIES =====

  /**
   * Convert text to URL-safe slug
   */
  public slugify(text: string, options: SlugOptions = {}): string {
    const opts = {
      lowercase: true,
      separator: '-',
      maxLength: 100,
      removeAccents: true,
      ...options,
    };

    let slug = text.toString();

    // Remove accents if requested
    if (opts.removeAccents) {
      slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // Convert to lowercase if requested
    if (opts.lowercase) {
      slug = slug.toLowerCase();
    }

    // Replace spaces and special characters
    slug = slug
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, opts.separator) // Replace spaces with separator
      .replace(new RegExp(`${opts.separator}+`, 'g'), opts.separator) // Remove duplicate separators
      .replace(new RegExp(`^${opts.separator}|${opts.separator}$`, 'g'), ''); // Remove leading/trailing separators

    // Limit length
    if (opts.maxLength && slug.length > opts.maxLength) {
      slug = slug.substring(0, opts.maxLength).replace(new RegExp(`${opts.separator}$`), '');
    }

    return slug;
  }

  /**
   * Truncate text with smart word preservation
   */
  public truncate(text: string, options: TruncateOptions): string {
    const opts = {
      suffix: '...',
      preserveWords: true,
      ...options,
    };

    if (text.length <= opts.length) {
      return text;
    }

    let truncated = text.substring(0, opts.length);

    if (opts.preserveWords) {
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 0) {
        truncated = truncated.substring(0, lastSpace);
      }
    }

    return truncated + opts.suffix;
  }

  /**
   * Sanitize input to prevent XSS
   */
  public sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Generate unique ID
   */
  public generateId(options: IdGenerationOptions = {}): string {
    const opts = {
      length: 8,
      charset: 'alphanumeric' as const,
      includeTimestamp: false,
      ...options,
    };

    const charsets = {
      alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      alphabetic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      numeric: '0123456789',
      hex: '0123456789ABCDEF',
    };

    const chars = charsets[opts.charset];
    let id = '';

    for (let i = 0; i < opts.length; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    if (opts.includeTimestamp) {
      id += '-' + Date.now().toString(36);
    }

    return (opts.prefix || '') + id + (opts.suffix || '');
  }

  /**
   * Capitalize words in a string
   */
  public capitalizeWords(text: string): string {
    return text.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // ===== DATA TRANSFORMATION =====

  /**
   * Deep clone an object
   */
  public deepClone<T>(obj: T, options: CloneOptions = {}): T {
    const opts = {
      preserveFunctions: false,
      preserveUndefined: true,
      ...options,
    };

    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Array) {
      return obj.map((item) => this.deepClone(item, opts)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];

          if (typeof value === 'function' && !opts.preserveFunctions) {
            continue;
          }

          if (value === undefined && !opts.preserveUndefined) {
            continue;
          }

          cloned[key] = this.deepClone(value, opts);
        }
      }
      return cloned;
    }

    return obj;
  }

  /**
   * Merge multiple objects
   */
  public mergeObjects<T>(...objects: Partial<T>[]): T {
    const result = {} as T;

    for (const obj of objects) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = obj[key] as T[Extract<keyof T, string>];
        }
      }
    }

    return result;
  }

  /**
   * Flatten nested object
   */
  public flattenObject(
    obj: Record<string, unknown>,
    options: FlattenOptions = {}
  ): Record<string, unknown> {
    const opts = {
      delimiter: '.',
      maxDepth: 10,
      preserveArrays: false,
      ...options,
    };

    const flatten = (
      current: any,
      prefix: string = '',
      depth: number = 0
    ): Record<string, unknown> => {
      if (depth >= opts.maxDepth) {
        return { [prefix]: current };
      }

      const result: Record<string, unknown> = {};

      if (Array.isArray(current) && opts.preserveArrays) {
        result[prefix] = current;
      } else if (current !== null && typeof current === 'object' && !Array.isArray(current)) {
        for (const key in current) {
          if (current.hasOwnProperty(key)) {
            const newKey = prefix ? `${prefix}${opts.delimiter}${key}` : key;
            Object.assign(result, flatten(current[key], newKey, depth + 1));
          }
        }
      } else {
        result[prefix] = current;
      }

      return result;
    };

    return flatten(obj);
  }

  /**
   * Unflatten flattened object
   */
  public unflattenObject(
    obj: Record<string, unknown>,
    delimiter: string = '.'
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const keys = key.split(delimiter);
        let current = result;

        for (let i = 0; i < keys.length - 1; i++) {
          const k = keys[i];
          if (!(k in current)) {
            current[k] = {};
          }
          current = current[k] as Record<string, unknown>;
        }

        current[keys[keys.length - 1]] = obj[key];
      }
    }

    return result;
  }

  /**
   * Convert array to Map
   */
  public arrayToMap<T>(array: T[], options: ArrayToMapOptions<T>): Map<string, T | unknown> {
    const map = new Map<string, T | unknown>();

    for (const item of array) {
      const key = String(item[options.keyField]);
      const value = options.valueField ? item[options.valueField] : item;
      map.set(key, value);
    }

    return map;
  }

  // ===== VALIDATION HELPERS =====

  /**
   * Validate email address
   */
  public isValidEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);

    return {
      isValid,
      error: isValid ? undefined : 'Invalid email format',
      normalizedValue: isValid ? email.toLowerCase().trim() : undefined,
    };
  }

  /**
   * Validate phone number
   */
  public isValidPhone(phone: string): ValidationResult {
    // Basic phone validation - could be enhanced with libphonenumber
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const isValid = phoneRegex.test(cleanPhone) && cleanPhone.length >= 10;

    return {
      isValid,
      error: isValid ? undefined : 'Invalid phone number format',
      normalizedValue: isValid ? cleanPhone : undefined,
    };
  }

  /**
   * Validate URL
   */
  public isValidURL(url: string): ValidationResult {
    try {
      new URL(url);
      return {
        isValid: true,
        normalizedValue: url,
      };
    } catch {
      return {
        isValid: false,
        error: 'Invalid URL format',
      };
    }
  }

  /**
   * Validate file type
   */
  public validateFileType(fileName: string, options: FileValidationOptions = {}): ValidationResult {
    const opts = {
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif'],
      ...options,
    };

    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

    if (opts.allowedExtensions && !opts.allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `File type not allowed. Allowed: ${opts.allowedExtensions.join(', ')}`,
      };
    }

    return {
      isValid: true,
      normalizedValue: fileName,
    };
  }

  // ===== FORMATTING UTILITIES =====

  /**
   * Format currency
   */
  public formatCurrency(amount: number, options: CurrencyOptions = {}): string {
    const opts = {
      currency: this.config.currency || 'USD',
      locale: 'en-US',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    };

    try {
      return new Intl.NumberFormat(opts.locale, {
        style: 'currency',
        currency: opts.currency,
        minimumFractionDigits: opts.minimumFractionDigits,
        maximumFractionDigits: opts.maximumFractionDigits,
      }).format(amount);
    } catch (error) {
      return `$${amount.toFixed(2)}`;
    }
  }

  /**
   * Format file size
   */
  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format phone number
   */
  public formatPhoneNumber(phone: string, _options: PhoneFormatOptions = {}): string {
    // Basic US phone formatting
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    if (cleaned.length === 11 && cleaned[0] === '1') {
      const number = cleaned.slice(1);
      return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }

    return phone; // Return original if can't format
  }

  /**
   * Format address
   */
  public formatAddress(address: AddressObject): string {
    const parts = [];

    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zipCode) parts.push(address.zipCode);
    if (address.country && address.country !== 'US') parts.push(address.country);

    return parts.join(', ');
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Test basic functionality
      const testDate = this.formatDate(new Date());
      const testSlug = this.slugify('Test String');
      const testValidation = this.isValidEmail('test@example.com');

      return !!(testDate && testSlug && testValidation.isValid);
    } catch (error) {
      if (this.config.debug) {
        console.error(`${UtilsService.name} health check failed:`, error);
      }
      return false;
    }
  }
}
