import { ApiService } from '../services/api-service';
import { NetworkError } from '../errors';

// Mock fetch globally (mirrors api-service.test.ts).
const mockFetch = vi.fn();
global.fetch = mockFetch;

const jsonHeaders = () => new Headers([['content-type', 'application/json']]);

const okJson = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: jsonHeaders(),
    json: () => Promise.resolve(body),
  }) as Response;

const csrfResponse = (token = 'csrf-token') => okJson({ csrfToken: token });

describe('ApiService — additional behaviour', () => {
  let apiService: ApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    apiService = new ApiService({ apiUrl: 'https://api.example.com' });
  });

  describe('PATCH', () => {
    it('sends a PATCH request with the CSRF token and a JSON body', async () => {
      const data = { name: 'patched' };
      mockFetch.mockResolvedValueOnce(csrfResponse()).mockResolvedValueOnce(okJson({ ok: true }));

      const result = await apiService.patch<{ ok: boolean }>('/items/1', data);

      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://api.example.com/items/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(data),
          headers: expect.objectContaining({ 'x-csrf-token': 'csrf-token' }),
        })
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('query parameter serialization', () => {
    it('omits undefined, null and empty-string params', async () => {
      mockFetch.mockResolvedValueOnce(okJson({ data: [] }));

      await apiService.get('/search', { q: 'cat', skip: undefined, empty: '', missing: null });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/search?q=cat',
        expect.any(Object)
      );
    });

    it('flattens nested object params with dotted keys', async () => {
      mockFetch.mockResolvedValueOnce(okJson({ data: [] }));

      await apiService.get('/search', { filter: { breed: 'lab', age: 3 } });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/search?filter.breed=lab&filter.age=3',
        expect.any(Object)
      );
    });

    it('serialises array params with String() coercion', async () => {
      mockFetch.mockResolvedValueOnce(okJson({ data: [] }));

      await apiService.get('/search', { ids: [1, 2, 3] });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ids=1%2C2%2C3'),
        expect.any(Object)
      );
    });

    it('does not append a query string when params is not an object', async () => {
      mockFetch.mockResolvedValueOnce(okJson({ data: [] }));

      await apiService.get('/plain', 'ignored');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/plain', expect.any(Object));
    });
  });

  describe('file uploads', () => {
    it('uploadFile posts FormData without a JSON Content-Type and appends scalar fields', async () => {
      mockFetch.mockResolvedValueOnce(csrfResponse()).mockResolvedValueOnce(okJson({ id: 'f1' }));

      const file = new File(['hello'], 'note.txt', { type: 'text/plain' });
      const result = await apiService.uploadFile<{ id: string }>('/uploads', file, {
        caption: 'hi',
        order: 2,
        primary: true,
        ignored: { nested: 'object' },
      });

      expect(result).toEqual({ id: 'f1' });

      const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(init.method).toBe('POST');
      expect(init.body).toBeInstanceOf(FormData);
      const form = init.body as FormData;
      expect(form.get('file')).toBeInstanceOf(File);
      expect(form.get('caption')).toBe('hi');
      expect(form.get('order')).toBe('2');
      expect(form.get('primary')).toBe('true');
      // Non-scalar additional data is skipped.
      expect(form.get('ignored')).toBeNull();
      // FormData requests must not carry an explicit JSON Content-Type.
      expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    });

    it('uploadImage posts an `image` field and validates the response shape', async () => {
      const validBody = {
        url: '/uploads/pets/x.jpg',
        thumbnail_url: '/uploads/pets/x.thumb.jpg',
        original_filename: 'x.jpg',
        size_bytes: 100,
        content_type: 'image/jpeg',
      };
      mockFetch.mockResolvedValueOnce(csrfResponse()).mockResolvedValueOnce(okJson(validBody));

      const file = new File(['img'], 'x.jpg', { type: 'image/jpeg' });
      const result = await apiService.uploadImage(file);

      expect(result).toEqual(validBody);
      const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(url).toBe('https://api.example.com/api/v1/uploads/images');
      expect((init.body as FormData).get('image')).toBeInstanceOf(File);
    });

    it('uploadImage rejects when the response fails schema validation', async () => {
      mockFetch
        .mockResolvedValueOnce(csrfResponse())
        .mockResolvedValueOnce(okJson({ url: '/x.jpg' }));

      const file = new File(['img'], 'x.jpg', { type: 'image/jpeg' });

      await expect(apiService.uploadImage(file)).rejects.toThrow();
    });
  });

  describe('fetchRawWithAuth', () => {
    it('attaches the bearer token and returns the raw Response', async () => {
      apiService = new ApiService({
        apiUrl: 'https://api.example.com',
        getAuthToken: () => 'tok-123',
      });
      const raw = {
        ok: true,
        status: 200,
        headers: new Headers([['content-type', 'application/pdf']]),
      } as Response;
      mockFetch.mockResolvedValueOnce(raw);

      const result = await apiService.fetchRawWithAuth('/download/report.pdf');

      expect(result).toBe(raw);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/download/report.pdf',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }),
        })
      );
    });
  });

  describe('getCsrfToken', () => {
    it('caches the token after the first fetch', async () => {
      mockFetch.mockResolvedValueOnce(csrfResponse('cached'));

      const first = await apiService.getCsrfToken();
      const second = await apiService.getCsrfToken();

      expect(first).toBe('cached');
      expect(second).toBe('cached');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent token fetches into a single request', async () => {
      let resolveFetch: ((value: Response) => void) | undefined;
      mockFetch.mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          })
      );

      const p1 = apiService.getCsrfToken();
      const p2 = apiService.getCsrfToken();

      resolveFetch?.(csrfResponse('shared'));
      const [t1, t2] = await Promise.all([p1, p2]);

      expect(t1).toBe('shared');
      expect(t2).toBe('shared');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('rejects when the CSRF endpoint returns a non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        headers: jsonHeaders(),
        json: () => Promise.resolve({}),
      } as Response);

      await expect(apiService.getCsrfToken()).rejects.toThrow(/Failed to fetch CSRF token/);
    });

    it('rejects when the CSRF response body has no token', async () => {
      mockFetch.mockResolvedValueOnce(okJson({}));

      await expect(apiService.getCsrfToken()).rejects.toThrow(/CSRF token not found/);
    });

    it('continues a POST without a CSRF token when token retrieval fails', async () => {
      // First call: CSRF endpoint fails. Interceptor swallows the error and the
      // POST still goes out (server would reject if it truly needs the token).
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Server Error',
          headers: jsonHeaders(),
          json: () => Promise.resolve({}),
        } as Response)
        .mockResolvedValueOnce(okJson({ ok: true }));

      const result = await apiService.post<{ ok: boolean }>('/items', { a: 1 });

      expect(result).toEqual({ ok: true });
      const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['x-csrf-token']).toBeUndefined();
    });
  });

  describe('updateConfig', () => {
    it('updates the base URL used for subsequent requests when apiUrl changes', async () => {
      apiService.updateConfig({ apiUrl: 'https://new.example.com' });
      expect(apiService.getConfig().apiUrl).toBe('https://new.example.com');

      mockFetch.mockResolvedValueOnce(okJson({ data: 'ok' }));
      await apiService.get('/ping');

      expect(mockFetch).toHaveBeenCalledWith('https://new.example.com/ping', expect.any(Object));
    });

    it('replaces the onUnauthorized handler when provided in the update', async () => {
      const onUnauthorized = vi.fn();
      apiService.updateConfig({ onUnauthorized });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: jsonHeaders(),
        json: () => Promise.resolve({ message: 'expired' }),
      } as Response);

      await expect(apiService.get('/protected')).rejects.toThrow('expired');
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });
  });

  describe('network error mapping', () => {
    it('maps a fetch TypeError to a NetworkError', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(apiService.get('/down')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
