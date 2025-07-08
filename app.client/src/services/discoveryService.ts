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
 * Response interface for the discovery queue endpoint
 */
interface DiscoveryQueueResponse {
  success: boolean;
  message: string;
  data: {
    pets: DiscoveryPet[];
    sessionId: string;
    hasMore: boolean;
    nextCursor?: string;
  };
  timestamp: string;
}

/**
 * Response interface for loading more pets
 */
interface LoadMorePetsResponse {
  success: boolean;
  message: string;
  data: {
    pets: DiscoveryPet[];
  };
  timestamp: string;
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
 * - Swipe action recording and analytics
 * - Image preloading for performance
 * - User behavior tracking
 */
export class DiscoveryService {
  private imagePreloadCache = new Set<string>();

  /**
   * Preload images for better user experience and performance
   * @param pets - Array of pets to preload images for
   * @param count - Number of pets to preload (default: 5)
   */
  private preloadImages(pets: DiscoveryPet[], count: number = 5): void {
    pets.slice(0, count).forEach(pet => {
      if (pet.images?.[0] && !this.imagePreloadCache.has(pet.images[0])) {
        const img = new Image();
        img.src = pet.images[0];
        this.imagePreloadCache.add(pet.images[0]);
      }
    });
  }

  /**
   * Get a smart discovery queue of pets for swiping
   *
   * Uses intelligent sorting algorithm that considers:
   * - Verified rescues (prioritized)
   * - Recently added pets (within 7 days)
   * - High-quality profiles (multiple photos)
   * - Young pets (popular with adopters)
   * - Breed diversity to prevent repetition
   * - User preferences and behavior (when userId provided)
   *
   * @param filters - Optional filters for pet characteristics
   * @param limit - Number of pets to return (default: 20, max: 50)
   * @param userId - Optional user ID for personalized recommendations
   * @returns Promise<PetDiscoveryQueue> - Discovery queue with session tracking
   */
  async getDiscoveryQueue(
    filters: PetSearchFilters,
    limit: number = 20,
    userId?: string
  ): Promise<PetDiscoveryQueue> {
    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        ...(userId && { userId }),
        ...this.buildFilterParams(filters),
      });

      const data = await apiService.get<DiscoveryQueueResponse>(
        `${API_BASE_URL}/pets?${queryParams}`
      );

      // Handle both direct response format and nested data format
      const queueData = data.data;

      const result = {
        pets: queueData.pets || [],
        currentIndex: 0,
        hasMore: queueData.hasMore || false,
        nextBatchSize: 20, // Default batch size
      };

      // Preload images for better performance
      this.preloadImages(result.pets);

      return result;
    } catch (error) {
      console.warn('Failed to fetch from backend, returning empty result:', error);
      // Return empty result instead of mock data
      return {
        pets: [],
        currentIndex: 0,
        hasMore: false,
        nextBatchSize: 20,
      };
    }
  }

  /**
   * Record a user's swipe action for analytics and machine learning
   *
   * Supported actions:
   * - 'like': User likes the pet (right swipe) - adds to favorites
   * - 'pass': User passes on the pet (left swipe) - won't show again
   * - 'super_like': User super likes the pet (up swipe) - priority interest
   * - 'info': User views pet details (down swipe/tap) - interest indicator
   *
   * @param action - Swipe action object containing action type, pet ID, session info
   * @returns Promise<void> - Resolves when action is recorded
   * @throws Will log warning if backend fails but won't throw error
   */
  async recordSwipeAction(action: SwipeAction): Promise<void> {
    try {
      await apiService.post(`${API_BASE_URL}/swipe/action`, action);
    } catch (error) {
      console.warn('Failed to record swipe action to backend, logging locally:', error);
      // In development, just log the action
      console.info('Swipe action recorded (mock):', action);
    }
  }

  /**
   * Get comprehensive swipe statistics for a user
   *
   * Returns analytics including:
   * - Total swipes and breakdown by action type
   * - Like rate and engagement metrics
   * - Average session length
   * - Top breeds and pet types viewed
   * - Behavioral insights for personalization
   *
   * @param userId - User UUID to get statistics for
   * @returns Promise<SwipeStats> - Comprehensive user analytics
   * @throws Will return empty stats if backend fails
   */
  async getSwipeStats(userId: string): Promise<SwipeStats> {
    try {
      return await apiService.get<SwipeStats>(`${API_BASE_URL}/swipe/stats/${userId}`);
    } catch (error) {
      console.warn('Failed to fetch swipe stats from backend, returning empty stats:', error);
      // Return empty stats instead of mock data
      return {
        totalSessions: 0,
        totalSwipes: 0,
        totalLikes: 0,
        totalPasses: 0,
        totalSuperLikes: 0,
        likeToSwipeRatio: 0,
        averageSessionDuration: 0,
        favoriteBreeds: [],
        favoriteAgeGroups: [],
      };
    }
  }

  /**
   * Load more pets for infinite swipe
   */
  async loadMorePets(sessionId: string, lastPetId: string): Promise<DiscoveryPet[]> {
    try {
      const requestBody = {
        sessionId,
        lastPetId,
        limit: 10,
      };

      const data = await apiService.post<LoadMorePetsResponse>(
        `${API_BASE_URL}/pets/more`,
        requestBody
      );

      const pets = data.data.pets || [];
      this.preloadImages(pets);
      return pets;
    } catch (error) {
      console.warn('Failed to load more pets from backend, returning empty array:', error);
      // Return empty array instead of mock data
      return [];
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<SessionStats | null> {
    try {
      return await apiService.get<SessionStats>(`${API_BASE_URL}/swipe/session/${sessionId}`);
    } catch (error) {
      console.warn('Failed to fetch session stats from backend:', error);
      return null;
    }
  }

  /**
   * Convert filters to query parameters
   */
  private buildFilterParams(filters: PetSearchFilters): Record<string, string> {
    const params: Record<string, string> = {};

    if (filters.type) params.type = filters.type;
    if (filters.breed) params.breed = filters.breed;
    if (filters.ageGroup) params.ageGroup = filters.ageGroup;
    if (filters.size) params.size = filters.size;
    if (filters.gender) params.gender = filters.gender;
    if (filters.location) params.location = filters.location;
    if (filters.maxDistance !== undefined) {
      params.maxDistance = filters.maxDistance.toString();
    }
    if (filters.search) params.search = filters.search;

    return params;
  }
}

// Export singleton instance
export const discoveryService = new DiscoveryService();
