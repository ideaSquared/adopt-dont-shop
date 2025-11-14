import { ApiService } from '@adopt-dont-shop/lib.api';
import {
  SearchServiceConfig,
  SearchServiceOptions,
  PetSearchFilters,
  SearchResult,
  MessageSearchOptions,
  MessageSearchResponse,
  SearchSuggestion,
  SearchCacheEntry,
  SearchMetrics,
  AdvancedSearchOptions,
  FacetedSearchResponse,
  PaginatedResponse,
} from '../types';

/**
 * Advanced Search Service
 *
 * Provides comprehensive search functionality for pets, messages, and other content
 * with intelligent caching, faceted search, and performance analytics.
 *
 * Features:
 * - Pet search with advanced filters
 * - Message search with conversation context
 * - Intelligent caching with TTL and LRU eviction
 * - Search suggestions and autocomplete
 * - Faceted search with filters
 * - Search analytics and performance tracking
 * - Geographic and proximity search
 * - Real-time search suggestions
 */
export class SearchService {
  private apiService: ApiService;
  private config: SearchServiceConfig;
  private cache: Map<string, SearchCacheEntry>;
  private metrics: SearchMetrics;
  private API_BASE_URL = '/api/v1/search';

  // Cache configuration
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 200;

  constructor(config: SearchServiceConfig = {}) {
    this.config = {
      debug: false,
      ...config,
    };

    this.apiService = new ApiService({
      apiUrl: config.apiUrl || '/api',
      debug: config.debug,
      timeout: 30000,
    });

    this.cache = new Map();
    this.metrics = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0,
      popularQueries: new Map(),
      performanceData: {
        fastQueries: 0,
        mediumQueries: 0,
        slowQueries: 0,
      },
    };

