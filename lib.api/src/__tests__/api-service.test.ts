import { ApiService } from '../services/api-service';
import { ApiServiceConfig } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

// Mock global localStorage
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Also mock window.localStorage for environments that expect it
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('ApiService', () => {
  let apiService: ApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockClear();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      apiService = new ApiService();
      const config = apiService.getConfig();

      // Browser environments use a relative base URL so requests stay same-origin
      // (Vite proxy in dev, nginx in prod) — required for CSRF cookie scoping.
      expect(config.apiUrl).toBe('');
      expect(config.debug).toBe(false);
      expect(config.timeout).toBe(10000);
      expect(config.headers).toEqual({});
    });

    it('should initialize with custom configuration', () => {
      const customConfig: ApiServiceConfig = {
        apiUrl: 'https://api.example.com',
        debug: true,
        timeout: 5000,
        headers: { 'X-Custom': 'value' },
        getAuthToken: () => 'custom-token',
      };

      apiService = new ApiService(customConfig);
      const config = apiService.getConfig();

      expect(config.apiUrl).toBe('https://api.example.com');
      expect(config.debug).toBe(true);
      expect(config.timeout).toBe(5000);
      expect(config.headers).toEqual({ 'X-Custom': 'value' });
    });

    it('should update configuration', () => {
      apiService = new ApiService();

      apiService.updateConfig({
        debug: true,
        headers: { Authorization: 'Bearer token' },
      });

      const config = apiService.getConfig();
      expect(config.debug).toBe(true);
      expect(config.headers).toEqual({ Authorization: 'Bearer token' });
    });

    it('should clear cache', () => {
      apiService = new ApiService();
      expect(() => apiService.clearCache()).not.toThrow();
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      apiService = new ApiService({
        apiUrl: 'https://api.example.com',
        debug: false,
      });
    });

    it('should make GET request', async () => {
      const mockResponse = { data: { id: 1, name: 'Test' } };
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await apiService.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make GET request with query parameters', async () => {
      const mockResponse = { data: [] };
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await apiService.get('/test', { page: 1, limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test?page=1&limit=10',
        expect.any(Object)
      );
    });

    it('should make POST request', async () => {
      const requestData = { name: 'Test Item' };
      const mockResponse = { data: { id: 1, ...requestData } };
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ csrfToken: 'test-csrf-token' }),
      } as Response);

      // Mock actual POST request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await apiService.post('/test', requestData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-csrf-token': 'test-csrf-token',
          }),
          body: JSON.stringify(requestData),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make PUT request', async () => {
      const requestData = { id: 1, name: 'Updated Item' };
      const mockResponse = { data: requestData };
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ csrfToken: 'test-csrf-token' }),
      } as Response);

      // Mock actual PUT request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await apiService.put('/test/1', requestData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestData),
          headers: expect.objectContaining({
            'x-csrf-token': 'test-csrf-token',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make DELETE request', async () => {
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ csrfToken: 'test-csrf-token' }),
      } as Response);

      // Mock actual DELETE request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const result = await apiService.delete('/test/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test/1',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'x-csrf-token': 'test-csrf-token',
          }),
        })
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('Authentication Integration', () => {
    beforeEach(() => {
      apiService = new ApiService({
        apiUrl: 'https://api.example.com',
        getAuthToken: () => 'test-token-123',
      });
    });

    it('should include auth token in requests when provided', async () => {
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ data: 'success' }),
      } as Response);

      await apiService.fetchWithAuth('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });

    it('should not set Authorization header when no getAuthToken is configured (tokens are in HttpOnly cookies)', async () => {
      // Tokens are now in HttpOnly cookies — no localStorage fallback.
      // ApiService without getAuthToken uses the default `() => null` function,
      // which causes fetchWithAuth to skip the Authorization header entirely.
      apiService = new ApiService({ debug: false });

      const mockHeaders = new Headers([['content-type', 'application/json']]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ data: 'success' }),
      } as Response);

      await apiService.fetchWithAuth('/test');

      // No Authorization header should be set; cookie is sent automatically by the browser
      expect(mockLocalStorage.getItem).not.toHaveBeenCalledWith('authToken');
      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });
  });

  describe('Pet Data Transformation', () => {
    beforeEach(() => {
      apiService = new ApiService();
    });

    it('should return pet data from API as-is', async () => {
      const apiPetData = {
        pet_id: '123',
        short_description: 'Friendly dog',
        long_description: 'A very friendly dog looking for a home',
        images: [
          {
            image_id: '456',
            url: 'https://example.com/photo.jpg',
            is_primary: true,
            order_index: 0,
            caption: 'Main photo',
          },
        ],
        rescue_id: '789',
        location: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749],
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
      };

      const mockHeaders = new Headers([['content-type', 'application/json']]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve(apiPetData),
      } as Response);

      const result = await apiService.get<typeof apiPetData>('/pets/123');

      // ApiService returns data as-is without transformation
      expect(result).toEqual(apiPetData);
    });

    it('should return structured location data as-is', async () => {
      const apiPetData = {
        pet_id: '123',
        location: {
          city: 'San Francisco',
          state: 'CA',
        },
      };

      const mockHeaders = new Headers([['content-type', 'application/json']]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve(apiPetData),
      } as Response);

      const result = await apiService.get<typeof apiPetData>('/pets/123');

      // ApiService returns location data as-is without transformation
      expect(result.location).toEqual({
        city: 'San Francisco',
        state: 'CA',
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      apiService = new ApiService();
    });

    it('should handle HTTP 404 errors', async () => {
      const mockHeaders = new Headers();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: mockHeaders,
        json: () => Promise.resolve({ message: 'Resource not found' }),
      } as Response);

      await expect(apiService.get('/nonexistent')).rejects.toThrow('Resource not found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.get('/test')).rejects.toThrow('Network error');
    });

    it('should call onUnauthorized callback when receiving a 401 response', async () => {
      const onUnauthorized = vi.fn();
      apiService = new ApiService({
        apiUrl: 'https://api.example.com',
        onUnauthorized,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        json: () => Promise.resolve({ message: 'Token expired' }),
      } as Response);

      await expect(apiService.get('/protected')).rejects.toThrow('Token expired');
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('should not call onUnauthorized for non-401 errors', async () => {
      const onUnauthorized = vi.fn();
      apiService = new ApiService({
        apiUrl: 'https://api.example.com',
        onUnauthorized,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers(),
        json: () => Promise.resolve({ message: 'Access denied' }),
      } as Response);

      await expect(apiService.get('/protected')).rejects.toThrow('Access denied');
      expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('should handle timeout errors', async () => {
      // Mock AbortController
      const mockAbort = vi.fn();
      const mockSignal = {
        aborted: false,
        onabort: null,
        reason: undefined,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        throwIfAborted: vi.fn(),
      } as AbortSignal;

      const mockController = {
        abort: mockAbort,
        signal: mockSignal,
      };

      // Mock the global AbortController (save and restore to avoid test isolation issues)
      const OriginalAbortController = global.AbortController;
      global.AbortController = vi.fn().mockImplementation(function () {
        return mockController;
      }) as unknown as typeof AbortController;

      // Mock fetch to simulate timeout by checking if abort was called
      mockFetch.mockImplementationOnce(() => {
        return new Promise((resolve, reject) => {
          // Simulate the timeout by rejecting with AbortError after a delay
          setTimeout(() => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          }, 60); // Slightly longer than our timeout to ensure abort is called first
        });
      });

      apiService = new ApiService({ timeout: 50 }); // Very short timeout

      await expect(apiService.get('/slow')).rejects.toThrow('Request timeout after 50ms');

      // Verify that abort was called
      expect(mockAbort).toHaveBeenCalled();

      // Restore AbortController to avoid polluting subsequent tests
      global.AbortController = OriginalAbortController;
    }, 500); // Set test timeout to 500ms
  });

  describe('Health Check', () => {
    beforeEach(() => {
      apiService = new ApiService();
    });

    it('should return true for successful health check', async () => {
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ status: 'healthy' }),
      } as Response);

      const isHealthy = await apiService.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/health', expect.any(Object));
    });

    it('should return false for failed health check', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Service unavailable'));

      const isHealthy = await apiService.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('JSON contract [ADS-261]', () => {
    beforeEach(() => {
      apiService = new ApiService();
    });

    it('returns undefined for 204 No Content responses (callers type T as void)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        json: () => Promise.reject(new Error('should not parse')),
      } as Response);

      // Use GET to avoid the CSRF preflight; the contract is method-agnostic.
      const result = await apiService.fetch('/users/account');
      expect(result).toBeUndefined();
    });

    it('returns undefined for empty 200 responses with no Content-Type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.reject(new Error('should not parse')),
      } as Response);

      const result = await apiService.fetch('/empty');
      expect(result).toBeUndefined();
    });

    it('throws when an OK response has a non-JSON Content-Type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers([['content-type', 'text/html']]),
        text: () => Promise.resolve('<html />'),
      } as Response);

      await expect(apiService.fetch('/legacy-page')).rejects.toThrow(
        /Use fetchRaw\(\) if you need the raw Response/
      );
    });

    it('fetchRaw returns the underlying Response untouched', async () => {
      const rawResponse = {
        ok: true,
        status: 200,
        headers: new Headers([['content-type', 'application/octet-stream']]),
      } as Response;
      mockFetch.mockResolvedValueOnce(rawResponse);

      const result = await apiService.fetchRaw('/download/file.zip');
      expect(result).toBe(rawResponse);
    });
  });

  describe('Environment Variable Handling', () => {
    it('should use default URL when no environment variables are set', () => {
      apiService = new ApiService();
      const config = apiService.getConfig();

      // In browser environments, default is a relative URL (same-origin requests).
      expect(config.apiUrl).toBe('');
    });
  });

  describe('CSRF Protection', () => {
    beforeEach(() => {
      apiService = new ApiService({
        apiUrl: 'https://api.example.com',
        debug: false,
      });
    });

    it('should fetch CSRF token on first state-changing request', async () => {
      const csrfToken = 'test-csrf-token-123';
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      // Mock CSRF token endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ csrfToken }),
      } as Response);

      // Mock POST request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await apiService.post('/test', { data: 'test' });

      // Should fetch CSRF token first
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api.example.com/api/v1/csrf-token',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );

      // Should include CSRF token in POST request
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: expect.objectContaining({
            'x-csrf-token': csrfToken,
          }),
        })
      );
    });

    it('should reuse cached CSRF token for subsequent requests', async () => {
      const csrfToken = 'test-csrf-token-123';
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      // Mock CSRF token endpoint (should only be called once)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ csrfToken }),
      } as Response);

      // Mock two POST requests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await apiService.post('/test1', { data: 'test1' });
      await apiService.post('/test2', { data: 'test2' });

      // Should fetch CSRF token only once
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/csrf-token',
        expect.any(Object)
      );

      // Both POST requests should include the same CSRF token
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-csrf-token': csrfToken,
          }),
        })
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test2',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-csrf-token': csrfToken,
          }),
        })
      );
    });

    it('should not add CSRF token to GET requests', async () => {
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response);

      await apiService.get('/test');

      // Should not fetch CSRF token for GET requests
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/csrf-token'),
        expect.any(Object)
      );

      // Should not include x-csrf-token header
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.not.objectContaining({
            'x-csrf-token': expect.any(String),
          }),
        })
      );
    });

    it('should clear CSRF token on 403 CSRF errors', async () => {
      const csrfToken = 'test-csrf-token-123';
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      // Mock CSRF token endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ csrfToken }),
      } as Response);

      // Mock POST request with CSRF error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: mockHeaders,
        json: () => Promise.resolve({ error: 'Invalid CSRF token' }),
      } as Response);

      await expect(apiService.post('/test', { data: 'test' })).rejects.toThrow();

      // CSRF token should be cleared after 403 error
      // Verify by checking that a subsequent request fetches a new token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ csrfToken: 'new-token' }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await apiService.post('/test2', { data: 'test2' });

      // Should have fetched CSRF token again
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/csrf-token',
        expect.any(Object)
      );
    });

    it('should include credentials in all requests', async () => {
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response);

      await apiService.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    it('should manually clear CSRF token', async () => {
      const csrfToken = 'test-csrf-token-123';
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      // Fetch initial CSRF token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ csrfToken }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await apiService.post('/test1', { data: 'test1' });

      // Clear CSRF token manually
      apiService.clearCsrfToken();

      // Next request should fetch a new token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ csrfToken: 'new-token-456' }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await apiService.post('/test2', { data: 'test2' });

      // Should have fetched CSRF token twice (once for each POST after clear)
      const csrfTokenCalls = mockFetch.mock.calls.filter((call) => call[0].includes('/csrf-token'));
      expect(csrfTokenCalls).toHaveLength(2);
    });
  });
});
