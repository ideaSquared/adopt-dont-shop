import express from 'express';
import request from 'supertest';
import { authenticateToken } from '../../middleware/auth';
import { AgeGroup, Gender, PetType, Size } from '../../models/Pet';
import discoveryRoutes from '../../routes/discovery.routes';
import { DiscoveryPet, DiscoveryQueue, DiscoveryService } from '../../services/discovery.service';
import { SwipeService } from '../../services/swipe.service';
import { AuthenticatedRequest } from '../../types';

// Mock dependencies
jest.mock('../../services/discovery.service');
jest.mock('../../services/swipe.service');
jest.mock('../../middleware/auth');
jest.mock('../../models/Pet');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const MockedDiscoveryService = DiscoveryService as jest.MockedClass<typeof DiscoveryService>;
const MockedSwipeService = SwipeService as jest.MockedClass<typeof SwipeService>;
const MockedAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

describe('Discovery Routes Integration Tests', () => {
  let app: express.Application;
  let mockDiscoveryService: jest.Mocked<DiscoveryService>;
  let mockSwipeService: jest.Mocked<SwipeService>;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    // Mock authentication middleware
    MockedAuthenticateToken.mockImplementation(async (req: AuthenticatedRequest, _res, next) => {
      req.user = {
        userId: 'user-123',
        email: 'test@example.com',
        userType: 'ADOPTER',
        firstName: 'John',
        lastName: 'Doe',
      } as unknown as AuthenticatedRequest['user'];
      next();
    });

    // Set up mocked service instances
    mockDiscoveryService = {
      getDiscoveryQueue: jest.fn(),
      loadMorePets: jest.fn(),
    } as Partial<DiscoveryService> as jest.Mocked<DiscoveryService>;

    mockSwipeService = {
      recordSwipeAction: jest.fn(),
    } as Partial<SwipeService> as jest.Mocked<SwipeService>;

    MockedDiscoveryService.mockImplementation(() => mockDiscoveryService);
    MockedSwipeService.mockImplementation(() => mockSwipeService);

    app.use('/api/v1/discovery', discoveryRoutes);
  });

  describe('GET /api/v1/discovery/pets', () => {
    it('should return discovery queue with default parameters', async () => {
      const mockPets: DiscoveryPet[] = [
        {
          petId: 'pet1',
          name: 'Buddy',
          type: PetType.DOG,
          breed: 'Golden Retriever',
          ageGroup: AgeGroup.ADULT,
          size: Size.LARGE,
          gender: Gender.MALE,
          images: ['image1.jpg'],
          rescueName: 'Test Rescue',
        },
      ];

      const mockQueue: DiscoveryQueue = {
        pets: mockPets,
        sessionId: 'session-123',
        hasMore: false,
      };

      mockDiscoveryService.getDiscoveryQueue.mockResolvedValue(mockQueue);

      const response = await request(app).get('/api/v1/discovery/pets').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Discovery queue retrieved successfully');
      expect(response.body.data).toEqual(mockQueue);
      expect(response.body.timestamp).toBeDefined();

      expect(mockDiscoveryService.getDiscoveryQueue).toHaveBeenCalledWith(
        {}, // filters
        10, // limit
        undefined // userId
      );
    });

    it('should handle query parameters correctly', async () => {
      const mockQueue: DiscoveryQueue = {
        pets: [],
        sessionId: 'session-123',
        hasMore: false,
      };
      mockDiscoveryService.getDiscoveryQueue.mockResolvedValue(mockQueue);

      await request(app)
        .get('/api/v1/discovery/pets')
        .query({
          limit: 5,
          type: 'dog',
          ageGroup: 'puppy',
          size: 'small',
          gender: 'female',
          breed: 'labrador',
          maxDistance: 25,
        })
        .expect(200);

      expect(mockDiscoveryService.getDiscoveryQueue).toHaveBeenCalledWith(
        {
          type: 'dog',
          ageGroup: 'puppy',
          size: 'small',
          gender: 'female',
          breed: 'labrador',
          maxDistance: 25,
        },
        5,
        undefined
      );
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/discovery/pets')
        .query({ limit: 100 }) // exceeds max limit
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle service errors gracefully', async () => {
      mockDiscoveryService.getDiscoveryQueue.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/v1/discovery/pets').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to get discovery queue');
    });
  });

  describe('POST /api/v1/discovery/pets/more', () => {
    it('should load more pets successfully', async () => {
      const mockPets: DiscoveryPet[] = [
        {
          petId: 'pet2',
          name: 'Max',
          type: PetType.DOG,
          ageGroup: AgeGroup.ADULT,
          size: Size.MEDIUM,
          gender: Gender.MALE,
          images: ['image2.jpg'],
          rescueName: 'Test Rescue',
        },
      ];

      mockDiscoveryService.loadMorePets.mockResolvedValue(mockPets);

      const response = await request(app)
        .post('/api/v1/discovery/pets/more')
        .send({
          sessionId: 'session-123',
          lastPetId: 'pet1',
          limit: 5,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('More pets loaded successfully');
      expect(response.body.data.pets).toEqual(mockPets);
      expect(response.body.timestamp).toBeDefined();

      expect(mockDiscoveryService.loadMorePets).toHaveBeenCalledWith('session-123', 'pet1', 5);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/discovery/pets/more')
        .send({
          // missing sessionId and lastPetId
          limit: 5,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/v1/discovery/swipe/action', () => {
    it('should record swipe action successfully', async () => {
      mockSwipeService.recordSwipeAction.mockResolvedValue(undefined);

      const swipeData = {
        petId: 'pet1',
        action: 'like',
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/v1/discovery/swipe/action')
        .send(swipeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Swipe action recorded successfully');
      expect(response.body.timestamp).toBeDefined();

      expect(mockSwipeService.recordSwipeAction).toHaveBeenCalledWith(swipeData);
    });

    it('should return 400 for invalid action', async () => {
      const response = await request(app)
        .post('/api/v1/discovery/swipe/action')
        .send({
          petId: 'pet1',
          action: 'invalid_action',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Health and Test Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/v1/discovery/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.service).toBe('discovery');
      expect(response.body.message).toBe('Discovery service is running');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return database test status', async () => {
      // Mock the database query directly - the endpoint uses raw SQL query
      const response = await request(app).get('/api/v1/discovery/db-test').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Database connection successful');
      expect(response.body.data).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return test endpoint response', async () => {
      const response = await request(app).get('/api/v1/discovery/test').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Discovery test endpoint');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.pets).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });
});
