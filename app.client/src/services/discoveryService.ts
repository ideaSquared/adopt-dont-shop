import {
  DiscoveryPet,
  PetDiscoveryQueue,
  PetSearchFilters,
  SwipeAction,
  SwipeStats,
} from '@/types';
import { apiService } from './api';

const API_BASE_URL = '/api/v1/discovery';

interface DiscoveryQueueResponse {
  pets: DiscoveryPet[];
  sessionId: string;
  hasMore: boolean;
  nextCursor?: string;
}

interface LoadMorePetsResponse {
  pets: DiscoveryPet[];
}

interface SessionStats {
  sessionId: string;
  totalSwipes: number;
  likes: number;
  passes: number;
  superLikes: number;
  duration: number;
}

export class DiscoveryService {
  private imagePreloadCache = new Set<string>();

  /**
   * Preload images for better performance
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
   * Get a queue of pets for swiping based on filters and user preferences
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

      const result = {
        pets: data.pets || [],
        currentIndex: 0,
        hasMore: data.hasMore || false,
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
   * Record a swipe action
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
   * Get user's swipe statistics
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

      const pets = data.pets || [];
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
