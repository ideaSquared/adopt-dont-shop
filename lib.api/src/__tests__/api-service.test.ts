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
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make DELETE request', async () => {
      const mockHeaders = new Headers([['content-type', 'application/json']]);

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

  describe('401 token refresh single-flight', () => {
    const jsonHeaders = () => new Headers([['content-type', 'application/json']]);

    const respond = (status: number, body: unknown) =>
      ({
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 401 ? 'Unauthorized' : 'OK',
        headers: jsonHeaders(),
        json: () => Promise.resolve(body),
      }) as Response;

    beforeEach(() => {
      apiService = new ApiService({ apiUrl: 'https://api.example.com' });
    });

    it('refreshes once and retries the request when a 401 comes back', async () => {
      const refreshHandler = vi.fn().mockResolvedValue(undefined);
      apiService.setRefreshHandler(refreshHandler);

      // First call: 401. Then refresh-retry: 200.
      mockFetch
        .mockResolvedValueOnce(respond(401, { message: 'Token expired' }))
        .mockResolvedValueOnce(respond(200, { ok: true }));

      const result = await apiService.get<{ ok: boolean }>('/protected');

      expect(refreshHandler).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ ok: true });
    });

    it('shares a single refresh across parallel 401 requests', async () => {
      let resolveRefresh: (() => void) | undefined;
      const refreshHandler = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveRefresh = resolve;
          })
      );
      apiService.setRefreshHandler(refreshHandler);

      // Two parallel 401s, then two successful retries.
      mockFetch
        .mockResolvedValueOnce(respond(401, { message: 'expired' }))
        .mockResolvedValueOnce(respond(401, { message: 'expired' }))
        .mockResolvedValueOnce(respond(200, { ok: true, n: 1 }))
        .mockResolvedValueOnce(respond(200, { ok: true, n: 2 }));

      const p1 = apiService.get<{ n: number }>('/a');
      const p2 = apiService.get<{ n: number }>('/b');

      // Yield repeatedly so both initial fetches resolve, each sees 401,
      // and both queue on the same refresh promise before we release it.
      for (let i = 0; i < 10 && refreshHandler.mock.calls.length === 0; i++) {
        await Promise.resolve();
      }
      expect(refreshHandler).toHaveBeenCalledTimes(1);

      resolveRefresh?.();
      const [r1, r2] = await Promise.all([p1, p2]);

      expect(refreshHandler).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(r1.n).toBe(1);
      expect(r2.n).toBe(2);
    });

    it('falls through to onUnauthorized when the refresh itself fails', async () => {
      const onUnauthorized = vi.fn();
      apiService = new ApiService({ apiUrl: 'https://api.example.com', onUnauthorized });

      const refreshHandler = vi.fn().mockRejectedValue(new Error('refresh denied'));
      apiService.setRefreshHandler(refreshHandler);

      mockFetch.mockResolvedValueOnce(respond(401, { message: 'expired' }));

      await expect(apiService.get('/protected')).rejects.toThrow('expired');
      expect(refreshHandler).toHaveBeenCalledTimes(1);
      // No retry was attempted.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('does not attempt refresh when the failing request is the refresh endpoint itself', async () => {
      const refreshHandler = vi.fn().mockResolvedValue(undefined);
      const onUnauthorized = vi.fn();
      apiService = new ApiService({ apiUrl: 'https://api.example.com', onUnauthorized });
      apiService.setRefreshHandler(refreshHandler);

      mockFetch.mockResolvedValueOnce(respond(401, { message: 'no refresh cookie' }));

      await expect(
        apiService.fetch('/api/v1/auth/refresh-token', { method: 'GET' })
      ).rejects.toThrow('no refresh cookie');

      expect(refreshHandler).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('falls through to onUnauthorized when the retried request also returns 401', async () => {
      const onUnauthorized = vi.fn();
      apiService = new ApiService({ apiUrl: 'https://api.example.com', onUnauthorized });

      const refreshHandler = vi.fn().mockResolvedValue(undefined);
      apiService.setRefreshHandler(refreshHandler);

      // 401, refresh OK, retry still 401 — no infinite loop.
      mockFetch
        .mockResolvedValueOnce(respond(401, { message: 'first' }))
        .mockResolvedValueOnce(respond(401, { message: 'still expired' }));

      await expect(apiService.get('/protected')).rejects.toThrow('still expired');
      expect(refreshHandler).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
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

  describe('Request headers', () => {
    beforeEach(() => {
      apiService = new ApiService({
        apiUrl: 'https://api.example.com',
        debug: false,
      });
    });

    it('should not add x-csrf-token to state-changing requests', async () => {
      const mockHeaders = new Headers([['content-type', 'application/json']]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await apiService.post('/test', { data: 'test' });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.not.objectContaining({ 'x-csrf-token': expect.any(String) }),
        })
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
        expect.objectContaining({ credentials: 'include' })
      );
    });

    it('clearCsrfToken is callable without error', () => {
      expect(() => apiService.clearCsrfToken()).not.toThrow();
    });
  });

  describe('getBaseUrl (Node.js environment)', () => {
    const originalWindow = global.window;

    beforeEach(() => {
      // Simulate a non-browser (Node.js) environment by removing window.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).window = undefined;
    });

    afterEach(() => {
      global.window = originalWindow;
      delete process.env.API_BASE_URL;
    });

    it('returns the API_BASE_URL env var in Node.js development', () => {
      process.env.NODE_ENV = 'development';
      process.env.API_BASE_URL = 'http://localhost:3000';
      const service = new ApiService();
      expect(service.getConfig().apiUrl).toBe('http://localhost:3000');
    });

    it('returns empty string in Node.js development when API_BASE_URL is unset', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.API_BASE_URL;
      const service = new ApiService();
      expect(service.getConfig().apiUrl).toBe('');
    });

    it('throws when NODE_ENV is production and API_BASE_URL is unset', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.API_BASE_URL;
      expect(() => new ApiService()).toThrow(/API_BASE_URL/);
    });

    it('returns API_BASE_URL in Node.js production when the env var is set', () => {
      process.env.NODE_ENV = 'production';
      process.env.API_BASE_URL = 'https://api.example.com';
      const service = new ApiService();
      expect(service.getConfig().apiUrl).toBe('https://api.example.com');
    });
  });
});
