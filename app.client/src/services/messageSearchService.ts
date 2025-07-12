/**
 * Message Search Service
 * Full-text search functionality with caching and indexing
 * Part of Phase 3 - Message Search Implementation
 */

import { trackApiCall } from '@/utils/performanceMonitor';
import { searchCache, SearchResult } from '@/utils/searchCache';
import { api } from './api';

export interface SearchOptions {
  query: string;
  conversationId?: string;
  senderId?: string;
  startDate?: string;
  endDate?: string;
  messageType?: 'text' | 'image' | 'file';
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'sender';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
  searchTime: number;
  cached: boolean;
  suggestions?: string[];
}

export interface SearchSuggestion {
  query: string;
  count: number;
  type: 'popular' | 'recent' | 'autocomplete';
}

class MessageSearchService {
  private baseUrl = '/api/v1/search';
  private searchHistory: string[] = [];
  private readonly maxHistorySize = 50;

  /**
   * Search messages with caching
   */
  async searchMessages(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    const { query, conversationId, page = 1, limit = 50, ...otherOptions } = options;

    // Check cache first
    const cached = searchCache.get(query, conversationId, page, limit);
    if (cached) {
      this.addToHistory(query);
      return {
        results: cached.results,
        total: cached.total,
        page,
        totalPages: Math.ceil(cached.total / limit),
        query: cached.query,
        searchTime: Date.now() - startTime,
        cached: true,
      };
    }

    try {
      // Build search parameters
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: limit.toString(),
        ...otherOptions,
      });

      if (conversationId) {
        params.append('conversationId', conversationId);
      }

      const response = await api.get(`${this.baseUrl}/messages?${params.toString()}`);

      trackApiCall(`${this.baseUrl}/messages`, 'GET', startTime);

      if (!response || typeof response !== 'object' || !('data' in response)) {
        throw new Error('Invalid API response');
      }

      const responseData = response.data as Record<string, unknown>;
      if (!responseData || typeof responseData !== 'object') {
        throw new Error('Invalid search response format');
      }

      const results = (responseData.results || []) as SearchResult[];
      const total = Number(responseData.total || 0);
      const suggestions = (responseData.suggestions || []) as string[];

      // Cache the results
      searchCache.set(query, results, total, conversationId, page, limit);
      this.addToHistory(query);

      return {
        results,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        query,
        searchTime: Date.now() - startTime,
        cached: false,
        suggestions,
      };
    } catch (error) {
      console.error('Message search failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to search messages');
    }
  }

  /**
   * Get search suggestions based on query
   */
  async getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (!query.trim()) {
      return this.getRecentSearches();
    }

    try {
      const response = await api.get(`${this.baseUrl}/suggestions?q=${encodeURIComponent(query)}`);

      if (!response || typeof response !== 'object' || !('data' in response)) {
        return [];
      }

      const responseData = response.data as Record<string, unknown>;
      if (!responseData || !Array.isArray(responseData.suggestions)) {
        return [];
      }

      return responseData.suggestions;
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      // Fallback to local suggestions
      return this.getLocalSuggestions(query);
    }
  }

  /**
   * Get popular search queries
   */
  getPopularQueries(): SearchSuggestion[] {
    const stats = searchCache.getStats();
    return stats.popularQueries.map(([query, count]) => ({
      query,
      count,
      type: 'popular' as const,
    }));
  }

  /**
   * Get recent search history
   */
  getRecentSearches(): SearchSuggestion[] {
    return this.searchHistory
      .slice(-10)
      .reverse()
      .map(query => ({
        query,
        count: 1,
        type: 'recent' as const,
      }));
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
    this.saveHistoryToStorage();
  }

  /**
   * Add query to search history
   */
  private addToHistory(query: string): void {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(q => q !== trimmedQuery);

    // Add to beginning
    this.searchHistory.unshift(trimmedQuery);

    // Limit size
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }

    this.saveHistoryToStorage();
  }

  /**
   * Get local autocomplete suggestions
   */
  private getLocalSuggestions(query: string): SearchSuggestion[] {
    const lowerQuery = query.toLowerCase();

    return this.searchHistory
      .filter(q => q.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
      .map(q => ({
        query: q,
        count: 1,
        type: 'autocomplete' as const,
      }));
  }

  /**
   * Save search history to local storage
   */
  private saveHistoryToStorage(): void {
    try {
      localStorage.setItem('messageSearchHistory', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }

  /**
   * Load search history from local storage
   */
  private loadHistoryFromStorage(): void {
    try {
      const stored = localStorage.getItem('messageSearchHistory');
      if (stored) {
        this.searchHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
      this.searchHistory = [];
    }
  }

  /**
   * Invalidate search cache for a conversation
   */
  invalidateConversationCache(conversationId: string): void {
    searchCache.invalidateConversation(conversationId);
  }

  /**
   * Get search cache statistics
   */
  getCacheStats() {
    return searchCache.getStats();
  }

  /**
   * Initialize the service
   */
  initialize(): void {
    this.loadHistoryFromStorage();
  }
}

// Export singleton instance
export const messageSearchService = new MessageSearchService();

// Initialize on import
messageSearchService.initialize();
