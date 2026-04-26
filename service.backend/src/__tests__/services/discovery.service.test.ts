import { vi } from 'vitest';
import { Op } from 'sequelize';
import Pet, { AgeGroup, Gender, PetStatus, PetType, Size } from '../../models/Pet';
import PetMedia, { PetMediaType } from '../../models/PetMedia';
import Rescue from '../../models/Rescue';
import { DiscoveryFilters, DiscoveryService } from '../../services/discovery.service';

// Mock dependencies
vi.mock('../../models/Pet');
vi.mock('../../models/PetMedia');
vi.mock('../../models/Rescue');
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const MockedPet = Pet as vi.MockedObject<Pet>;

describe('DiscoveryService', () => {
  let discoveryService: DiscoveryService;

  beforeEach(() => {
    vi.clearAllMocks();
    discoveryService = new DiscoveryService();
  });

  describe('getDiscoveryQueue', () => {
    const mockPets = [
      {
        petId: 'pet1',
        name: 'Buddy',
        type: PetType.DOG,
        breed: 'Golden Retriever',
        ageGroup: AgeGroup.ADULT,
        size: Size.LARGE,
        gender: Gender.MALE,
        Media: [
          { type: 'image', url: 'image1.jpg' },
          { type: 'image', url: 'image2.jpg' },
        ],
        shortDescription: 'Friendly dog',
        status: PetStatus.AVAILABLE,
        createdAt: new Date(),
        rescue: {
          rescueId: 'rescue1',
          name: 'Happy Paws Rescue',
          verified: true,
          premium: false,
        },
      },
      {
        petId: 'pet2',
        name: 'Whiskers',
        type: PetType.CAT,
        breed: 'Persian',
        ageGroup: AgeGroup.YOUNG,
        size: Size.MEDIUM,
        gender: Gender.FEMALE,
        Media: [{ type: 'image', url: 'image3.jpg' }],
        shortDescription: 'Calm cat',
        status: PetStatus.AVAILABLE,
        createdAt: new Date(),
        rescue: {
          rescueId: 'rescue2',
          name: 'Cat Haven',
          verified: true,
          premium: true,
        },
      },
    ];

    it('should generate discovery queue successfully with basic filters', async () => {
      // Mock the smart filtering to return filtered pets — pet media is
      // now the eager-loaded Media association (plan 2.1).
      const filteredPets = mockPets.filter(pet => pet.Media && pet.Media.length > 0);

      // Spy on private methods to avoid complex mocking
      vi.spyOn(discoveryService as unknown, 'getSmartSortedPets').mockResolvedValue(filteredPets);
      vi.spyOn(discoveryService as unknown, 'transformToDiscoveryPets').mockResolvedValue([
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
      MockedPet.findAll = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(discoveryService.getDiscoveryQueue({}, 20)).rejects.toThrow(
        'Failed to generate discovery queue'
      );
    });
  });

  describe('loadMorePets', () => {
    const mockPets = [
      {
        petId: 'pet3',
        name: 'Max',
        type: PetType.DOG,
        breed: 'Labrador',
        ageGroup: AgeGroup.YOUNG,
        size: Size.LARGE,
        gender: Gender.MALE,
        Media: [
          { type: 'image', url: 'image4.jpg' },
          { type: 'image', url: 'image5.jpg' },
        ],
        shortDescription: 'Energetic pup',
        status: PetStatus.AVAILABLE,
        createdAt: new Date(),
        rescue: {
          rescueId: 'rescue1',
          name: 'Happy Paws Rescue',
        },
      },
    ];

    it('should load more pets successfully', async () => {
      MockedPet.findAll = vi.fn().mockResolvedValue(mockPets);

      const result = await discoveryService.loadMorePets('session123', 'pet2', 10);

      expect(result).toHaveLength(1);
      expect(result[0].petId).toBe('pet3');
      expect(result[0].name).toBe('Max');

      expect(MockedPet.findAll).toHaveBeenCalledWith({
        where: {
          petId: { [Op.gt]: 'pet2' },
          status: PetStatus.AVAILABLE,
        },
        include: [
          {
            model: Rescue,
            as: 'Rescue',
            attributes: ['rescue_id', 'name', 'status'],
          },
          {
            model: PetMedia,
            as: 'Media',
            where: { type: PetMediaType.IMAGE },
            required: false,
          },
        ],
        limit: 10,
        order: [['created_at', 'ASC']],
      });
    });

    it('should return empty array when no more pets available', async () => {
      MockedPet.findAll = vi.fn().mockResolvedValue([]);

      const result = await discoveryService.loadMorePets('session123', 'pet999', 10);

      expect(result).toHaveLength(0);
    });

    it('should handle error when loading more pets fails', async () => {
      MockedPet.findAll = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(discoveryService.loadMorePets('session123', 'pet2', 10)).rejects.toThrow(
        'Failed to load more pets'
      );
    });
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const sessionId1 = (discoveryService as unknown).generateSessionId();
      const sessionId2 = (discoveryService as unknown).generateSessionId();

      expect(sessionId1).toBeDefined();
      expect(sessionId2).toBeDefined();
      expect(sessionId1).not.toBe(sessionId2);
      expect(typeof sessionId1).toBe('string');
      expect(sessionId1.length).toBeGreaterThan(0);
    });
  });

  describe('calculateCompatibilityScore', () => {
    // Pet.images JSONB extracted to pet_media (plan 2.1) — the score uses
    // the eager-loaded Media association now.
    const image = (i: number) => ({ type: 'image', url: `img${i}.jpg` });

    it('should calculate basic compatibility score', () => {
      const mockPet = {
        Media: [image(1)],
        longDescription: 'Short description',
        ageGroup: AgeGroup.ADULT,
        goodWithChildren: false,
        goodWithDogs: false,
        goodWithCats: false,
      } as unknown as Pet;

      const score = (discoveryService as unknown).calculateCompatibilityScore(mockPet);

      expect(score).toBe(50); // Base score only
    });

    it('should boost score for pets with good attributes', () => {
      const mockPet = {
        Media: [image(1), image(2), image(3)],
        longDescription:
          'This is a very long and detailed description about this wonderful pet that provides lots of useful information for potential adopters.',
        ageGroup: AgeGroup.YOUNG,
        goodWithChildren: true,
        goodWithDogs: true,
        goodWithCats: true,
      } as unknown as Pet;

      const score = (discoveryService as unknown).calculateCompatibilityScore(mockPet);

      // Base 50 + 15 (photos) + 10 (description) + 10 (young) + 5 (children) + 5 (dogs) + 5 (cats) = 100
      expect(score).toBe(100);
    });

    it('should cap score at 100', () => {
      const mockPet = {
        Media: Array(10).fill(image(1)),
        longDescription: 'Very long description '.repeat(20),
        ageGroup: AgeGroup.BABY,
        goodWithChildren: true,
        goodWithDogs: true,
        goodWithCats: true,
      } as unknown as Pet;

      const score = (discoveryService as unknown).calculateCompatibilityScore(mockPet);

      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
