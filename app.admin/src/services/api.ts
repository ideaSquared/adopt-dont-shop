import { AuthResponse, LoginRequest, RegisterRequest } from '@/types';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

// Base API configuration is set in the ApiService constructor

class ApiService {
  private baseURL: string;
  private defaultTimeout: number = 10000;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken') || localStorage.getItem('accessToken');
  }

  private setAuthToken(token: string): void {
    localStorage.setItem('authToken', token);
    localStorage.setItem('accessToken', token); // Keep both for compatibility
  }

  private clearAuthToken(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  private async makeRequest<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const { method = 'GET', headers = {}, body, timeout = this.defaultTimeout } = options;

    // Build full URL
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    // eslint-disable-next-line no-console
    console.log(`🌐 API: ${method} ${fullUrl}`);
    if (body && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('📤 API: Request body:', body);
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
        if (response.status === 401) {
          // Token expired or invalid
          this.clearAuthToken();
          // Redirect to login if not already there
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
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

      console.error('API request failed:', error);
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
    if (import.meta.env.DEV && token?.startsWith('dev-token-')) {
      // For dev tokens, make requests without authentication header
      // The backend should handle missing auth gracefully in dev mode
      // eslint-disable-next-line no-console
      console.log('API: Using dev token, making request without auth header');
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

      flattenParams(params as Record<string, unknown>);
      fullUrl = `${url}?${searchParams.toString()}`;
    }

    return await this.fetchWithAuth<T>(fullUrl, { method: 'GET' });
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

  async delete<T>(url: string): Promise<T> {
    return this.fetchWithAuth<T>(url, { method: 'DELETE' });
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
      Object.keys(additionalData).forEach(key => {
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

  // Auth token management
  setToken(token: string): void {
    this.setAuthToken(token);
  }

  clearToken(): void {
    this.clearAuthToken();
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>('/api/v1/auth/login', credentials);
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>('/api/v1/auth/register', userData);
  }

  async logout(): Promise<void> {
    await this.post<void>('/api/v1/auth/logout');
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  async refreshToken(): Promise<{ token: string }> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.post<{ token: string }>('/api/v1/auth/refresh-token', {
      refreshToken,
    });

    localStorage.setItem('authToken', response.token);
    localStorage.setItem('accessToken', response.token);
    return response;
  }
}

export const apiService = new ApiService();
export const api = apiService;
