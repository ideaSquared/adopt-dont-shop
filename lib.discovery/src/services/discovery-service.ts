import { ApiService } from '@adopt-dont-shop/lib-api';
import {
  DiscoveryServiceConfig,
  SwipeSession,
  SwipeAction,
  PetDiscoveryQueue,
  SwipeStats,
  DiscoveryPet,
  PetSearchFilters,
  DiscoveryQueueResponse,
  LoadMorePetsResponse,
  SessionStats,
} from '../types';

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
 * - Swipe action tracking and analytics
 * - Behavioral learning and personalization
 * - Image preloading for smooth UX
 * - Advanced filtering and recommendation engine
 */
export class DiscoveryService {
  private apiService: ApiService;
  private config: DiscoveryServiceConfig;
  private API_BASE_URL = '/api/v1/discovery';

  constructor(config: DiscoveryServiceConfig = {}) {
    this.config = {
      debug: false,
      ...config,
    };

    this.apiService = new ApiService({
      apiUrl: config.apiUrl || '/api',
      debug: config.debug,
      timeout: 30000,
    });
  }

  /**
   * Get initial pet discovery queue with intelligent sorting
   *
   * Creates a personalized discovery queue based on:
   * - User preferences and past behavior
   * - Geographic proximity
   * - Pet characteristics matching user patterns
   * - Rescue organization partnerships
   *
   * The algorithm prioritizes:
   * 1. Pets matching user's swipe history patterns
   * 2. Recently added pets for freshness
   * 3. Sponsored/featured pets (but not overwhelmingly)
   * 4. Geographic proximity
   * 5. Behavioral compatibility scores
   *
   * @param filters - Search filters to apply to the queue
   * @param userId - Optional user ID for personalization
   * @returns Promise<PetDiscoveryQueue> - Initial queue with smart sorting
   * @throws Will return empty queue if backend fails
   */
  async getDiscoveryQueue(
    filters: PetSearchFilters = {},
    userId?: string
  ): Promise<PetDiscoveryQueue> {
    try {
      const requestBody = {
        filters: this.buildFilterParams(filters),
        userId,
        limit: 20,
      };

      const data = await this.apiService.post<DiscoveryQueueResponse>(
        `${this.API_BASE_URL}/queue`,
        requestBody
      );

      const queue = {
        pets: data.pets || [],
        currentIndex: data.currentIndex || 0,
        hasMore: data.hasMore || false,
        nextBatchSize: data.nextBatchSize || 20,
      };

      // Preload first batch of images for smooth swiping
      this.preloadImages(queue.pets);

      return queue;
    } catch (error) {
      if (this.config.debug) {
        console.warn(
          'Failed to fetch discovery queue from backend, returning empty result:',
          error
        );
      }
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
      await this.apiService.post(`${this.API_BASE_URL}/swipe/action`, action);
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to record swipe action to backend, logging locally:', error);
        console.info('Swipe action recorded (mock):', action);
      }
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
      return await this.apiService.get<SwipeStats>(`${this.API_BASE_URL}/swipe/stats/${userId}`);
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to fetch swipe stats from backend, returning empty stats:', error);
      }
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
   *
   * @param sessionId - Current swipe session ID
   * @param lastPetId - ID of the last pet shown
   * @returns Promise<DiscoveryPet[]> - Array of additional pets
   */
  async loadMorePets(sessionId: string, lastPetId: string): Promise<DiscoveryPet[]> {
    try {
      const requestBody = {
        sessionId,
        lastPetId,
        limit: 10,
      };

      const data = await this.apiService.post<LoadMorePetsResponse>(
        `${this.API_BASE_URL}/pets/more`,
        requestBody
      );

      const pets = data.pets || [];
      this.preloadImages(pets);
      return pets;
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to load more pets from backend, returning empty array:', error);
      }
      // Return empty array instead of mock data
      return [];
    }
  }

  /**
   * Get session statistics
   *
   * @param sessionId - Session ID to get statistics for
   * @returns Promise<SessionStats | null> - Session statistics or null if not found
   */
  async getSessionStats(sessionId: string): Promise<SessionStats | null> {
    try {
      return await this.apiService.get<SessionStats>(
        `${this.API_BASE_URL}/swipe/session/${sessionId}`
      );
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to fetch session stats from backend:', error);
      }
      return null;
    }
  }

  /**
   * Start a new swipe session
   *
   * @param userId - Optional user ID
   * @param filters - Search filters for this session
   * @returns Promise<SwipeSession> - New session details
   */
  async startSwipeSession(userId?: string, filters: PetSearchFilters = {}): Promise<SwipeSession> {
    try {
      const requestBody = {
        userId,
        filters,
        startTime: new Date().toISOString(),
      };

      return await this.apiService.post<SwipeSession>(
        `${this.API_BASE_URL}/swipe/session/start`,
        requestBody
      );
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to start swipe session, creating local session:', error);
      }
      // Return mock session for offline functionality
      return {
        sessionId: `session_${Date.now()}`,
        userId,
        startTime: new Date().toISOString(),
        totalSwipes: 0,
        likes: 0,
        passes: 0,
        superLikes: 0,
        filters,
      };
    }
  }

  /**
   * End a swipe session
   *
   * @param sessionId - Session ID to end
   * @returns Promise<void>
   */
  async endSwipeSession(sessionId: string): Promise<void> {
    try {
      await this.apiService.post(`${this.API_BASE_URL}/swipe/session/end`, {
        sessionId,
        endTime: new Date().toISOString(),
      });
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to end swipe session:', error);
      }
    }
  }

  /**
   * Preload images for smooth user experience
   * This ensures images are cached when user swipes
   *
   * @param pets - Array of pets whose images should be preloaded
   */
  private preloadImages(pets: DiscoveryPet[]): void {
    pets.forEach((pet) => {
      if (pet.images && pet.images.length > 0) {
        // Preload first image immediately, others in background
        const img = new Image();
        img.src = pet.images[0];

        // Preload additional images with small delay
        pet.images.slice(1, 3).forEach((imageUrl, index) => {
          setTimeout(
            () => {
              const additionalImg = new Image();
              additionalImg.src = imageUrl;
            },
            (index + 1) * 100
          );
        });
      }
    });
  }

  /**
   * Convert filters to query parameters
   *
   * @param filters - Search filters to convert
   * @returns Record<string, string> - Query parameters
   */
  private buildFilterParams(filters: PetSearchFilters): Record<string, string> {
    const params: Record<string, string> = {};

    if (filters.type) {
      params.type = filters.type;
    }
    if (filters.breed) {
      params.breed = filters.breed;
    }
    if (filters.ageGroup) {
      params.ageGroup = filters.ageGroup;
    }
    if (filters.size) {
      params.size = filters.size;
    }
    if (filters.gender) {
      params.gender = filters.gender;
    }
    if (filters.location) {
      params.location = filters.location;
    }
    if (filters.maxDistance !== undefined) {
      params.maxDistance = filters.maxDistance.toString();
    }
    if (filters.search) {
      params.search = filters.search;
    }

    return params;
  }
}
