import sequelize from '../../sequelize';
import { SwipeAction, SwipeService } from '../../services/swipe.service';

// Mock dependencies
jest.mock('../../sequelize');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockSequelize = sequelize as jest.Mocked<typeof sequelize>;

describe('SwipeService', () => {
  let swipeService: SwipeService;

  beforeEach(() => {
    jest.clearAllMocks();
    swipeService = new SwipeService();
  });

  describe('recordSwipeAction', () => {
    const mockSwipeAction: SwipeAction = {
      action: 'like',
      petId: 'pet123',
      sessionId: 'session123',
      timestamp: '2025-01-01T12:00:00Z',
      userId: 'user123',
    };

    it('should record swipe action successfully', async () => {
      mockSequelize.query = jest.fn().mockResolvedValue([]);

      await swipeService.recordSwipeAction(mockSwipeAction);

      expect(mockSequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO swipe_actions'),
        {
          replacements: {
            action: 'like',
            petId: 'pet123',
            sessionId: 'session123',
            userId: 'user123',
            timestamp: '2025-01-01T12:00:00Z',
          },
        }
      );
    });

    it('should record swipe action without userId', async () => {
      const actionWithoutUser = { ...mockSwipeAction, userId: undefined };
      mockSequelize.query = jest.fn().mockResolvedValue([]);

      await swipeService.recordSwipeAction(actionWithoutUser);

      expect(mockSequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO swipe_actions'),
        {
          replacements: {
            action: 'like',
            petId: 'pet123',
            sessionId: 'session123',
            userId: null,
            timestamp: '2025-01-01T12:00:00Z',
          },
        }
      );
    });

    it('should update user preferences for like action', async () => {
      mockSequelize.query = jest
        .fn()
        .mockResolvedValueOnce([]) // First call for inserting swipe action
        .mockResolvedValueOnce([
          [
            {
              type: 'dog',
              breed: 'Golden Retriever',
              age_group: 'adult',
              size: 'large',
              gender: 'male',
              good_with_children: true,
              good_with_dogs: true,
              good_with_cats: false,
              energy_level: 'high',
            },
          ],
        ]) // Second call for getting pet details
        .mockResolvedValueOnce([]); // Third call for updating preferences

      await swipeService.recordSwipeAction(mockSwipeAction);

      expect(mockSequelize.query).toHaveBeenCalledTimes(3);
      expect(mockSequelize.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SELECT type, breed, age_group'),
        {
          replacements: { petId: 'pet123' },
        }
      );
      expect(mockSequelize.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO user_preferences'),
        expect.objectContaining({
          replacements: expect.objectContaining({
            userId: 'user123',
            type: 'dog',
            breed: 'Golden Retriever',
            weight: 1,
          }),
        })
      );
    });

    it('should update user preferences for super_like action with higher weight', async () => {
      const superLikeAction = { ...mockSwipeAction, action: 'super_like' as const };
      mockSequelize.query = jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          [
            {
              type: 'cat',
              breed: 'Persian',
              age_group: 'young',
              size: 'medium',
              gender: 'female',
            },
          ],
        ])
        .mockResolvedValueOnce([]);

      await swipeService.recordSwipeAction(superLikeAction);

      expect(mockSequelize.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO user_preferences'),
        expect.objectContaining({
          replacements: expect.objectContaining({
            weight: 2, // Super like should have weight 2
          }),
        })
      );
    });

    it('should not update preferences for pass action', async () => {
      const passAction = { ...mockSwipeAction, action: 'pass' as const };
      mockSequelize.query = jest.fn().mockResolvedValue([]);

      await swipeService.recordSwipeAction(passAction);

      expect(mockSequelize.query).toHaveBeenCalledTimes(1); // Only the initial insert
    });

    it('should handle error when recording swipe action fails', async () => {
      mockSequelize.query = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(swipeService.recordSwipeAction(mockSwipeAction)).rejects.toThrow(
        'Failed to record swipe action'
      );
    });

    it('should continue if preference update fails', async () => {
      mockSequelize.query = jest
        .fn()
        .mockResolvedValueOnce([]) // Insert swipe action succeeds
        .mockResolvedValueOnce([[{ type: 'dog', breed: 'Golden Retriever' }]]) // Get pet details succeeds
        .mockRejectedValueOnce(new Error('Preference update failed')); // Preference update fails

      // Should not throw error
      await expect(swipeService.recordSwipeAction(mockSwipeAction)).resolves.not.toThrow();
    });
  });

  describe('getUserSwipeStats', () => {
    const mockStatsData = [
      {
        total_swipes: '150',
        likes: '45',
        passes: '90',
        super_likes: '10',
        info_views: '5',
      },
    ];

    const mockBreedData = [
      { breed: 'Golden Retriever', count: '15' },
      { breed: 'Labrador', count: '12' },
      { breed: 'German Shepherd', count: '8' },
    ];

    const mockTypeData = [
      { type: 'dog', count: '35' },
      { type: 'cat', count: '10' },
    ];

    const mockSessionData = [{ avg_session_length: 15.5 }];

    it('should get user swipe stats successfully', async () => {
      mockSequelize.query = jest
        .fn()
        .mockResolvedValueOnce([mockStatsData])
        .mockResolvedValueOnce([mockBreedData])
        .mockResolvedValueOnce([mockTypeData])
        .mockResolvedValueOnce([mockSessionData]);

      const result = await swipeService.getUserSwipeStats('user123');

      expect(result).toEqual({
        totalSwipes: 150,
        likes: 45,
        passes: 90,
        superLikes: 10,
        infoViews: 5,
        likeRate: 30, // 45/150 * 100 = 30%
        averageSessionLength: 15.5,
        topBreeds: mockBreedData,
        topTypes: mockTypeData,
      });

      expect(mockSequelize.query).toHaveBeenCalledTimes(4);
      expect(mockSequelize.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('COUNT(*) as total_swipes'),
        { replacements: { userId: 'user123' } }
      );
    });

    it('should handle zero swipes correctly', async () => {
      const emptyStats = [
        {
          total_swipes: '0',
          likes: '0',
          passes: '0',
          super_likes: '0',
          info_views: '0',
        },
      ];

      mockSequelize.query = jest
        .fn()
        .mockResolvedValueOnce([emptyStats])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const result = await swipeService.getUserSwipeStats('user123');

      expect(result.totalSwipes).toBe(0);
      expect(result.likeRate).toBe(0);
      expect(result.averageSessionLength).toBe(0);
      expect(result.topBreeds).toEqual([]);
      expect(result.topTypes).toEqual([]);
    });

    it('should handle null/undefined values gracefully', async () => {
      const nullStats = [
        {
          total_swipes: null,
          likes: null,
          passes: null,
          super_likes: null,
          info_views: null,
        },
      ];

      mockSequelize.query = jest
        .fn()
        .mockResolvedValueOnce([nullStats])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const result = await swipeService.getUserSwipeStats('user123');

      expect(result.totalSwipes).toBe(0);
      expect(result.likes).toBe(0);
      expect(result.passes).toBe(0);
      expect(result.superLikes).toBe(0);
      expect(result.infoViews).toBe(0);
      expect(result.likeRate).toBe(0);
    });

    it('should handle error when getting user stats fails', async () => {
      mockSequelize.query = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(swipeService.getUserSwipeStats('user123')).rejects.toThrow(
        'Failed to get user swipe statistics'
      );
    });
  });

  describe('getSessionStats', () => {
    const mockSessionData = [
      {
        session_id: 'session123',
        total_swipes: '25',
        likes: '8',
        passes: '15',
        super_likes: '2',
        info_views: '0',
        start_time: '2025-01-01T12:00:00Z',
        last_activity: '2025-01-01T12:30:00Z',
        duration: 30.5,
      },
    ];

    it('should get session stats successfully', async () => {
      mockSequelize.query = jest.fn().mockResolvedValue([mockSessionData]);

      const result = await swipeService.getSessionStats('session123');

      expect(result).toEqual({
        sessionId: 'session123',
        totalSwipes: 25,
        likes: 8,
        passes: 15,
        superLikes: 2,
        infoViews: 0,
        startTime: '2025-01-01T12:00:00Z',
        lastActivity: '2025-01-01T12:30:00Z',
        duration: 30.5,
      });

      expect(mockSequelize.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), {
        replacements: { sessionId: 'session123' },
      });
    });

    it('should throw error when session not found', async () => {
      mockSequelize.query = jest.fn().mockResolvedValue([[]]);

      await expect(swipeService.getSessionStats('nonexistent')).rejects.toThrow(
        'Failed to get session statistics'
      );
    });

    it('should handle null duration gracefully', async () => {
      const sessionDataWithNullDuration = [
        {
          ...mockSessionData[0],
          duration: null,
        },
      ];

      mockSequelize.query = jest.fn().mockResolvedValue([sessionDataWithNullDuration]);

      const result = await swipeService.getSessionStats('session123');

      expect(result.duration).toBe(0);
    });

    it('should handle error when getting session stats fails', async () => {
      mockSequelize.query = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(swipeService.getSessionStats('session123')).rejects.toThrow(
        'Failed to get session statistics'
      );
    });
  });

  describe('getUserPreferences', () => {
    const mockPreferences = [
      { preference_type: 'type', preference_value: 'dog', score: 25 },
      { preference_type: 'type', preference_value: 'cat', score: 5 },
      { preference_type: 'breed', preference_value: 'Golden Retriever', score: 15 },
      { preference_type: 'breed', preference_value: 'Labrador', score: 12 },
      { preference_type: 'size', preference_value: 'large', score: 20 },
    ];

    it('should get user preferences successfully', async () => {
      mockSequelize.query = jest.fn().mockResolvedValue([mockPreferences]);

      const result = await swipeService.getUserPreferences('user123');

      expect(result).toEqual({
        type: [
          { value: 'dog', score: 25 },
          { value: 'cat', score: 5 },
        ],
        breed: [
          { value: 'Golden Retriever', score: 15 },
          { value: 'Labrador', score: 12 },
        ],
        size: [{ value: 'large', score: 20 }],
      });

      expect(mockSequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT preference_type, preference_value, score'),
        { replacements: { userId: 'user123' } }
      );
    });

    it('should return empty object when no preferences found', async () => {
      mockSequelize.query = jest.fn().mockResolvedValue([[]]);

      const result = await swipeService.getUserPreferences('user123');

      expect(result).toEqual({});
    });

    it('should return empty object on database error', async () => {
      mockSequelize.query = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await swipeService.getUserPreferences('user123');

      expect(result).toEqual({});
    });
  });

  describe('updateUserPreferences (private method)', () => {
    const mockPetData = [
      {
        type: 'dog',
        breed: 'Golden Retriever',
        age_group: 'adult',
        size: 'large',
        gender: 'male',
        good_with_children: true,
        good_with_dogs: true,
        good_with_cats: false,
        energy_level: 'high',
      },
    ];

    it('should update user preferences for like action', async () => {
      mockSequelize.query = jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockPetData])
        .mockResolvedValueOnce([]);

      await swipeService.recordSwipeAction({
        action: 'like',
        petId: 'pet123',
        sessionId: 'session123',
        timestamp: '2025-01-01T12:00:00Z',
        userId: 'user123',
      });

      expect(mockSequelize.query).toHaveBeenCalledTimes(3);
      expect(mockSequelize.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO user_preferences'),
        expect.objectContaining({
          replacements: expect.objectContaining({
            userId: 'user123',
            type: 'dog',
            breed: 'Golden Retriever',
            ageGroup: 'adult',
            size: 'large',
            gender: 'male',
            weight: 1,
          }),
        })
      );
    });

    it('should handle pet not found gracefully', async () => {
      mockSequelize.query = jest
        .fn()
        .mockResolvedValueOnce([]) // Insert swipe action
        .mockResolvedValueOnce([[]]); // No pet found

      // Should not throw error
      await expect(
        swipeService.recordSwipeAction({
          action: 'like',
          petId: 'nonexistent',
          sessionId: 'session123',
          timestamp: '2025-01-01T12:00:00Z',
          userId: 'user123',
        })
      ).resolves.not.toThrow();
    });

    it('should handle unknown breed gracefully', async () => {
      const petWithoutBreed = [
        {
          ...mockPetData[0],
          breed: null,
        },
      ];

      mockSequelize.query = jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([petWithoutBreed])
        .mockResolvedValueOnce([]);

      await swipeService.recordSwipeAction({
        action: 'like',
        petId: 'pet123',
        sessionId: 'session123',
        timestamp: '2025-01-01T12:00:00Z',
        userId: 'user123',
      });

      expect(mockSequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_preferences'),
        expect.objectContaining({
          replacements: expect.objectContaining({
            breed: 'unknown',
          }),
        })
      );
    });
  });
});
