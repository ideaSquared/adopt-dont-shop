interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

class ApiService {
  private baseURL: string;
  private defaultTimeout: number = 10000;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '';
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

    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    // Create abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          this.clearAuthToken();
          throw new Error('Authentication required');
        }

        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('📥 API: Response:', data);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  // HTTP Methods
  async get<T>(url: string, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: 'GET' });
  }

  async post<T>(
    url: string,
    body?: unknown,
    options?: Omit<FetchOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: 'POST', body });
  }

  async put<T>(
    url: string,
    body?: unknown,
    options?: Omit<FetchOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: 'PUT', body });
  }

  async patch<T>(
    url: string,
    body?: unknown,
    options?: Omit<FetchOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: 'PATCH', body });
  }

  async delete<T>(url: string, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: 'DELETE' });
  }

  // Auth methods
  setToken(token: string): void {
    this.setAuthToken(token);
  }

  clearToken(): void {
    this.clearAuthToken();
  }

  getToken(): string | null {
    return this.getAuthToken();
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
