import {
  DiscoveryPet,
  PetDiscoveryQueue,
  PetSearchFilters,
  SwipeAction,
  SwipeStats,
} from '@/types';
import { apiService } from './api';

const API_BASE_URL = '/api/v1/discovery';

/**
 * Response interface for the discovery queue endpoint (after apiService extraction)
 */
interface DiscoveryQueueResponse {
  pets: DiscoveryPet[];
  sessionId: string;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Response interface for loading more pets (after apiService extraction)
 */
interface LoadMorePetsResponse {
  pets: DiscoveryPet[];
}

/**
 * Session statistics interface
 */
interface SessionStats {
  sessionId: string;
  totalSwipes: number;
  likes: number;
  passes: number;
  superLikes: number;
  duration: number;
}

/**
 * Pet Discovery Service
 *
 * Provides intelligent pet discovery functionality with swipe-based interface,
 * smart recommendations, and comprehensive analytics. Integrates with the
 * backend discovery API for personalized pet matching.
 *
 * Features:
 * - Smart pet queue with intelligent sorting
 * - Infinite scroll with preloading
 * - Swipe tracking and analytics
 * - Session management
 * - Filter-based discovery
 * - Performance monitoring
 */
class DiscoveryService {
  private cache: Map<string, DiscoveryQueueResponse> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Get personalized pet discovery queue
   */
  async getDiscoveryQueue(
    filters: PetSearchFilters = {},
    queueSize: number = 20
  ): Promise<PetDiscoveryQueue> {
    const cacheKey = `queue_${JSON.stringify(filters)}_${queueSize}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('🎯 DiscoveryService: Using cached discovery queue');
      return {
        pets: cached.pets,
        sessionId: cached.sessionId,
        hasMore: cached.hasMore,
        nextCursor: cached.nextCursor,
      };
    }

    try {
      console.log('🎯 DiscoveryService: Fetching new discovery queue');
      const response = await apiService.get<DiscoveryQueueResponse>(API_BASE_URL, {
        ...filters,
        limit: queueSize,
      });

      // Cache the response with timestamp
      this.cache.set(cacheKey, {
        ...response,
        timestamp: Date.now(),
      });

      return {
        pets: response.pets,
        sessionId: response.sessionId,
        hasMore: response.hasMore,
        nextCursor: response.nextCursor,
      };
    } catch (error) {
      console.error('❌ DiscoveryService: Failed to fetch discovery queue:', error);
      throw error;
    }
  }

  /**
   * Load more pets for infinite scroll
   */
  async loadMorePets(
    sessionId: string,
    cursor?: string,
    limit: number = 10
  ): Promise<LoadMorePetsResponse> {
    try {
      console.log('🎯 DiscoveryService: Loading more pets for session:', sessionId);
      return await apiService.get<LoadMorePetsResponse>(`${API_BASE_URL}/more`, {
        sessionId,
        cursor,
        limit,
      });
    } catch (error) {
      console.error('❌ DiscoveryService: Failed to load more pets:', error);
      throw error;
    }
  }

  /**
   * Record a swipe action
   */
  async recordSwipe(
    sessionId: string,
    petId: string,
    action: SwipeAction,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      console.log(`🎯 DiscoveryService: Recording ${action} for pet ${petId}`);
      await apiService.post(`${API_BASE_URL}/swipe`, {
        sessionId,
        petId,
        action,
        timestamp: new Date().toISOString(),
        metadata,
      });

      // Clear cache after recording swipe to ensure fresh recommendations
      this.cache.clear();
    } catch (error) {
      console.error('❌ DiscoveryService: Failed to record swipe:', error);
      throw error;
    }
  }

  /**
   * Get swipe statistics for current session
   */
  async getSessionStats(sessionId: string): Promise<SessionStats> {
    try {
      return await apiService.get<SessionStats>(`${API_BASE_URL}/session/${sessionId}/stats`);
    } catch (error) {
      console.error('❌ DiscoveryService: Failed to get session stats:', error);
      throw error;
    }
  }

  /**
   * Get overall swipe statistics
   */
  async getSwipeStats(): Promise<SwipeStats> {
    try {
      return await apiService.get<SwipeStats>(`${API_BASE_URL}/stats`);
    } catch (error) {
      console.error('❌ DiscoveryService: Failed to get swipe stats:', error);
      throw error;
    }
  }

  /**
   * Start a new discovery session with filters
   */
  async startSession(filters: PetSearchFilters = {}): Promise<string> {
    try {
      console.log('🎯 DiscoveryService: Starting new discovery session');
      const response = await apiService.post<{ sessionId: string }>(`${API_BASE_URL}/session`, {
        filters,
        timestamp: new Date().toISOString(),
      });

      return response.sessionId;
    } catch (error) {
      console.error('❌ DiscoveryService: Failed to start session:', error);
      throw error;
    }
  }

  /**
   * End a discovery session
   */
  async endSession(sessionId: string): Promise<SessionStats> {
    try {
      console.log('🎯 DiscoveryService: Ending discovery session:', sessionId);
      const stats = await apiService.post<SessionStats>(
        `${API_BASE_URL}/session/${sessionId}/end`,
        {
          timestamp: new Date().toISOString(),
        }
      );

      // Clear cache when session ends
      this.cache.clear();

      return stats;
    } catch (error) {
      console.error('❌ DiscoveryService: Failed to end session:', error);
      throw error;
    }
  }

  /**
   * Get pet details for discovery (optimized payload)
   */
  async getDiscoveryPetDetails(petId: string): Promise<DiscoveryPet> {
    try {
      return await apiService.get<DiscoveryPet>(`${API_BASE_URL}/pet/${petId}`);
    } catch (error) {
      console.error('❌ DiscoveryService: Failed to get pet details:', error);
      throw error;
    }
  }

  /**
   * Report inappropriate content
   */
  async reportPet(
    petId: string,
    reason: string,
    description?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      console.log('🚨 DiscoveryService: Reporting pet:', petId, 'Reason:', reason);
      await apiService.post(`${API_BASE_URL}/report`, {
        petId,
        reason,
        description,
        sessionId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ DiscoveryService: Failed to report pet:', error);
      throw error;
    }
  }

  /**
   * Clear the discovery cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 DiscoveryService: Cache cleared');
  }

  /**
   * Update discovery preferences
   */
  async updatePreferences(preferences: Partial<PetSearchFilters>): Promise<void> {
    try {
      await apiService.patch(`${API_BASE_URL}/preferences`, preferences);
      // Clear cache to apply new preferences
      this.cache.clear();
    } catch (error) {
      console.error('❌ DiscoveryService: Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Get discovery insights and recommendations
   */
  async getInsights(): Promise<{
    recommendedFilters: PetSearchFilters;
    popularBreeds: string[];
    trends: Record<string, number>;
  }> {
    try {
      return await apiService.get(`${API_BASE_URL}/insights`);
    } catch (error) {
      console.error('❌ DiscoveryService: Failed to get insights:', error);
      throw error;
    }
  }
}

export const discoveryService = new DiscoveryService();
