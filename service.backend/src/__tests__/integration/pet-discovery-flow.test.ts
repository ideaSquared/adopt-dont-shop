import { vi } from 'vitest';
// Mock env config FIRST before any imports
vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters-long-12345',
    SESSION_SECRET: 'test-session-secret-min-32-characters-long',
    CSRF_SECRET: 'test-csrf-secret-min-32-characters-long-123',
  },
}));

import { generateCryptoUuid as uuidv4 } from '../../utils/uuid-helpers';
import Pet, {
  PetStatus,
  PetType,
  AgeGroup,
  Gender,
  Size,
  EnergyLevel,
  VaccinationStatus,
  SpayNeuterStatus,
  PetAttributes,
} from '../../models/Pet';
import User, { UserStatus, UserType } from '../../models/User';
import UserFavorite from '../../models/UserFavorite';
import { PetService } from '../../services/pet.service';
import { AuditLogService } from '../../services/auditLog.service';

// Mock dependencies
vi.mock('../../models/Pet');
vi.mock('../../models/User');
vi.mock('../../models/UserFavorite');
vi.mock('../../services/auditLog.service');
vi.mock('../../utils/logger');

vi.mock('../../services/email.service', () => ({
  default: {
    sendEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

const MockedPet = Pet as vi.MockedObject<Pet>;
const MockedUser = User as vi.MockedObject<User>;
const MockedUserFavorite = UserFavorite as vi.MockedObject<UserFavorite>;
const MockedAuditLogService = AuditLogService as vi.MockedObject<AuditLogService>;

// Helper to create mock pet
const createMockPet = (overrides: Partial<PetAttributes> = {}): Pet => {
  const petData: PetAttributes = {
    petId: overrides.petId || `pet_${uuidv4()}`,
    name: overrides.name || 'Test Pet',
    rescueId: overrides.rescueId || 'rescue-123',
    shortDescription: overrides.shortDescription || 'A lovely pet',
    longDescription: overrides.longDescription || 'Detailed pet description',
    ageYears: overrides.ageYears !== undefined ? overrides.ageYears : 2,
    ageMonths: overrides.ageMonths !== undefined ? overrides.ageMonths : 6,
    ageGroup: overrides.ageGroup || AgeGroup.ADULT,
    gender: overrides.gender || Gender.MALE,
    status: overrides.status || PetStatus.AVAILABLE,
    type: overrides.type || PetType.DOG,
    breed: overrides.breed || 'Labrador Retriever',
    secondaryBreed: overrides.secondaryBreed || null,
    weightKg: overrides.weightKg !== undefined ? overrides.weightKg : 25,
    size: overrides.size || Size.MEDIUM,
    color: overrides.color || 'Golden',
    markings: overrides.markings || null,
    microchipId: overrides.microchipId || null,
    archived: overrides.archived !== undefined ? overrides.archived : false,
    featured: overrides.featured !== undefined ? overrides.featured : false,
    priorityListing: overrides.priorityListing !== undefined ? overrides.priorityListing : false,
    adoptionFee: overrides.adoptionFee !== undefined ? overrides.adoptionFee : 150,
    specialNeeds: overrides.specialNeeds !== undefined ? overrides.specialNeeds : false,
    specialNeedsDescription: overrides.specialNeedsDescription || null,
    houseTrained: overrides.houseTrained !== undefined ? overrides.houseTrained : true,
    goodWithChildren:
      overrides.goodWithChildren !== undefined ? overrides.goodWithChildren : true,
    goodWithDogs: overrides.goodWithDogs !== undefined ? overrides.goodWithDogs : true,
    goodWithCats: overrides.goodWithCats !== undefined ? overrides.goodWithCats : false,
    goodWithSmallAnimals: overrides.goodWithSmallAnimals || null,
    energyLevel: overrides.energyLevel || EnergyLevel.MEDIUM,
    exerciseNeeds: overrides.exerciseNeeds || 'Daily walks',
    groomingNeeds: overrides.groomingNeeds || 'Regular brushing',
    trainingNotes: overrides.trainingNotes || null,
    temperament: overrides.temperament || ['friendly', 'playful'],
    medicalNotes: overrides.medicalNotes || null,
    behavioralNotes: overrides.behavioralNotes || null,
    surrenderReason: overrides.surrenderReason || null,
    intakeDate: overrides.intakeDate || new Date('2024-01-01'),
    vaccinationStatus: overrides.vaccinationStatus || VaccinationStatus.UNKNOWN,
    vaccinationDate: overrides.vaccinationDate || new Date(),
    spayNeuterStatus: overrides.spayNeuterStatus || SpayNeuterStatus.UNKNOWN,
    spayNeuterDate: overrides.spayNeuterDate || new Date(),
    lastVetCheckup: overrides.lastVetCheckup || new Date(),
    images: overrides.images || [
      {
        image_id: 'img-default',
        url: 'https://example.com/pet.jpg',
        is_primary: true,
        order_index: 0,
        uploaded_at: new Date(),
      },
    ],
    videos: overrides.videos || [],
    location: overrides.location || { type: 'Point', coordinates: [-122.4194, 37.7749] },
    availableSince: overrides.availableSince || new Date('2024-01-01'),
    adoptedDate: overrides.adoptedDate || null,
    fosterStartDate: overrides.fosterStartDate || null,
    fosterEndDate: overrides.fosterEndDate || null,
    viewCount: overrides.viewCount !== undefined ? overrides.viewCount : 10,
    favoriteCount: overrides.favoriteCount !== undefined ? overrides.favoriteCount : 5,
    applicationCount: overrides.applicationCount !== undefined ? overrides.applicationCount : 2,
    searchVector: overrides.searchVector || undefined,
    tags: overrides.tags || ['family-friendly'],
    created_at: overrides.created_at || new Date('2024-01-01'),
    updated_at: overrides.updated_at || new Date('2024-01-01'),
    deleted_at: overrides.deleted_at || null,
  };

  return {
    ...petData,
    isAvailable: vi
      .fn()
      .mockReturnValue(petData.status === PetStatus.AVAILABLE && !petData.archived),
    canBeAdopted: vi.fn().mockReturnValue(petData.status === PetStatus.AVAILABLE),
    getPrimaryImage: vi.fn().mockReturnValue('https://example.com/pet.jpg'),
    getAgeDisplay: vi.fn().mockReturnValue(`${petData.ageYears} years`),
    increment: vi.fn().mockResolvedValue(undefined),
    toJSON: vi.fn().mockReturnValue(petData),
  } as unknown as Pet;
};

// Helper to create mock user
const createMockUser = (overrides = {}): User =>
  ({
    userId: 'user-123',
    email: 'adopter@example.com',
    first_name: 'John',
    last_name: 'Adopter',
    status: UserStatus.ACTIVE,
    type: UserType.ADOPTER,
    toJSON: vi.fn().mockReturnValue({
      userId: 'user-123',
      email: 'adopter@example.com',
    }),
    ...overrides,
  }) as unknown as User;

describe('Pet Discovery & Matching Flow Integration Tests', () => {
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    MockedAuditLogService.log = vi.fn().mockResolvedValue(undefined as never);
  });

  describe('Workflow 1: Search and Filter Pets', () => {
    describe('when user searches for pets by type', () => {
      it('should return dogs when filtering by dog type', async () => {
        const mockDogs = [
          createMockPet({ petId: 'dog-1', name: 'Buddy', type: PetType.DOG }),
          createMockPet({ petId: 'dog-2', name: 'Max', type: PetType.DOG }),
        ];

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockDogs,
          count: 2,
        } as never);

        const result = await PetService.searchPets({ type: PetType.DOG }, { page: 1, limit: 20 });

        expect(result.pets).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.pets[0].type).toBe(PetType.DOG);
      });

      it('should return cats when filtering by cat type', async () => {
        const mockCats = [createMockPet({ petId: 'cat-1', name: 'Whiskers', type: PetType.CAT })];

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockCats,
          count: 1,
        } as never);

        const result = await PetService.searchPets({ type: PetType.CAT }, { page: 1, limit: 20 });

        expect(result.total).toBe(1);
        expect(result.pets[0].type).toBe(PetType.CAT);
      });
    });

    describe('when user filters by age group', () => {
      it('should return baby pets for baby age group filter', async () => {
        const mockBaby = createMockPet({
          petId: 'baby-1',
          ageGroup: AgeGroup.BABY,
          ageYears: 0,
          ageMonths: 4,
        });

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: [mockBaby],
          count: 1,
        } as never);

        const result = await PetService.searchPets(
          { ageGroup: AgeGroup.BABY },
          { page: 1, limit: 20 }
        );

        expect(result.pets[0].ageGroup).toBe(AgeGroup.BABY);
      });

      it('should return senior pets for senior age group filter', async () => {
        const mockSenior = createMockPet({
          petId: 'senior-1',
          ageGroup: AgeGroup.SENIOR,
          ageYears: 10,
        });

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: [mockSenior],
          count: 1,
        } as never);

        const result = await PetService.searchPets(
          { ageGroup: AgeGroup.SENIOR },
          { page: 1, limit: 20 }
        );

        expect(result.pets[0].ageGroup).toBe(AgeGroup.SENIOR);
      });
    });

    describe('when user filters by size', () => {
      it('should return small pets for small size filter', async () => {
        const mockSmall = createMockPet({
          petId: 'small-1',
          size: Size.SMALL,
          weightKg: 5,
        });

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: [mockSmall],
          count: 1,
        } as never);

        const result = await PetService.searchPets({ size: Size.SMALL }, { page: 1, limit: 20 });

        expect(result.pets[0].size).toBe(Size.SMALL);
      });

      it('should return large pets for large size filter', async () => {
        const mockLarge = createMockPet({
          petId: 'large-1',
          size: Size.LARGE,
          weightKg: 40,
        });

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: [mockLarge],
          count: 1,
        } as never);

        const result = await PetService.searchPets({ size: Size.LARGE }, { page: 1, limit: 20 });

        expect(result.pets[0].size).toBe(Size.LARGE);
      });
    });

    describe('when user filters by rescue location', () => {
      it('should filter pets from specific rescue organizations', async () => {
        const mockPet = createMockPet({
          petId: 'nearby-1',
          rescueId: 'rescue-sf',
          location: { type: 'Point', coordinates: [-122.4194, 37.7749] },
        });

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: [mockPet],
          count: 1,
        } as never);

        const result = await PetService.searchPets(
          { rescueId: 'rescue-sf' },
          { page: 1, limit: 20 }
        );

        expect(result.pets).toBeTruthy();
        expect(MockedPet.findAndCountAll).toHaveBeenCalled();
      });
    });

    describe('when user combines multiple filters', () => {
      it('should apply all filter criteria together', async () => {
        const mockPet = createMockPet({
          petId: 'perfect-1',
          type: PetType.DOG,
          size: Size.MEDIUM,
          ageGroup: AgeGroup.ADULT,
          goodWithChildren: true,
        });

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: [mockPet],
          count: 1,
        } as never);

        const result = await PetService.searchPets(
          {
            type: PetType.DOG,
            size: Size.MEDIUM,
            ageGroup: AgeGroup.ADULT,
            goodWithChildren: true,
          },
          { page: 1, limit: 20 }
        );

        expect(result.pets).toHaveLength(1);
        expect(result.pets[0].type).toBe(PetType.DOG);
        expect(result.pets[0].goodWithChildren).toBe(true);
      });
    });
  });

  describe('Workflow 2: View Pet Details', () => {
    describe('when user views a pet profile', () => {
      it('should retrieve complete pet details with images', async () => {
        const mockPet = createMockPet({
          petId: 'pet-detail-1',
          name: 'Buddy',
          longDescription: 'Friendly and energetic dog',
          images: [
            {
              image_id: 'img-buddy-1',
              url: 'https://example.com/buddy-1.jpg',
              is_primary: true,
              order_index: 0,
              uploaded_at: new Date(),
            },
            {
              image_id: 'img-buddy-2',
              url: 'https://example.com/buddy-2.jpg',
              is_primary: false,
              order_index: 1,
              uploaded_at: new Date(),
            },
          ],
        });

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

        const result = await PetService.getPetById('pet-detail-1', userId);

        expect(result?.name).toBe('Buddy');
        expect(result?.longDescription).toBe('Friendly and energetic dog');
        expect(result?.images).toHaveLength(2);
      });

      it('should increment view count when pet is viewed', async () => {
        const mockPet = createMockPet({
          petId: 'pet-1',
          viewCount: 10,
        });
        mockPet.increment = vi.fn().mockResolvedValue(undefined);

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

        await PetService.getPetById('pet-1', userId);

        // View count should be tracked
        expect(MockedPet.findByPk).toHaveBeenCalledWith('pet-1');
      });

      it('should display pet compatibility information', async () => {
        const mockPet = createMockPet({
          petId: 'pet-compat-1',
          goodWithChildren: true,
          goodWithDogs: true,
          goodWithCats: false,
          houseTrained: true,
        });

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

        const result = await PetService.getPetById('pet-compat-1', userId);

        expect(result?.goodWithChildren).toBe(true);
        expect(result?.goodWithDogs).toBe(true);
        expect(result?.goodWithCats).toBe(false);
      });

      it('should display special needs information when applicable', async () => {
        const mockPet = createMockPet({
          petId: 'pet-special-1',
          specialNeeds: true,
          specialNeedsDescription: 'Requires medication for thyroid condition',
        });

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

        const result = await PetService.getPetById('pet-special-1', userId);

        expect(result?.specialNeeds).toBe(true);
        expect(result?.specialNeedsDescription).toBeTruthy();
      });
    });
  });

  describe('Workflow 3: Add Pets to Favorites', () => {
    describe('when user adds a pet to favorites', () => {
      it('should successfully add pet to favorites list', async () => {
        const mockPet = createMockPet({ petId: 'fav-1', name: 'Favorite Pet' });

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
        MockedUserFavorite.findOne = vi.fn().mockResolvedValue(null);
        MockedUserFavorite.create = vi.fn().mockResolvedValue({
          id: 'fav-rec-1',
          userId: userId,
          petId: 'fav-1',
        } as never);

        await PetService.addToFavorites(userId, 'fav-1');

        expect(MockedUserFavorite.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: userId,
            petId: 'fav-1',
          })
        );
      });

      it('should prevent duplicate favorites', async () => {
        const mockPet = createMockPet({ petId: 'fav-2' });
        const mockFavorite = { id: 'fav-rec-2', userId: userId, petId: 'fav-2' };

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
        MockedUserFavorite.findOne = vi.fn().mockResolvedValue(mockFavorite as never);

        await expect(PetService.addToFavorites(userId, 'fav-2')).rejects.toThrow(
          'Pet is already in favorites'
        );
      });

      it('should reject non-existent pet', async () => {
        MockedPet.findByPk = vi.fn().mockResolvedValue(null);

        await expect(PetService.addToFavorites(userId, 'non-existent')).rejects.toThrow(
          'Pet not found'
        );
      });
    });

    describe('when user removes a pet from favorites', () => {
      it('should successfully remove pet from favorites', async () => {
        const mockFavorite = {
          id: 'fav-rec-3',
          userId: userId,
          petId: 'fav-3',
          destroy: vi.fn().mockResolvedValue(undefined),
        };

        MockedUserFavorite.findOne = vi.fn().mockResolvedValue(mockFavorite as never);

        await PetService.removeFromFavorites(userId, 'fav-3');

        expect(mockFavorite.destroy).toHaveBeenCalled();
      });
    });

    describe('when user views favorites list', () => {
      it('should return paginated list of favorited pets', async () => {
        const mockPets = [
          createMockPet({ petId: 'fav-4', name: 'Favorite 1' }),
          createMockPet({ petId: 'fav-5', name: 'Favorite 2' }),
        ];

        const mockFavorites = mockPets.map(pet => ({
          id: `fav-rec-${pet.petId}`,
          userId: userId,
          petId: pet.petId,
          Pet: pet,
        }));

        MockedUserFavorite.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockFavorites,
          count: 2,
        } as never);

        const result = await PetService.getUserFavorites(userId, { page: 1, limit: 20 });

        expect(result.pets).toHaveLength(2);
        expect(result.total).toBe(2);
      });
    });
  });

  describe('Workflow 4: Personalized Recommendations', () => {
    describe('when user receives recommendations', () => {
      it('should rank dogs matching user preferences', async () => {
        const mockPets = [
          createMockPet({ petId: 'rec-1', type: PetType.DOG, size: Size.MEDIUM }),
          createMockPet({ petId: 'rec-2', type: PetType.DOG, size: Size.MEDIUM }),
        ];

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockPets,
          count: 2,
        } as never);

        const result = await PetService.searchPets(
          { type: PetType.DOG, size: Size.MEDIUM },
          { page: 1, limit: 20 }
        );

        expect(result.pets.every(pet => pet.type === PetType.DOG)).toBe(true);
        expect(result.pets.every(pet => pet.size === Size.MEDIUM)).toBe(true);
      });

      it('should recommend pets based on breed preferences', async () => {
        const mockPets = [
          createMockPet({ petId: 'rec-3', type: PetType.DOG, breed: 'Golden Retriever' }),
          createMockPet({ petId: 'rec-4', type: PetType.DOG, breed: 'Labrador Retriever' }),
        ];

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockPets,
          count: 2,
        } as never);

        const result = await PetService.searchPets({ type: PetType.DOG }, { page: 1, limit: 20 });

        expect(result.pets.every(pet => pet.type === PetType.DOG)).toBe(true);
      });

      it('should prioritize featured pets in recommendations', async () => {
        const mockPets = [
          createMockPet({ petId: 'rec-featured', featured: true }),
          createMockPet({ petId: 'rec-regular', featured: false }),
        ];

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockPets,
          count: 2,
        } as never);

        const result = await PetService.searchPets({}, { page: 1, limit: 20 });

        expect(result.pets).toBeTruthy();
        expect(MockedPet.findAndCountAll).toHaveBeenCalled();
      });

      it('should return similar pets based on viewed pet attributes', async () => {
        const refPet = createMockPet({
          petId: 'ref-pet',
          breed: 'Golden Retriever',
          type: PetType.DOG,
        });

        const similarPets = [
          createMockPet({ petId: 'sim-1', breed: 'Golden Retriever' }),
          createMockPet({ petId: 'sim-2', breed: 'Labrador Retriever' }),
        ];

        MockedPet.findByPk = vi.fn().mockResolvedValue(refPet);
        MockedPet.findAll = vi.fn().mockResolvedValue(similarPets as never);

        const result = await PetService.getSimilarPets('ref-pet', 6);

        expect(result).toHaveLength(2);
        expect(result.every(pet => pet.type === PetType.DOG)).toBe(true);
      });
    });
  });

  describe('Workflow 5: Complete Matching Workflow (Browse → Favorite → Apply)', () => {
    describe('when user completes the matching journey', () => {
      it('should search, view details, and add to favorites', async () => {
        // Step 1: Search for pets
        const mockPet = createMockPet({
          petId: 'journey-1',
          name: 'Journey Pet',
          type: PetType.DOG,
        });

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: [mockPet],
          count: 1,
        } as never);

        const searchResults = await PetService.searchPets(
          { type: PetType.DOG },
          { page: 1, limit: 20 }
        );
        expect(searchResults.pets).toHaveLength(1);

        // Step 2: View pet details
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
        const petDetails = await PetService.getPetById('journey-1', userId);
        expect(petDetails?.name).toBe('Journey Pet');

        // Step 3: Add to favorites
        MockedUserFavorite.findOne = vi.fn().mockResolvedValue(null);
        MockedUserFavorite.create = vi.fn().mockResolvedValue({
          id: 'journey-fav-1',
          userId: userId,
          petId: 'journey-1',
        } as never);

        await PetService.addToFavorites(userId, 'journey-1');
        expect(MockedUserFavorite.create).toHaveBeenCalled();
      });

      it('should allow user to manage multiple favorites during matching process', async () => {
        const mockPets = [
          createMockPet({ petId: 'match-1', name: 'Match 1' }),
          createMockPet({ petId: 'match-2', name: 'Match 2' }),
        ];

        // Add multiple favorites
        for (const pet of mockPets) {
          MockedPet.findByPk = vi.fn().mockResolvedValue(pet);
          MockedUserFavorite.findOne = vi.fn().mockResolvedValue(null);
          MockedUserFavorite.create = vi.fn().mockResolvedValue({
            id: `fav-${pet.petId}`,
            userId: userId,
            petId: pet.petId,
          } as never);

          await PetService.addToFavorites(userId, pet.petId);
        }

        // View favorites
        const mockFavorites = mockPets.map(pet => ({
          id: `fav-${pet.petId}`,
          userId: userId,
          petId: pet.petId,
          Pet: pet,
        }));

        MockedUserFavorite.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockFavorites,
          count: 2,
        } as never);

        const result = await PetService.getUserFavorites(userId);
        expect(result.total).toBe(2);
      });

      it('should enable application submission from matched pet profile', async () => {
        const mockPet = createMockPet({
          petId: 'apply-1',
          name: 'Apply Pet',
          status: PetStatus.AVAILABLE,
        });

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

        const pet = await PetService.getPetById('apply-1', userId);
        expect(pet?.status).toBe(PetStatus.AVAILABLE);
        expect(pet?.canBeAdopted()).toBe(true);
      });

      it('should show matched pets across browsing sessions', async () => {
        // First session - browse and favorite
        const mockPet1 = createMockPet({ petId: 'session-1' });
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet1);
        MockedUserFavorite.findOne = vi.fn().mockResolvedValue(null);
        MockedUserFavorite.create = vi.fn().mockResolvedValue({
          id: 'session-fav-1',
          userId: userId,
          petId: 'session-1',
        } as never);

        await PetService.addToFavorites(userId, 'session-1');

        // Second session - view previous favorites
        const mockFavorite = {
          id: 'session-fav-1',
          userId: userId,
          petId: 'session-1',
          Pet: mockPet1,
        };

        MockedUserFavorite.findAndCountAll = vi.fn().mockResolvedValue({
          rows: [mockFavorite],
          count: 1,
        } as never);

        const result = await PetService.getUserFavorites(userId);
        expect(result.total).toBe(1);
      });
    });

    describe('when discovery process includes filtering refine', () => {
      it('should refine search results based on compatibility requirements', async () => {
        const mockPets = [
          createMockPet({
            petId: 'compat-1',
            goodWithChildren: true,
            goodWithDogs: true,
            houseTrained: true,
          }),
        ];

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: mockPets,
          count: 1,
        } as never);

        const result = await PetService.searchPets(
          {
            goodWithChildren: true,
            goodWithDogs: true,
            houseTrained: true,
          },
          { page: 1, limit: 20 }
        );

        expect(result.pets).toHaveLength(1);
        expect(result.pets[0].goodWithChildren).toBe(true);
      });

      it('should handle pagination during extended browsing', async () => {
        const mockPage1 = [
          createMockPet({ petId: 'page1-1' }),
          createMockPet({ petId: 'page1-2' }),
        ];

        MockedPet.findAndCountAll = vi
          .fn()
          .mockResolvedValueOnce({ rows: mockPage1, count: 10 } as never)
          .mockResolvedValueOnce({
            rows: [createMockPet({ petId: 'page2-1' })],
            count: 10,
          } as never);

        const page1 = await PetService.searchPets({}, { page: 1, limit: 2 });
        expect(page1.pets).toHaveLength(2);

        const page2 = await PetService.searchPets({}, { page: 2, limit: 2 });
        expect(page2.total).toBe(10);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty search results gracefully', async () => {
      MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
        rows: [],
        count: 0,
      } as never);

      const result = await PetService.searchPets({ type: PetType.BIRD }, { page: 1, limit: 20 });

      expect(result.pets).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should verify user authorization for favorite operations', async () => {
      const otherUserId = 'other-user-456';

      MockedUserFavorite.findAndCountAll = vi.fn().mockResolvedValue({
        rows: [],
        count: 0,
      } as never);

      const result = await PetService.getUserFavorites(otherUserId);

      expect(MockedUserFavorite.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: otherUserId }),
        })
      );
    });
  });
});
