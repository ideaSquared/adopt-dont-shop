import { DiscoveryService } from '../discovery-service';
import {
  SwipeSession,
  SwipeAction,
  PetDiscoveryQueue,
  SwipeStats,
  DiscoveryPet,
  PetSearchFilters,
  SessionStats,
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

// Mock Image constructor for preloading tests
global.Image = jest.fn(() => ({
  src: '',
  onload: null,
  onerror: null,
})) as any;

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let mockApiService: any;

  const mockDiscoveryPet: DiscoveryPet = {
    petId: 'pet-123',
    name: 'Buddy',
    type: 'dog',
    breed: 'Golden Retriever',
    ageGroup: 'young',
    ageYears: 2,
    size: 'large',
    gender: 'male',
    images: ['image1.jpg', 'image2.jpg'],
    shortDescription: 'Friendly and energetic',
    distance: 5.2,
    rescueName: 'Happy Paws Rescue',
    isSponsored: false,
    compatibilityScore: 0.85,
  };

  const mockSwipeAction: SwipeAction = {
    petId: 'pet-123',
    action: 'like',
    sessionId: 'session-456',
    timestamp: '2024-01-01T12:00:00Z',
  };

  const mockResponse: PetDiscoveryQueue = {
    pets: [mockDiscoveryPet],
    currentIndex: 0,
    hasMore: true,
    nextBatchSize: 20,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Get the mocked constructor and create a mock instance
    const { ApiService } = await import('@adopt-dont-shop/lib.api');
    mockApiService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    ApiService.mockImplementation(() => mockApiService);

    service = new DiscoveryService({
      debug: true,
      apiUrl: '/test-api',
    });
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultService = new DiscoveryService();
      expect(defaultService).toBeInstanceOf(DiscoveryService);
    });

    it('should initialize with custom config', () => {
      const customService = new DiscoveryService({
        debug: true,
        apiUrl: '/custom-api',
      });
      expect(customService).toBeInstanceOf(DiscoveryService);
    });
  });

  describe('getDiscoveryQueue', () => {
    it('should fetch discovery queue successfully', async () => {
      mockApiService.post.mockResolvedValue(mockResponse);

      const result = await service.getDiscoveryQueue();

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/discovery/queue', {
        filters: {},
        userId: undefined,
        limit: 20,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle filters correctly', async () => {
      const filters: PetSearchFilters = {
        type: 'dog',
        breed: 'Golden Retriever',
        size: 'large',
        maxDistance: 10,
      };

      mockApiService.post.mockResolvedValue(mockResponse);

      await service.getDiscoveryQueue(filters, 'user-123');

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/discovery/queue', {
        filters: {
          type: 'dog',
          breed: 'Golden Retriever',
          size: 'large',
          maxDistance: '10',
        },
        userId: 'user-123',
        limit: 20,
      });
    });

    it('should return empty queue on API failure', async () => {
      mockApiService.post.mockRejectedValue(new Error('API Error'));

      const result = await service.getDiscoveryQueue();

      expect(result).toEqual({
        pets: [],
        currentIndex: 0,
        hasMore: false,
        nextBatchSize: 20,
      });
    });

    it('should preload images for returned pets', async () => {
      mockApiService.post.mockResolvedValue(mockResponse);

      await service.getDiscoveryQueue();

      expect(global.Image).toHaveBeenCalled();
    });
  });

  describe('recordSwipeAction', () => {
    it('should record swipe action successfully', async () => {
      mockApiService.post.mockResolvedValue({});

      await service.recordSwipeAction(mockSwipeAction);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/v1/discovery/swipe/action',
        mockSwipeAction
      );
    });

    it('should handle API failure gracefully', async () => {
      mockApiService.post.mockRejectedValue(new Error('API Error'));

      await expect(service.recordSwipeAction(mockSwipeAction)).resolves.not.toThrow();
    });

    it('should support different swipe actions', async () => {
      const swipeAction: SwipeAction = {
        petId: 'pet-123',
        action: 'like',
        sessionId: 'session-456',
        timestamp: '2024-01-01T12:00:00Z',
      };

      mockApiService.post.mockResolvedValue({});

      await service.recordSwipeAction(swipeAction);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/v1/discovery/swipe/action',
        swipeAction
      );
    });
  });

  describe('getSwipeStats', () => {
    const mockStats: SwipeStats = {
      totalSessions: 5,
      totalSwipes: 50,
      totalLikes: 25,
      totalPasses: 20,
      totalSuperLikes: 5,
      likeToSwipeRatio: 0.5,
      averageSessionDuration: 180,
      favoriteBreeds: ['Golden Retriever', 'Labrador'],
      favoriteAgeGroups: ['young', 'adult'],
    };

    it('should fetch swipe statistics successfully', async () => {
      mockApiService.get.mockResolvedValue(mockStats);

      const result = await service.getSwipeStats('user-123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/discovery/swipe/stats/user-123');
      expect(result).toEqual(mockStats);
    });

    it('should return empty stats on API failure', async () => {
      mockApiService.get.mockRejectedValue(new Error('API Error'));

      const result = await service.getSwipeStats('user-123');

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

  describe('loadMorePets', () => {
    const mockMorePets: DiscoveryPet[] = [mockDiscoveryPet];

    it('should load more pets successfully', async () => {
      mockApiService.post.mockResolvedValue({ pets: mockMorePets });

      const result = await service.loadMorePets('session-123', 'pet-456');

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/discovery/pets/more', {
        sessionId: 'session-123',
        lastPetId: 'pet-456',
        limit: 10,
      });
      expect(result).toEqual(mockMorePets);
    });

    it('should return empty array on API failure', async () => {
      mockApiService.post.mockRejectedValue(new Error('API Error'));

      const result = await service.loadMorePets('session-123', 'pet-456');

      expect(result).toEqual([]);
    });

    it('should preload images for loaded pets', async () => {
      mockApiService.post.mockResolvedValue({ pets: mockMorePets });

      await service.loadMorePets('session-123', 'pet-456');

      expect(global.Image).toHaveBeenCalled();
    });
  });

  describe('session management', () => {
    describe('startSwipeSession', () => {
      const mockSession: SwipeSession = {
        sessionId: 'session-123',
        userId: 'user-123',
        startTime: '2024-01-01T12:00:00Z',
        totalSwipes: 0,
        likes: 0,
        passes: 0,
        superLikes: 0,
        filters: { type: 'dog' },
      };

      it('should start a new swipe session successfully', async () => {
        mockApiService.post.mockResolvedValue(mockSession);

        const result = await service.startSwipeSession('user-123', { type: 'dog' });

        expect(mockApiService.post).toHaveBeenCalledWith(
          '/api/v1/discovery/swipe/session/start',
          expect.objectContaining({
            userId: 'user-123',
            filters: { type: 'dog' },
            startTime: expect.any(String),
          })
        );
        expect(result).toEqual(mockSession);
      });

      it('should create local session on API failure', async () => {
        mockApiService.post.mockRejectedValue(new Error('API Error'));

        const result = await service.startSwipeSession('user-123', { type: 'dog' });

        expect(result).toMatchObject({
          sessionId: expect.stringContaining('session_'),
          userId: 'user-123',
          startTime: expect.any(String),
          totalSwipes: 0,
          likes: 0,
          passes: 0,
          superLikes: 0,
          filters: { type: 'dog' },
        });
      });
    });

    describe('endSwipeSession', () => {
      it('should end swipe session successfully', async () => {
        mockApiService.post.mockResolvedValue({});

        await service.endSwipeSession('session-123');

        expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/discovery/swipe/session/end', {
          sessionId: 'session-123',
          endTime: expect.any(String),
        });
      });

      it('should handle API failure gracefully', async () => {
        mockApiService.post.mockRejectedValue(new Error('API Error'));

        await expect(service.endSwipeSession('session-123')).resolves.not.toThrow();
      });
    });

    describe('getSessionStats', () => {
      const mockSessionStats: SessionStats = {
        sessionId: 'session-123',
        totalSwipes: 15,
        likes: 8,
        passes: 7,
        superLikes: 0,
        duration: 180,
      };

      it('should fetch session statistics successfully', async () => {
        mockApiService.get.mockResolvedValue(mockSessionStats);

        const result = await service.getSessionStats('session-123');

        expect(mockApiService.get).toHaveBeenCalledWith(
          '/api/v1/discovery/swipe/session/session-123'
        );
        expect(result).toEqual(mockSessionStats);
      });

      it('should return null on API failure', async () => {
        mockApiService.get.mockRejectedValue(new Error('API Error'));

        const result = await service.getSessionStats('session-123');

        expect(result).toBeNull();
      });
    });
  });

  describe('filter handling', () => {
    it('should build filter parameters correctly', async () => {
      const filters: PetSearchFilters = {
        type: 'cat',
        breed: 'Persian',
        ageGroup: 'adult',
        size: 'medium',
        gender: 'female',
        location: 'New York, NY',
        maxDistance: 25,
        search: 'fluffy',
      };

      mockApiService.post.mockResolvedValue(mockResponse);

      await service.getDiscoveryQueue(filters);

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/discovery/queue', {
        filters: {
          type: 'cat',
          breed: 'Persian',
          ageGroup: 'adult',
          size: 'medium',
          gender: 'female',
          location: 'New York, NY',
          maxDistance: '25',
          search: 'fluffy',
        },
        userId: undefined,
        limit: 20,
      });
    });
  });

  describe('error handling and debug mode', () => {
    it('should log debug information when debug mode is enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockApiService.post.mockRejectedValue(new Error('API Error'));

      await service.getDiscoveryQueue();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
