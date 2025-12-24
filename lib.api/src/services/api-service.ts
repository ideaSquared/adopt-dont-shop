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
  private csrfToken: string | null = null;
  private csrfTokenPromise: Promise<string> | null = null;

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
    // Add default request interceptor for CSRF token (must be first)
    this.interceptors.addRequestInterceptor(async (config) => {
      // Only add CSRF token for state-changing requests
      const needsCsrfToken = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method);

      if (needsCsrfToken && !config.headers['x-csrf-token']) {
        try {
          const csrfToken = await this.getCsrfToken();
          if (csrfToken) {
            config.headers['x-csrf-token'] = csrfToken;
          }
        } catch (error) {
          if (this.config.debug) {
            console.warn('Failed to get CSRF token:', error);
          }
          // Continue without CSRF token - let the server reject if needed
        }
      }
      return config;
    });

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

        // Clear CSRF token on 403 errors (invalid CSRF token)
        if (response.status === 403 && errorMessage.toLowerCase().includes('csrf')) {
          if (this.config.debug) {
            console.warn('🔒 CSRF token validation failed - clearing cached token');
          }
          this.clearCsrfToken();
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

  /**
   * Get CSRF token - fetches from server if not cached
   * Uses promise caching to prevent multiple simultaneous requests
   */
  private async getCsrfToken(): Promise<string> {
    // Return cached token if available
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // If a fetch is already in progress, wait for it
    if (this.csrfTokenPromise) {
      return this.csrfTokenPromise;
    }

    // Create new fetch promise
    this.csrfTokenPromise = this.fetchCsrfToken();

    try {
      const token = await this.csrfTokenPromise;
      this.csrfToken = token;
      return token;
    } finally {
      this.csrfTokenPromise = null;
    }
  }

  /**
   * Fetch CSRF token from server
   * This method makes a direct fetch call without interceptors to avoid circular dependencies
   */
  private async fetchCsrfToken(): Promise<string> {
    const url = `${this.baseURL}/api/v1/csrf-token`;

    if (this.config.debug) {
      console.log('🔒 Fetching CSRF token from:', url);
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Required for cookie-based CSRF
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { csrfToken: string };

      if (!data.csrfToken) {
        throw new Error('CSRF token not found in response');
      }

      if (this.config.debug) {
        console.log('🔒 CSRF token received');
      }

      return data.csrfToken;
    } catch (error) {
      if (this.config.debug) {
        console.error('🔒 Failed to fetch CSRF token:', error);
      }
      throw error;
    }
  }

  /**
   * Clear cached CSRF token (useful after 403 errors or logout)
   */
  public clearCsrfToken(): void {
    this.csrfToken = null;
    this.csrfTokenPromise = null;

    if (this.config.debug) {
      console.log('🔒 CSRF token cleared');
    }
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
    let requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
      ...headers,
    };

    // Apply request interceptors
    const requestConfig = await this.interceptors.applyRequestInterceptors({
      url: fullUrl,
      method,
      headers: requestHeaders,
      body,
    });

    // Update headers from interceptors
    requestHeaders = requestConfig.headers;

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
      let response = await fetch(fullUrl, {
        method,
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal,
        credentials: 'include', // Include cookies for CSRF protection and session management
      });

      clearTimeout(timeoutId);

      // Apply response interceptors
      try {
        response = await this.interceptors.applyResponseInterceptors(response);
      } catch (interceptorError) {
        // Response interceptor threw an error (e.g., due to !response.ok)
        throw interceptorError;
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

      // Apply error interceptors
      const processedError = await this.interceptors.applyErrorInterceptors(error as Error);

      if (this.config.debug) {
        console.error('API request failed:', processedError);
      }
      throw processedError;
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
  try {
    if (typeof window !== 'undefined') {
      // Use eval to avoid import.meta issues in Jest
      const importMeta = eval('import.meta');
      if (importMeta && importMeta.env) {
        const viteEnv = importMeta.env as Record<string, string>;
        const apiUrl = viteEnv.VITE_API_BASE_URL || viteEnv.VITE_API_URL; // VITE_API_URL for legacy support
        if (apiUrl) {
          console.log('🔧 DEBUG: Found API URL in import.meta.env:', apiUrl);
          return apiUrl;
        }
      }
    }
  } catch {
    // import.meta not available or eval failed (e.g., in test environment)
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
  try {
    if (typeof window !== 'undefined') {
      const importMeta = eval('import.meta');
      if (importMeta && importMeta.env) {
        const viteEnv = importMeta.env as Record<string, string>;
        return viteEnv.MODE === 'development';
      }
    }
  } catch {
    // import.meta not available
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
