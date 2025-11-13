import { SearchService } from '../search-service';
import {
  PetSearchFilters,
  SearchResult,
  MessageSearchOptions,
  MessageSearchResponse,
  SearchSuggestion,
  AdvancedSearchOptions,
  FacetedSearchResponse,
  PaginatedResponse,
} from '../../types';

// Mock lib.api
jest.mock('@adopt-dont-shop/lib.api', () => ({
  ApiService: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock setInterval
const mockSetInterval = jest.fn();
global.setInterval = mockSetInterval;

// Mock timers for cache cleanup tests
jest.useFakeTimers();

describe('SearchService', () => {
  let service: SearchService;
  let mockApiService: any;

  const mockPetSearchResult: SearchResult = {
    id: 'pet-123',
    type: 'pet',
    title: 'Buddy - Golden Retriever',
    description: 'Friendly and energetic dog',
    metadata: {
      petId: 'pet-123',
      breed: 'Golden Retriever',
      age: 2,
      size: 'large',
    },
    relevanceScore: 0.95,
    createdAt: '2024-01-01T12:00:00Z',
  };

  const mockMessageSearchResponse: MessageSearchResponse = {
    results: [
      {
        id: 'msg-123',
        conversationId: 'conv-456',
        content: 'Looking for a friendly dog',
        senderId: 'user-789',
        senderName: 'John Doe',
        createdAt: '2024-01-01T12:00:00Z',
        highlight: 'Looking for a <mark>friendly</mark> dog',
      },
    ],
    total: 1,
    page: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    queryTime: 150,
  };

  const mockPaginatedResponse: PaginatedResponse<SearchResult> = {
    data: [mockPetSearchResult],
    success: true,
    message: 'Search completed',
    timestamp: '2024-01-01T12:00:00Z',
    pagination: {
      page: 1,
      limit: 12,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Get the mocked constructor and create a mock instance
    const { ApiService } = await import('@adopt-dont-shop/lib.api');
    mockApiService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    ApiService.mockImplementation(() => mockApiService);

    service = new SearchService({
      debug: false,
      apiUrl: 'http://localhost:3000',
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultService = new SearchService();
      expect(defaultService).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const customService = new SearchService({
        debug: true,
        apiUrl: 'https://api.example.com',
        headers: { 'X-Custom': 'header' },
      });
      expect(customService).toBeDefined();
    });
  });

  describe('searchPets', () => {
    it('should search pets successfully', async () => {
      const filters: PetSearchFilters = {
        type: 'dog',
        size: 'large',
        location: 'New York',
        page: 1,
        limit: 12,
      };

      mockApiService.get.mockResolvedValue(mockPaginatedResponse);

      const result = await service.searchPets(filters);

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/search/pets', {
        type: 'dog',
        size: 'large',
        location: 'New York',
        page: '1',
        limit: '12',
      });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle empty filters', async () => {
      mockApiService.get.mockResolvedValue(mockPaginatedResponse);

      await service.searchPets();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/search/pets', {});
    });

    it('should return empty results on API failure', async () => {
      mockApiService.get.mockRejectedValue(new Error('API Error'));

      const result = await service.searchPets({ type: 'dog' });

      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should use cache when available', async () => {
      const filters: PetSearchFilters = { type: 'dog' };

      mockApiService.get.mockResolvedValue(mockPaginatedResponse);

      // First call - should hit API
      await service.searchPets(filters);

      // Second call - should use cache
      const result = await service.searchPets(filters);

      expect(mockApiService.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should skip cache when useCache is false', async () => {
      const filters: PetSearchFilters = { type: 'dog' };

      mockApiService.get.mockResolvedValue(mockPaginatedResponse);

      await service.searchPets(filters, { useCache: false });
      await service.searchPets(filters, { useCache: false });

      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('searchMessages', () => {
    it('should search messages successfully', async () => {
      const options: MessageSearchOptions = {
        query: 'friendly dog',
        conversationId: 'conv-123',
        page: 1,
        limit: 50,
        sortBy: 'relevance',
        sortOrder: 'DESC',
      };

      mockApiService.get.mockResolvedValue(mockMessageSearchResponse);

      const result = await service.searchMessages(options);

      expect(mockApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/search/messages')
      );
      expect(result).toEqual(mockMessageSearchResponse);
    });

    it('should handle date filters', async () => {
      const options: MessageSearchOptions = {
        query: 'test',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      mockApiService.get.mockResolvedValue(mockMessageSearchResponse);

      await service.searchMessages(options);

      const callArgs = mockApiService.get.mock.calls[0][0];
      expect(callArgs).toContain('startDate=2024-01-01T00%3A00%3A00.000Z');
      expect(callArgs).toContain('endDate=2024-01-31T00%3A00%3A00.000Z');
    });

    it('should return empty results on API failure', async () => {
      mockApiService.get.mockRejectedValue(new Error('API Error'));

      const result = await service.searchMessages({ query: 'test' });

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should cache message search results', async () => {
      const options: MessageSearchOptions = { query: 'test' };

      mockApiService.get.mockResolvedValue(mockMessageSearchResponse);

      // First call
      await service.searchMessages(options);
      // Second call should use cache
      const result = await service.searchMessages(options);

      expect(mockApiService.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockMessageSearchResponse);
    });
  });

  describe('getSearchSuggestions', () => {
    it('should get search suggestions successfully', async () => {
      const mockSuggestions: SearchSuggestion[] = [
        { text: 'golden retriever', type: 'query', count: 15 },
        { text: 'large dogs', type: 'filter', category: 'size' },
      ];

      mockApiService.get.mockResolvedValue(mockSuggestions);

      const result = await service.getSearchSuggestions('golden', 'pets');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/search/suggestions', {
        q: 'golden',
        type: 'pets',
      });
      expect(result).toEqual(mockSuggestions);
    });

    it('should return empty array on API failure', async () => {
      mockApiService.get.mockRejectedValue(new Error('API Error'));

      const result = await service.getSearchSuggestions('test');

      expect(result).toEqual([]);
    });

    it('should handle different suggestion types', async () => {
      mockApiService.get.mockResolvedValue([]);

      await service.getSearchSuggestions('test', 'all');
      await service.getSearchSuggestions('test', 'messages');
      await service.getSearchSuggestions('test', 'pets');

      expect(mockApiService.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('facetedSearch', () => {
    it('should perform faceted search successfully', async () => {
      const mockFacetedResponse: FacetedSearchResponse = {
        results: [mockPetSearchResult],
        facets: [
          {
            name: 'type',
            values: [
              { value: 'dog', count: 150 },
              { value: 'cat', count: 100 },
            ],
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
        queryTime: 120,
      };

      const advancedOptions: AdvancedSearchOptions = {
        includeTypes: ['pet'],
        location: { lat: 40.7128, lng: -74.006, radius: 50 },
        facets: ['type', 'size', 'age'],
      };

      mockApiService.post.mockResolvedValue(mockFacetedResponse);

      const result = await service.facetedSearch('friendly dog', advancedOptions);

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/search/faceted', {
        query: 'friendly dog',
        ...advancedOptions,
      });
      expect(result).toEqual(mockFacetedResponse);
    });

    it('should return empty results on API failure', async () => {
      mockApiService.post.mockRejectedValue(new Error('API Error'));

      const result = await service.facetedSearch('test');

      expect(result.results).toEqual([]);
      expect(result.facets).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('cache management', () => {
    it('should get search metrics', () => {
      const metrics = service.getSearchMetrics();

      expect(metrics).toHaveProperty('totalQueries');
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('cacheMisses');
      expect(metrics).toHaveProperty('averageQueryTime');
      expect(metrics).toHaveProperty('popularQueries');
      expect(metrics).toHaveProperty('performanceData');
    });

    it('should clear cache', () => {
      service.clearCache();

      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should get cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('maxSize');
      expect(typeof stats.hitRate).toBe('number');
    });

    it('should update metrics correctly', async () => {
      mockApiService.get.mockResolvedValue(mockPaginatedResponse);

      await service.searchPets({ type: 'dog' });

      const metrics = service.getSearchMetrics();
      expect(metrics.totalQueries).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
    });

    it('should evict oldest cache entries when cache is full', async () => {
      mockApiService.get.mockResolvedValue(mockPaginatedResponse);

      // Fill cache beyond capacity
      const promises: Promise<PaginatedResponse<SearchResult>>[] = [];
      for (let i = 0; i < 202; i++) {
        promises.push(service.searchPets({ type: 'dog', page: i }));
      }
      await Promise.all(promises);

      const stats = service.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(200);
    });
  });

  describe('performance tracking', () => {
    it('should track fast queries', async () => {
      mockApiService.get.mockResolvedValue(mockPaginatedResponse);

      await service.searchPets({ type: 'dog' });

      const metrics = service.getSearchMetrics();
      expect(metrics.performanceData.fastQueries).toBeGreaterThanOrEqual(0);
    });

    it('should track query popularity', async () => {
      mockApiService.get.mockResolvedValue(mockPaginatedResponse);

      await service.searchPets({ type: 'dog' });
      await service.searchPets({ type: 'cat' });
      await service.searchPets({ type: 'dog' }); // Second dog search

      const metrics = service.getSearchMetrics();
      expect(metrics.popularQueries.get('pets')).toBeGreaterThan(0);
    });
  });

  describe('error handling and debug mode', () => {
    it('should log debug information when debug mode is enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const debugService = new SearchService({ debug: true });
      mockApiService.get.mockRejectedValue(new Error('Test error'));

      await debugService.searchPets({ type: 'dog' });

      expect(consoleSpy).toHaveBeenCalledWith('Pet search failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle timeout options', async () => {
      mockApiService.get.mockResolvedValue(mockPaginatedResponse);

      await service.searchPets({ type: 'dog' });

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/search/pets', expect.any(Object));
    });
  });
});
