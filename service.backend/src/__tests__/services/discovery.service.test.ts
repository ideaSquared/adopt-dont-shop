import { Op } from 'sequelize';
import Pet, { AgeGroup, Gender, PetStatus, PetType, Size } from '../../models/Pet';
import Rescue from '../../models/Rescue';
import { DiscoveryFilters, DiscoveryService } from '../../services/discovery.service';

// Mock dependencies
jest.mock('../../models/Pet');
jest.mock('../../models/Rescue');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock Sequelize and Op
jest.mock('sequelize', () => {
  const actualSequelize = jest.requireActual('sequelize');
  return {
    ...actualSequelize,
    Op: {
      gt: Symbol('gt'),
      iLike: Symbol('iLike'),
    },
    fn: jest.fn(),
    literal: jest.fn(),
  };
});

const MockedPet = Pet as jest.Mocked<typeof Pet>;

describe('DiscoveryService', () => {
  let discoveryService: DiscoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    discoveryService = new DiscoveryService();
  });

  describe('getDiscoveryQueue', () => {
    const mockPets = [
      {
        pet_id: 'pet1',
        name: 'Buddy',
        type: PetType.DOG,
        breed: 'Golden Retriever',
        age_group: AgeGroup.ADULT,
        size: Size.LARGE,
        gender: Gender.MALE,
        images: [{ url: 'image1.jpg' }, { url: 'image2.jpg' }],
        short_description: 'Friendly dog',
        status: PetStatus.AVAILABLE,
        created_at: new Date(),
        rescue: {
          rescue_id: 'rescue1',
          name: 'Happy Paws Rescue',
          verified: true,
          premium: false,
        },
      },
      {
        pet_id: 'pet2',
        name: 'Whiskers',
        type: PetType.CAT,
        breed: 'Persian',
        age_group: AgeGroup.YOUNG,
        size: Size.MEDIUM,
        gender: Gender.FEMALE,
        images: [{ url: 'image3.jpg' }],
        short_description: 'Calm cat',
        status: PetStatus.AVAILABLE,
        created_at: new Date(),
        rescue: {
          rescue_id: 'rescue2',
          name: 'Cat Haven',
          verified: true,
          premium: true,
        },
      },
    ];

    it('should generate discovery queue successfully with basic filters', async () => {
      // Mock the smart filtering to return filtered pets
      const filteredPets = mockPets.filter(pet => pet.images && pet.images.length > 0);

      // Spy on private methods to avoid complex mocking
      jest.spyOn(discoveryService as any, 'getSmartSortedPets').mockResolvedValue(filteredPets);
      jest.spyOn(discoveryService as any, 'transformToDiscoveryPets').mockResolvedValue([
        {
          petId: 'pet1',
          name: 'Buddy',
          type: PetType.DOG,
          breed: 'Golden Retriever',
          ageGroup: AgeGroup.ADULT,
          size: Size.LARGE,
          gender: Gender.MALE,
          images: ['image1.jpg', 'image2.jpg'],
          shortDescription: 'Friendly dog',
          rescueName: 'Happy Paws Rescue',
          isSponsored: false,
          compatibilityScore: 75,
        },
        {
          petId: 'pet2',
          name: 'Whiskers',
          type: PetType.CAT,
          breed: 'Persian',
          ageGroup: AgeGroup.YOUNG,
          size: Size.MEDIUM,
          gender: Gender.FEMALE,
          images: ['image3.jpg'],
          shortDescription: 'Calm cat',
          rescueName: 'Cat Haven',
          isSponsored: true,
          compatibilityScore: 80,
        },
      ]);

      const filters: DiscoveryFilters = {
        type: 'dog',
        size: 'large',
      };

      const result = await discoveryService.getDiscoveryQueue(filters, 20, 'user123');

      expect(result.pets).toHaveLength(2);
      expect(result.sessionId).toBeDefined();
      expect(result.hasMore).toBe(false);
      expect(result.pets[0].petId).toBe('pet1');
      expect(result.pets[0].name).toBe('Buddy');
      expect(result.pets[0].rescueName).toBe('Happy Paws Rescue');
    });

    it('should handle error when database query fails', async () => {
      MockedPet.findAll = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(discoveryService.getDiscoveryQueue({}, 20)).rejects.toThrow(
        'Failed to generate discovery queue'
      );
    });
  });

  describe('loadMorePets', () => {
    const mockPets = [
      {
        pet_id: 'pet3',
        name: 'Max',
        type: PetType.DOG,
        breed: 'Labrador',
        age_group: AgeGroup.YOUNG,
        size: Size.LARGE,
        gender: Gender.MALE,
        images: [{ url: 'image4.jpg' }, { url: 'image5.jpg' }],
        short_description: 'Energetic pup',
        status: PetStatus.AVAILABLE,
        created_at: new Date(),
        rescue: {
          rescue_id: 'rescue1',
          name: 'Happy Paws Rescue',
        },
      },
    ];

    it('should load more pets successfully', async () => {
      MockedPet.findAll = jest.fn().mockResolvedValue(mockPets);

      const result = await discoveryService.loadMorePets('session123', 'pet2', 10);

      expect(result).toHaveLength(1);
      expect(result[0].petId).toBe('pet3');
      expect(result[0].name).toBe('Max');

      expect(MockedPet.findAll).toHaveBeenCalledWith({
        where: {
          pet_id: { [Op.gt]: 'pet2' },
          status: PetStatus.AVAILABLE,
        },
        include: [
          {
            model: Rescue,
            as: 'Rescue',
            attributes: ['rescue_id', 'name', 'status'],
          },
        ],
        limit: 10,
        order: [['created_at', 'ASC']],
      });
    });

    it('should return empty array when no more pets available', async () => {
      MockedPet.findAll = jest.fn().mockResolvedValue([]);

      const result = await discoveryService.loadMorePets('session123', 'pet999', 10);

      expect(result).toHaveLength(0);
    });

    it('should handle error when loading more pets fails', async () => {
      MockedPet.findAll = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(discoveryService.loadMorePets('session123', 'pet2', 10)).rejects.toThrow(
        'Failed to load more pets'
      );
    });
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const sessionId1 = (discoveryService as any).generateSessionId();
      const sessionId2 = (discoveryService as any).generateSessionId();

      expect(sessionId1).toBeDefined();
      expect(sessionId2).toBeDefined();
      expect(sessionId1).not.toBe(sessionId2);
      expect(typeof sessionId1).toBe('string');
      expect(sessionId1.length).toBeGreaterThan(0);
    });
  });

  describe('calculateCompatibilityScore', () => {
    it('should calculate basic compatibility score', () => {
      const mockPet = {
        images: [{ url: 'img1.jpg' }],
        long_description: 'Short description',
        age_group: AgeGroup.ADULT,
        good_with_children: false,
        good_with_dogs: false,
        good_with_cats: false,
      } as Pet;

      const score = (discoveryService as any).calculateCompatibilityScore(mockPet);

      expect(score).toBe(50); // Base score only
    });

    it('should boost score for pets with good attributes', () => {
      const mockPet = {
        images: [{ url: 'img1.jpg' }, { url: 'img2.jpg' }, { url: 'img3.jpg' }],
        long_description:
          'This is a very long and detailed description about this wonderful pet that provides lots of useful information for potential adopters.',
        age_group: AgeGroup.YOUNG,
        good_with_children: true,
        good_with_dogs: true,
        good_with_cats: true,
      } as Pet;

      const score = (discoveryService as any).calculateCompatibilityScore(mockPet);

      // Base 50 + 15 (photos) + 10 (description) + 10 (young) + 5 (children) + 5 (dogs) + 5 (cats) = 100
      expect(score).toBe(100);
    });

    it('should cap score at 100', () => {
      const mockPet = {
        images: Array(10).fill({ url: 'img.jpg' }),
        long_description: 'Very long description '.repeat(20),
        age_group: AgeGroup.BABY,
        good_with_children: true,
        good_with_dogs: true,
        good_with_cats: true,
      } as Pet;

      const score = (discoveryService as any).calculateCompatibilityScore(mockPet);

      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
