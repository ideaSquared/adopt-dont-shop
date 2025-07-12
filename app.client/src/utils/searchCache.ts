/**
 * Search Cache Utility
 * Caches search results with TTL and LRU eviction for message search functionality
 * Part of Phase 3 - Message Search Implementation
 */

interface SearchResult {
  id: string;
  conversationId: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  highlight?: string;
}

interface SearchCacheEntry {
  results: SearchResult[];
  total: number;
  query: string;
  timestamp: number;
  expiresAt: number;
}

interface SearchMetrics {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  averageQueryTime: number;
  popularQueries: Map<string, number>;
}

class SearchCache {
  private cache = new Map<string, SearchCacheEntry>();
  private metrics: SearchMetrics = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageQueryTime: 0,
    popularQueries: new Map(),
  };

  private readonly ttl: number; // Time to live in milliseconds
  private readonly maxSize: number;
  private readonly cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(ttl = 5 * 60 * 1000, maxSize = 200) {
    // 5 minutes TTL, 200 max items
    this.ttl = ttl;
    this.maxSize = maxSize;
    this.cleanupInterval = Math.min(ttl / 2, 60000); // Cleanup every 30 seconds or half TTL
    this.startCleanup();
  }

  /**
   * Generate cache key from search parameters
   */
  private generateKey(query: string, conversationId?: string, page = 1, limit = 50): string {
    const normalizedQuery = query.toLowerCase().trim();
    return `${normalizedQuery}:${conversationId || 'all'}:${page}:${limit}`;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: SearchCacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Evict oldest entries if cache is full
   */
  private evictOldest(): void {
    if (this.cache.size < this.maxSize) return;

    // Find oldest entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cached search results
   */
  get(query: string, conversationId?: string, page = 1, limit = 50): SearchCacheEntry | null {
    const key = this.generateKey(query, conversationId, page, limit);
    const entry = this.cache.get(key);

    this.metrics.totalQueries++;
    this.updatePopularQueries(query);

    if (!entry || this.isExpired(entry)) {
      this.metrics.cacheMisses++;
      if (entry) {
        this.cache.delete(key); // Remove expired entry
      }
      return null;
    }

    this.metrics.cacheHits++;
    return entry;
  }

  /**
   * Cache search results
   */
  set(
    query: string,
    results: SearchResult[],
    total: number,
    conversationId?: string,
    page = 1,
    limit = 50
  ): void {
    const key = this.generateKey(query, conversationId, page, limit);
    const now = Date.now();

    this.evictOldest();

    const entry: SearchCacheEntry = {
      results,
      total,
      query,
      timestamp: now,
      expiresAt: now + this.ttl,
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidate cache entries for a conversation
   */
  invalidateConversation(conversationId: string): void {
    const keysToDelete: string[] = [];

    for (const [key] of this.cache.entries()) {
      if (key.includes(`:${conversationId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Update popular queries tracking
   */
  private updatePopularQueries(query: string): void {
    const normalizedQuery = query.toLowerCase().trim();
    const count = this.metrics.popularQueries.get(normalizedQuery) || 0;
    this.metrics.popularQueries.set(normalizedQuery, count + 1);

    // Keep only top 20 popular queries
    if (this.metrics.popularQueries.size > 20) {
      const sorted = Array.from(this.metrics.popularQueries.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20);

      this.metrics.popularQueries.clear();
      sorted.forEach(([query, count]) => {
        this.metrics.popularQueries.set(query, count);
      });
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate =
      this.metrics.totalQueries > 0
        ? (this.metrics.cacheHits / this.metrics.totalQueries) * 100
        : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Number(hitRate.toFixed(2)),
      totalQueries: this.metrics.totalQueries,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      popularQueries: Array.from(this.metrics.popularQueries.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0,
      popularQueries: new Map(),
    };
  }

  /**
   * Destroy the cache and cleanup timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const searchCache = new SearchCache();
export type { SearchCacheEntry, SearchResult };