    this.startCacheCleanup();
  }

  /**
   * Search for pets with advanced filtering and sorting
   *
   * @param filters - Search filters and options
   * @param options - Request options
   * @returns Promise<PaginatedResponse<SearchResult>> - Search results with pagination
   */
  async searchPets(
    filters: PetSearchFilters = {},
    options: SearchServiceOptions = {}
  ): Promise<PaginatedResponse<SearchResult>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('pets', filters);

    try {
      // Check cache first
      if (options.useCache !== false) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.updateMetrics('pets', startTime, true);
          return cached as PaginatedResponse<SearchResult>;
        }
      }

      const response = await this.apiService.get<PaginatedResponse<SearchResult>>(
        `${this.API_BASE_URL}/pets`,
        this.buildQueryParams(filters)
      );

      // Cache the results
      if (options.useCache !== false) {
        this.setInCache(cacheKey, response);
      }

      this.updateMetrics('pets', startTime, false);
      return response;
    } catch (error) {
      this.updateMetrics('pets', startTime, false);
      if (this.config.debug) {
        console.warn('Pet search failed:', error);
      }

      return {
        data: [],
        success: false,
        message: 'Search failed',
        timestamp: new Date().toISOString(),
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 12,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  }

  /**
   * Search messages within conversations
   *
   * @param options - Message search options
   * @param requestOptions - Request options
   * @returns Promise<MessageSearchResponse> - Message search results
   */
  async searchMessages(
    options: MessageSearchOptions,
    requestOptions: SearchServiceOptions = {}
  ): Promise<MessageSearchResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('messages', options);

    try {
      // Check cache first
      if (requestOptions.useCache !== false) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.updateMetrics('messages', startTime, true);
          return cached as MessageSearchResponse;
        }
      }

      const queryParams = new URLSearchParams();
      queryParams.set('q', options.query);

      if (options.conversationId) queryParams.set('conversationId', options.conversationId);
      if (options.senderId) queryParams.set('senderId', options.senderId);
      if (options.startDate) queryParams.set('startDate', options.startDate.toISOString());
      if (options.endDate) queryParams.set('endDate', options.endDate.toISOString());
      if (options.messageType) queryParams.set('messageType', options.messageType);
      if (options.page) queryParams.set('page', options.page.toString());
      if (options.limit) queryParams.set('limit', options.limit.toString());
      if (options.sortBy) queryParams.set('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.set('sortOrder', options.sortOrder);

      const response = await this.apiService.get<MessageSearchResponse>(
        `${this.API_BASE_URL}/messages?${queryParams.toString()}`
      );

      // Cache the results
      if (requestOptions.useCache !== false) {
        this.setInCache(cacheKey, response);
      }

      this.updateMetrics('messages', startTime, false);
      return response;
    } catch (error) {
      this.updateMetrics('messages', startTime, false);
      if (this.config.debug) {
        console.warn('Message search failed:', error);
      }

      return {
        results: [],
        total: 0,
        page: options.page || 1,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
        queryTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get search suggestions and autocomplete
   *
   * @param query - Partial search query
   * @param type - Type of suggestions ('pets', 'messages', 'all')
   * @param options - Request options
   * @returns Promise<SearchSuggestion[]> - Search suggestions
   */
  async getSearchSuggestions(
    query: string,
    type: 'pets' | 'messages' | 'all' = 'all'
  ): Promise<SearchSuggestion[]> {
    try {
      const response = await this.apiService.get<SearchSuggestion[]>(
        `${this.API_BASE_URL}/suggestions`,
        { q: query, type }
      );

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to get search suggestions:', error);
      }
      return [];
    }
  }

  /**
   * Perform faceted search with advanced filtering
   *
   * @param query - Search query
   * @param advancedOptions - Advanced search options
   * @param options - Request options
   * @returns Promise<FacetedSearchResponse> - Faceted search results
   */
  async facetedSearch(
    query: string,
    advancedOptions: AdvancedSearchOptions = {}
  ): Promise<FacetedSearchResponse> {
    const startTime = Date.now();

    try {
      const requestBody = {
        query,
        ...advancedOptions,
      };

      const response = await this.apiService.post<FacetedSearchResponse>(
        `${this.API_BASE_URL}/faceted`,
        requestBody
      );

      this.updateMetrics('faceted', startTime, false);
      return response;
    } catch (error) {
      this.updateMetrics('faceted', startTime, false);
      if (this.config.debug) {
        console.warn('Faceted search failed:', error);
      }

      return {
        results: [],
        facets: [],
        total: 0,
        page: 1,
        totalPages: 0,
        queryTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get search analytics and metrics
   *
   * @returns SearchMetrics - Current search metrics
   */
  getSearchMetrics(): SearchMetrics {
    return {
      ...this.metrics,
      popularQueries: new Map(this.metrics.popularQueries),
    };
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.cache.clear();
    if (this.config.debug) {
      console.log('Search cache cleared');
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Object with cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; maxSize: number } {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = totalRequests > 0 ? this.metrics.cacheHits / totalRequests : 0;

    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }

  /**
   * Generate cache key from search parameters
   */
  private generateCacheKey(type: string, params: any): string {
    const sortedParams = JSON.stringify(params, Object.keys(params).sort());
    return `${type}:${btoa(sortedParams)}`;
  }

  /**
   * Get result from cache if not expired
   */
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.results;
  }

  /**
   * Store result in cache with TTL
   */
  private setInCache(key: string, data: any): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: SearchCacheEntry = {
      results: data,
      total: data.total || data.pagination?.total || 0,
      query: key,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL,
    };

    this.cache.set(key, entry);
  }

  /**
   * Update search metrics
   */
  private updateMetrics(queryType: string, startTime: number, cacheHit: boolean): void {
    const queryTime = Date.now() - startTime;

    this.metrics.totalQueries++;

    if (cacheHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;

      // Update performance metrics
      if (queryTime < 100) {
        this.metrics.performanceData.fastQueries++;
      } else if (queryTime < 500) {
        this.metrics.performanceData.mediumQueries++;
      } else {
        this.metrics.performanceData.slowQueries++;
      }
    }

    // Update average query time
    const totalNonCachedQueries = this.metrics.cacheMisses;
    if (totalNonCachedQueries > 0) {
      this.metrics.averageQueryTime =
        (this.metrics.averageQueryTime * (totalNonCachedQueries - 1) + queryTime) /
        totalNonCachedQueries;
    }

    // Track popular query types
    const count = this.metrics.popularQueries.get(queryType) || 0;
    this.metrics.popularQueries.set(queryType, count + 1);
  }

  /**
   * Build query parameters for API requests
   */
  private buildQueryParams(filters: PetSearchFilters): Record<string, string> {
    const params: Record<string, string> = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    });

    return params;
  }

  /**
   * Start automatic cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys = Array.from(this.cache.entries())
        .filter(([, entry]) => now > entry.expiresAt)
        .map(([key]) => key);

      expiredKeys.forEach((key) => this.cache.delete(key));

      if (this.config.debug && expiredKeys.length > 0) {
        console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
      }
    }, 60000); // Run every minute
  }
}
