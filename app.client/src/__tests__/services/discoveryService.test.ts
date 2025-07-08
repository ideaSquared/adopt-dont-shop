import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock the api service before importing discoveryService
jest.mock('../../services/api', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { apiService } from '../../services/api';
import { discoveryService } from '../../services/discoveryService';

// Type the mocked apiService
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('Discovery Service Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiService.get.mockClear();
    mockApiService.post.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getDiscoveryQueue', () => {
    it('should fetch discovery queue successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Discovery queue retrieved successfully',
        data: {
          pets: [
            {
              petId: 'pet1',
              name: 'Buddy',
              type: 'dog',
              breed: 'Golden Retriever',
              ageGroup: 'adult',
              size: 'large',
              gender: 'male',
              images: ['image1.jpg'],
              rescueName: 'Test Rescue',
            },
          ],
          sessionId: 'session-123',
          hasMore: false,
        },
        timestamp: '2025-07-07T21:30:00.000Z',
      };

      mockApiService.get.mockResolvedValueOnce(mockResponse);

      const result = await discoveryService.getDiscoveryQueue({}, 10);

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/discovery/pets?limit=10');

      expect(result.pets).toEqual(mockResponse.data.pets);
      expect(result.currentIndex).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('API Error'));

      // The service returns empty result on error instead of throwing
      const result = await discoveryService.getDiscoveryQueue({}, 10);

      expect(result.pets).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('should build query parameters correctly', async () => {
      const mockResponse = {
        success: true,
        data: { pets: [], sessionId: 'session-123', hasMore: false },
        timestamp: '2025-07-07T21:30:00.000Z',
      };

      mockApiService.get.mockResolvedValueOnce(mockResponse);

      const filters = {
        type: 'dog',
        ageGroup: 'puppy',
        size: 'small',
        gender: 'female',
        breed: 'labrador',
        maxDistance: 25,
      };

      await discoveryService.getDiscoveryQueue(filters, 5);

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/v1/discovery/pets?limit=5&type=dog&breed=labrador&ageGroup=puppy&size=small&gender=female&maxDistance=25'
      );
    });
  });

  describe('loadMorePets', () => {
    it('should load more pets successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'More pets loaded successfully',
        data: {
          pets: [
            {
              petId: 'pet2',
              name: 'Max',
              type: 'cat',
            },
          ],
        },
        timestamp: '2025-07-07T21:30:00.000Z',
      };

      mockApiService.post.mockResolvedValueOnce(mockResponse);

      const result = await discoveryService.loadMorePets('session-123', 'pet1');

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/discovery/pets/more', {
        sessionId: 'session-123',
        lastPetId: 'pet1',
        limit: 10,
      });

      expect(result).toEqual(mockResponse.data.pets);
    });

    it('should handle load more errors gracefully', async () => {
      mockApiService.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await discoveryService.loadMorePets('session-123', 'pet1');

      expect(result).toEqual([]);
    });
  });

  describe('recordSwipeAction', () => {
    it('should record swipe action successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Swipe action recorded successfully',
        data: null,
        timestamp: '2025-07-07T21:30:00.000Z',
      };

      mockApiService.post.mockResolvedValueOnce(mockResponse);

      const swipeData = {
        petId: 'pet1',
        action: 'like' as const,
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
      };

      await discoveryService.recordSwipeAction(swipeData);

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/discovery/swipe/action', swipeData);
    });

    it('should handle swipe action errors gracefully', async () => {
      mockApiService.post.mockRejectedValueOnce(new Error('Network error'));

      const swipeData = {
        petId: 'pet1',
        action: 'like' as const,
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
      };

      // Should not throw an error, just log a warning
      await expect(discoveryService.recordSwipeAction(swipeData)).resolves.toBeUndefined();
    });
  });

  describe('getSwipeStats', () => {
    it('should fetch swipe stats successfully', async () => {
      const mockResponse = {
        totalSessions: 5,
        totalSwipes: 50,
        totalLikes: 20,
        totalPasses: 25,
        totalSuperLikes: 5,
        likeToSwipeRatio: 0.4,
        averageSessionDuration: 300,
        favoriteBreeds: ['Golden Retriever', 'Labrador'],
        favoriteAgeGroups: ['adult', 'young'],
      };

      mockApiService.get.mockResolvedValueOnce(mockResponse);

      const userId = 'user-123';
      const result = await discoveryService.getSwipeStats(userId);

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/discovery/swipe/stats/user-123');

      expect(result).toEqual(mockResponse);
    });

    it('should handle stats errors gracefully', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const userId = 'user-123';
      const result = await discoveryService.getSwipeStats(userId);

      expect(result).toEqual({
        totalSessions: 0,
        totalSwipes: 0,
        totalLikes: 0,
        totalPasses: 0,
        totalSuperLikes: 0,
        likeToSwipeRatio: 0,
        averageSessionDuration: 0,
        favoriteBreeds: [],
        favoriteAgeGroups: [],
      });
    });
  });
});
