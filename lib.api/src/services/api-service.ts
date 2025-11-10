import { ApiServiceConfig, FetchOptions } from '../types';
import { InterceptorManager } from '../interceptors';
import { createHttpError, TimeoutError, NetworkError } from '../errors';

/**
 * ApiService - Pure HTTP transport layer with interceptors and error handling
 */
export class ApiService {
  private config: Required<ApiServiceConfig>;
  private cache: Map<string, unknown> = new Map();
  private baseURL: string;
  private defaultTimeout: number = 10000;
  public interceptors: InterceptorManager;

  constructor(config: ApiServiceConfig = {}) {
    // Set up the base URL from environment variables or fallback
    this.baseURL = config.apiUrl || this.getBaseUrl();

    this.config = {
      apiUrl: this.baseURL,
      debug: config.debug ?? false,
      timeout: config.timeout ?? this.defaultTimeout,
      headers: config.headers ?? {},
      getAuthToken: config.getAuthToken ?? (() => null),
    };

    this.interceptors = new InterceptorManager();
    this.setupDefaultInterceptors();

    if (this.config.debug) {
      console.log(`${ApiService.name} initialized with config:`, this.config);
    }
  }

  private setupDefaultInterceptors(): void {
    // Add default request interceptor for authentication
    this.interceptors.addRequestInterceptor(async (config) => {
      const token = this.getAuthToken();
      if (token && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });

    // Add default response interceptor for error handling
    this.interceptors.addResponseInterceptor(async (response) => {
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails;

        try {
          const errorBody = await response.json();
          errorMessage = errorBody.message || errorBody.error || errorMessage;
          errorDetails = errorBody.details || errorBody.errors;
        } catch {
          // If we can't parse error as JSON, use the default message
        }

        throw createHttpError(response.status, errorMessage, undefined, errorDetails);
      }
      return response;
    });

    // Add default error interceptor for network errors
    this.interceptors.addErrorInterceptor(async (error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(this.config.timeout);
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Network request failed', error);
      }

      return error;
    });
  }

  private getBaseUrl(): string {
    // ✅ IMPROVED: Better fallback logic for different environments

    // For browser environments, try to get from environment first
    if (typeof window !== 'undefined') {
      // Development fallback - use localhost:5000 instead of relative '/api'
      return 'http://localhost:5000';
    }

    // For Node.js environments
    if (typeof process !== 'undefined' && process.env.NODE_ENV) {
      if (process.env.NODE_ENV === 'production') {
        return 'https://api.adoptdontshop.com';
      }
      return 'http://localhost:5000';
    }

    // Last resort fallback
    return 'http://localhost:5000';
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<ApiServiceConfig>): void {
    this.config = { ...this.config, ...config };

    // ✅ FIX: Also update baseURL when apiUrl changes
    if (config.apiUrl) {
      this.baseURL = config.apiUrl;
      this.config.apiUrl = config.apiUrl;
    }

    if (this.config.debug) {
      console.log(`${ApiService.name} config updated:`, this.config);
      console.log(`${ApiService.name} baseURL updated to:`, this.baseURL);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ApiServiceConfig {
    return { ...this.config };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();

    if (this.config.debug) {
      console.log(`${ApiService.name} cache cleared`);
    }
  }

  // Auth token management (delegated to external auth service)
  private getAuthToken(): string | null {
    // Use the provided auth token function if available
    if (this.config.getAuthToken) {
      return this.config.getAuthToken();
    }

    // Fallback to localStorage if available
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('authToken') || localStorage.getItem('accessToken');
    }

    return null;
  }

  // Core request method
  private async makeRequest<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const { method = 'GET', headers = {}, body, timeout = this.config.timeout } = options;

    // Build full URL
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    if (this.config.debug) {
      console.log(`🌐 API: ${method} ${fullUrl}`);
      if (body && this.config.debug) {
        console.log('📤 API: Request body:', body);
      }
    }

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
      ...headers,
    };

    // Prepare body
    let requestBody: string | FormData | undefined;
    if (body) {
      if (body instanceof FormData) {
        // Remove Content-Type header for FormData, let browser set it
        delete requestHeaders['Content-Type'];
        requestBody = body;
      } else {
        requestBody = JSON.stringify(body);
      }
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 401) {
          // For 401 errors, we just throw - auth handling should be done by the auth library
          if (this.config.debug) {
            console.warn('API: 401 Unauthorized - token may be expired');
          }
        }

        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorBody = await response.json();
          errorMessage = errorBody.message || errorBody.error || errorMessage;
        } catch {
          // If we can't parse error as JSON, use the default message
        }

        throw new Error(errorMessage);
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonResponse = (await response.json()) as T;
        return jsonResponse;
      }

      // For non-JSON responses, return the response as-is
      return response as unknown as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      if (this.config.debug) {
        console.error('API request failed:', error);
      }
      throw error;
    }
  }

  // Public fetch method without authentication
  async fetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
    return this.makeRequest<T>(url, options);
  }

  // Public fetch method with authentication
  async fetchWithAuth<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const token = this.getAuthToken();

    // In development mode, check if this is a dev token
    if (this.config.debug && token?.startsWith('dev-token-')) {
      // For dev tokens, make requests without authentication header
      // The backend should handle missing auth gracefully in dev mode
      if (this.config.debug) {
        console.log('API: Using dev token, making request without auth header');
      }
      return this.makeRequest<T>(url, options);
    }

    const headers = {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    return this.makeRequest<T>(url, { ...options, headers });
  }

  // Generic HTTP methods with authentication
  async get<T>(url: string, params?: Record<string, unknown> | unknown): Promise<T> {
    let fullUrl = url;
    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();

      const flattenParams = (obj: Record<string, unknown>, prefix = '') => {
        Object.keys(obj).forEach((key) => {
          const value = obj[key];
          const paramKey = prefix ? `${prefix}.${key}` : key;

          if (value !== undefined && value !== null && value !== '') {
            if (typeof value === 'object' && !Array.isArray(value)) {
              flattenParams(value as Record<string, unknown>, paramKey);
            } else {
              searchParams.append(paramKey, String(value));
            }
          }
        });
      };

      flattenParams(params as Record<string, unknown>);
      fullUrl = `${url}?${searchParams.toString()}`;
    }

    const response = await this.fetchWithAuth<T>(fullUrl, { method: 'GET' });

    return response;
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    return this.fetchWithAuth<T>(url, {
      method: 'POST',
      body: data,
    });
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    return this.fetchWithAuth<T>(url, {
      method: 'PUT',
      body: data,
    });
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    return this.fetchWithAuth<T>(url, {
      method: 'PATCH',
      body: data,
    });
  }

  async delete<T>(url: string, data?: unknown): Promise<T> {
    return this.fetchWithAuth<T>(url, { method: 'DELETE', body: data });
  }

  // File upload method
  async uploadFile<T>(
    url: string,
    file: File,
    additionalData?: Record<string, unknown>
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.keys(additionalData).forEach((key) => {
        const value = additionalData[key];
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          formData.append(key, String(value));
        }
      });
    }

    return this.fetchWithAuth<T>(url, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('/api/v1/health');
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${ApiService.name} health check failed:`, error);
      }
      return false;
    }
  }
}

// Get environment variables with proper type checking and improved fallback
const getApiUrl = (): string | undefined => {
  // In Vite environment (browser)
  if (typeof window !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env) {
    const viteEnv = import.meta.env as Record<string, string>;
    const apiUrl = viteEnv.VITE_API_BASE_URL || viteEnv.VITE_API_URL; // VITE_API_URL for legacy support
    if (apiUrl) {
      console.log('🔧 DEBUG: Found API URL in import.meta.env:', apiUrl);
      return apiUrl;
    }
  }
  // In Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    const apiUrl = process.env.VITE_API_BASE_URL || process.env.VITE_API_URL; // VITE_API_URL for legacy support
    if (apiUrl) {
      console.log('🔧 DEBUG: Found API URL in process.env:', apiUrl);
      return apiUrl;
    }
  }
  console.log('🔧 DEBUG: No API URL found in environment, will use getBaseUrl() fallback');
  return undefined;
};

const isDevelopment = (): boolean => {
  // In Vite environment
  if (typeof window !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env) {
    const viteEnv = import.meta.env as Record<string, string>;
    return viteEnv.MODE === 'development';
  }
  // In Node.js environment
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV === 'development';
  }
  return false;
};

// Debug log the environment detection
const apiUrl = getApiUrl();
const debug = isDevelopment();
console.log('🔧 DEBUG: Creating global apiService with:', { apiUrl, debug });

// Export singleton instance with environment-aware configuration
export const apiService = new ApiService({
  apiUrl,
  debug,
});
export const api = apiService;
