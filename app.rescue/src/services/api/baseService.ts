interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

/**
 * Custom error classes for different types of API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export class ServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(message, 500);
    this.name = 'ServerError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string = 'Network connection failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Base API service class providing common HTTP functionality
 * Uses native fetch API instead of axios for consistency with app.client
 */
export class BaseApiService {
  protected baseURL: string;
  protected defaultTimeout: number = 30000;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://api.localhost';
  }

  /**
   * Get the current authentication token from localStorage
   */
  protected getAuthToken(): string | null {
    return localStorage.getItem('rescue_auth_token');
  }

  /**
   * Set the authentication token in localStorage
   */
  protected setAuthToken(token: string): void {
    localStorage.setItem('rescue_auth_token', token);
  }

  /**
   * Clear authentication data from localStorage
   */
  protected clearAuthToken(): void {
    localStorage.removeItem('rescue_auth_token');
    localStorage.removeItem('rescue_user');
  }

  /**
   * Make an HTTP request using fetch API
   */
  private async makeRequest<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const { method = 'GET', headers = {}, body, timeout = this.defaultTimeout } = options;

    // Build full URL
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    // Log request in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`🌐 Rescue API: ${method} ${fullUrl}`);
      // eslint-disable-next-line no-console
      console.log(`🌐 Base URL: ${this.baseURL}`);
      // eslint-disable-next-line no-console
      console.log(`🌐 VITE_API_URL: ${import.meta.env.VITE_API_URL}`);
      if (body) {
        // eslint-disable-next-line no-console
        console.log('📤 Rescue API: Request body:', body);
      }
    }

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
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
        await this.handleErrorResponse(response);
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonResponse = await response.json();

        // Check if response has the nested success structure
        if (
          typeof jsonResponse === 'object' &&
          jsonResponse !== null &&
          'success' in jsonResponse &&
          'data' in jsonResponse
        ) {
          return jsonResponse.data;
        }

        return jsonResponse;
      }

      // For non-JSON responses, return the response as-is
      return response as unknown as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(`Request timeout after ${timeout}ms`);
      }

      if (error instanceof ApiError) {
        throw error;
      }

      console.error('Rescue API request failed:', error);
      throw new NetworkError('Network request failed');
    }
  }

  /**
   * Handle error responses and throw appropriate error types
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorBody.error || errorMessage;
    } catch {
      // If we can't parse error as JSON, use the default message
    }

    switch (response.status) {
      case 400:
        throw new ValidationError(errorMessage);
      case 401:
        this.clearAuthToken();
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        throw new AuthenticationError(errorMessage);
      case 403:
        throw new AuthorizationError(errorMessage);
      case 404:
        throw new NotFoundError(errorMessage);
      case 409:
        throw new ConflictError(errorMessage);
      case 429:
        throw new RateLimitError(errorMessage);
      case 500:
        throw new ServerError(errorMessage);
      default:
        throw new ApiError(errorMessage, response.status, response);
    }
  }

  /**
   * Make a request without authentication
   */
  protected async fetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
    return this.makeRequest<T>(url, options);
  }

  /**
   * Make a request with authentication
   */
  protected async fetchWithAuth<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const token = this.getAuthToken();

    const headers = {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    return this.makeRequest<T>(url, { ...options, headers });
  }

  /**
   * GET request with authentication
   */
  protected async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    let fullUrl = url;
    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();

      const flattenParams = (obj: Record<string, unknown>, prefix = '') => {
        Object.keys(obj).forEach(key => {
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

      flattenParams(params);
      fullUrl = `${url}?${searchParams.toString()}`;
    }

    return this.fetchWithAuth<T>(fullUrl, { method: 'GET' });
  }

  /**
   * POST request with authentication
   */
  protected async post<T>(url: string, data?: unknown): Promise<T> {
    return this.fetchWithAuth<T>(url, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * PUT request with authentication
   */
  protected async put<T>(url: string, data?: unknown): Promise<T> {
    return this.fetchWithAuth<T>(url, {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * PATCH request with authentication
   */
  protected async patch<T>(url: string, data?: unknown): Promise<T> {
    return this.fetchWithAuth<T>(url, {
      method: 'PATCH',
      body: data,
    });
  }

  /**
   * DELETE request with authentication
   */
  protected async delete<T>(url: string): Promise<T> {
    return this.fetchWithAuth<T>(url, { method: 'DELETE' });
  }
}
