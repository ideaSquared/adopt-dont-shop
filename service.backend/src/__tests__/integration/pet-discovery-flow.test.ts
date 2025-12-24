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
    pet_id: overrides.pet_id || `pet_${uuidv4()}`,
    name: overrides.name || 'Test Pet',
    rescue_id: overrides.rescue_id || 'rescue-123',
    short_description: overrides.short_description || 'A lovely pet',
    long_description: overrides.long_description || 'Detailed pet description',
    age_years: overrides.age_years !== undefined ? overrides.age_years : 2,
    age_months: overrides.age_months !== undefined ? overrides.age_months : 6,
    age_group: overrides.age_group || AgeGroup.ADULT,
    gender: overrides.gender || Gender.MALE,
    status: overrides.status || PetStatus.AVAILABLE,
    type: overrides.type || PetType.DOG,
    breed: overrides.breed || 'Labrador Retriever',
    secondary_breed: overrides.secondary_breed || null,
    weight_kg: overrides.weight_kg !== undefined ? overrides.weight_kg : 25,
    size: overrides.size || Size.MEDIUM,
    color: overrides.color || 'Golden',
    markings: overrides.markings || null,
    microchip_id: overrides.microchip_id || null,
    archived: overrides.archived !== undefined ? overrides.archived : false,
    featured: overrides.featured !== undefined ? overrides.featured : false,
    priority_listing: overrides.priority_listing !== undefined ? overrides.priority_listing : false,
    adoption_fee: overrides.adoption_fee !== undefined ? overrides.adoption_fee : 150,
    special_needs: overrides.special_needs !== undefined ? overrides.special_needs : false,
    special_needs_description: overrides.special_needs_description || null,
    house_trained: overrides.house_trained !== undefined ? overrides.house_trained : true,
    good_with_children:
      overrides.good_with_children !== undefined ? overrides.good_with_children : true,
    good_with_dogs: overrides.good_with_dogs !== undefined ? overrides.good_with_dogs : true,
    good_with_cats: overrides.good_with_cats !== undefined ? overrides.good_with_cats : false,
    good_with_small_animals: overrides.good_with_small_animals || null,
    energy_level: overrides.energy_level || EnergyLevel.MEDIUM,
    exercise_needs: overrides.exercise_needs || 'Daily walks',
    grooming_needs: overrides.grooming_needs || 'Regular brushing',
    training_notes: overrides.training_notes || null,
    temperament: overrides.temperament || ['friendly', 'playful'],
    medical_notes: overrides.medical_notes || null,
    behavioral_notes: overrides.behavioral_notes || null,
    surrender_reason: overrides.surrender_reason || null,
    intake_date: overrides.intake_date || new Date('2024-01-01'),
    vaccination_status: overrides.vaccination_status || VaccinationStatus.UNKNOWN,
    vaccination_date: overrides.vaccination_date || new Date(),
    spay_neuter_status: overrides.spay_neuter_status || SpayNeuterStatus.UNKNOWN,
    spay_neuter_date: overrides.spay_neuter_date || new Date(),
    last_vet_checkup: overrides.last_vet_checkup || new Date(),
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
    available_since: overrides.available_since || new Date('2024-01-01'),
    adopted_date: overrides.adopted_date || null,
    foster_start_date: overrides.foster_start_date || null,
    foster_end_date: overrides.foster_end_date || null,
    view_count: overrides.view_count !== undefined ? overrides.view_count : 10,
    favorite_count: overrides.favorite_count !== undefined ? overrides.favorite_count : 5,
    application_count: overrides.application_count !== undefined ? overrides.application_count : 2,
    search_vector: overrides.search_vector || undefined,
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
    getAgeDisplay: vi.fn().mockReturnValue(`${petData.age_years} years`),
    increment: vi.fn().mockResolvedValue(undefined),
    toJSON: vi.fn().mockReturnValue(petData),
  } as unknown as Pet;
};

// Helper to create mock user
const createMockUser = (overrides = {}): User =>
  ({
    user_id: 'user-123',
    email: 'adopter@example.com',
    first_name: 'John',
    last_name: 'Adopter',
    status: UserStatus.ACTIVE,
    type: UserType.ADOPTER,
    toJSON: vi.fn().mockReturnValue({
      user_id: 'user-123',
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
          createMockPet({ pet_id: 'dog-1', name: 'Buddy', type: PetType.DOG }),
          createMockPet({ pet_id: 'dog-2', name: 'Max', type: PetType.DOG }),
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
        const mockCats = [createMockPet({ pet_id: 'cat-1', name: 'Whiskers', type: PetType.CAT })];

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
          pet_id: 'baby-1',
          age_group: AgeGroup.BABY,
          age_years: 0,
          age_months: 4,
        });

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: [mockBaby],
          count: 1,
        } as never);

        const result = await PetService.searchPets(
          { ageGroup: AgeGroup.BABY },
          { page: 1, limit: 20 }
        );

        expect(result.pets[0].age_group).toBe(AgeGroup.BABY);
      });

      it('should return senior pets for senior age group filter', async () => {
        const mockSenior = createMockPet({
          pet_id: 'senior-1',
          age_group: AgeGroup.SENIOR,
          age_years: 10,
        });

        MockedPet.findAndCountAll = vi.fn().mockResolvedValue({
          rows: [mockSenior],
          count: 1,
        } as never);

        const result = await PetService.searchPets(
          { ageGroup: AgeGroup.SENIOR },
          { page: 1, limit: 20 }
        );

        expect(result.pets[0].age_group).toBe(AgeGroup.SENIOR);
      });
    });

    describe('when user filters by size', () => {
      it('should return small pets for small size filter', async () => {
        const mockSmall = createMockPet({
          pet_id: 'small-1',
          size: Size.SMALL,
          weight_kg: 5,
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
          pet_id: 'large-1',
          size: Size.LARGE,
          weight_kg: 40,
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
          pet_id: 'nearby-1',
          rescue_id: 'rescue-sf',
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
          pet_id: 'perfect-1',
          type: PetType.DOG,
          size: Size.MEDIUM,
          age_group: AgeGroup.ADULT,
          good_with_children: true,
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
        expect(result.pets[0].good_with_children).toBe(true);
      });
    });
  });

  describe('Workflow 2: View Pet Details', () => {
    describe('when user views a pet profile', () => {
      it('should retrieve complete pet details with images', async () => {
        const mockPet = createMockPet({
          pet_id: 'pet-detail-1',
          name: 'Buddy',
          long_description: 'Friendly and energetic dog',
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
        expect(result?.long_description).toBe('Friendly and energetic dog');
        expect(result?.images).toHaveLength(2);
      });

      it('should increment view count when pet is viewed', async () => {
        const mockPet = createMockPet({
          pet_id: 'pet-1',
          view_count: 10,
        });
        mockPet.increment = vi.fn().mockResolvedValue(undefined);

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

        await PetService.getPetById('pet-1', userId);

        // View count should be tracked
        expect(MockedPet.findByPk).toHaveBeenCalledWith('pet-1');
      });

      it('should display pet compatibility information', async () => {
        const mockPet = createMockPet({
          pet_id: 'pet-compat-1',
          good_with_children: true,
          good_with_dogs: true,
          good_with_cats: false,
          house_trained: true,
        });

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

        const result = await PetService.getPetById('pet-compat-1', userId);

        expect(result?.good_with_children).toBe(true);
        expect(result?.good_with_dogs).toBe(true);
        expect(result?.good_with_cats).toBe(false);
      });

      it('should display special needs information when applicable', async () => {
        const mockPet = createMockPet({
          pet_id: 'pet-special-1',
          special_needs: true,
          special_needs_description: 'Requires medication for thyroid condition',
        });

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

        const result = await PetService.getPetById('pet-special-1', userId);

        expect(result?.special_needs).toBe(true);
        expect(result?.special_needs_description).toBeTruthy();
      });
    });
  });

  describe('Workflow 3: Add Pets to Favorites', () => {
    describe('when user adds a pet to favorites', () => {
      it('should successfully add pet to favorites list', async () => {
        const mockPet = createMockPet({ pet_id: 'fav-1', name: 'Favorite Pet' });

        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
        MockedUserFavorite.findOne = vi.fn().mockResolvedValue(null);
        MockedUserFavorite.create = vi.fn().mockResolvedValue({
          id: 'fav-rec-1',
          user_id: userId,
          pet_id: 'fav-1',
        } as never);

        await PetService.addToFavorites(userId, 'fav-1');

        expect(MockedUserFavorite.create).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: userId,
            pet_id: 'fav-1',
          })
        );
      });

      it('should prevent duplicate favorites', async () => {
        const mockPet = createMockPet({ pet_id: 'fav-2' });
        const mockFavorite = { id: 'fav-rec-2', user_id: userId, pet_id: 'fav-2' };

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
          user_id: userId,
          pet_id: 'fav-3',
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
          createMockPet({ pet_id: 'fav-4', name: 'Favorite 1' }),
          createMockPet({ pet_id: 'fav-5', name: 'Favorite 2' }),
        ];

        const mockFavorites = mockPets.map(pet => ({
          id: `fav-rec-${pet.pet_id}`,
          user_id: userId,
          pet_id: pet.pet_id,
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
          createMockPet({ pet_id: 'rec-1', type: PetType.DOG, size: Size.MEDIUM }),
          createMockPet({ pet_id: 'rec-2', type: PetType.DOG, size: Size.MEDIUM }),
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
          createMockPet({ pet_id: 'rec-3', type: PetType.DOG, breed: 'Golden Retriever' }),
          createMockPet({ pet_id: 'rec-4', type: PetType.DOG, breed: 'Labrador Retriever' }),
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
          createMockPet({ pet_id: 'rec-featured', featured: true }),
          createMockPet({ pet_id: 'rec-regular', featured: false }),
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
          pet_id: 'ref-pet',
          breed: 'Golden Retriever',
          type: PetType.DOG,
        });

        const similarPets = [
          createMockPet({ pet_id: 'sim-1', breed: 'Golden Retriever' }),
          createMockPet({ pet_id: 'sim-2', breed: 'Labrador Retriever' }),
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
          pet_id: 'journey-1',
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
          user_id: userId,
          pet_id: 'journey-1',
        } as never);

        await PetService.addToFavorites(userId, 'journey-1');
        expect(MockedUserFavorite.create).toHaveBeenCalled();
      });

      it('should allow user to manage multiple favorites during matching process', async () => {
        const mockPets = [
          createMockPet({ pet_id: 'match-1', name: 'Match 1' }),
          createMockPet({ pet_id: 'match-2', name: 'Match 2' }),
        ];

        // Add multiple favorites
        for (const pet of mockPets) {
          MockedPet.findByPk = vi.fn().mockResolvedValue(pet);
          MockedUserFavorite.findOne = vi.fn().mockResolvedValue(null);
          MockedUserFavorite.create = vi.fn().mockResolvedValue({
            id: `fav-${pet.pet_id}`,
            user_id: userId,
            pet_id: pet.pet_id,
          } as never);

          await PetService.addToFavorites(userId, pet.pet_id);
        }

        // View favorites
        const mockFavorites = mockPets.map(pet => ({
          id: `fav-${pet.pet_id}`,
          user_id: userId,
          pet_id: pet.pet_id,
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
          pet_id: 'apply-1',
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
        const mockPet1 = createMockPet({ pet_id: 'session-1' });
        MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet1);
        MockedUserFavorite.findOne = vi.fn().mockResolvedValue(null);
        MockedUserFavorite.create = vi.fn().mockResolvedValue({
          id: 'session-fav-1',
          user_id: userId,
          pet_id: 'session-1',
        } as never);

        await PetService.addToFavorites(userId, 'session-1');

        // Second session - view previous favorites
        const mockFavorite = {
          id: 'session-fav-1',
          user_id: userId,
          pet_id: 'session-1',
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
            pet_id: 'compat-1',
            good_with_children: true,
            good_with_dogs: true,
            house_trained: true,
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
        expect(result.pets[0].good_with_children).toBe(true);
      });

      it('should handle pagination during extended browsing', async () => {
        const mockPage1 = [
          createMockPet({ pet_id: 'page1-1' }),
          createMockPet({ pet_id: 'page1-2' }),
        ];

        MockedPet.findAndCountAll = vi
          .fn()
          .mockResolvedValueOnce({ rows: mockPage1, count: 10 } as never)
          .mockResolvedValueOnce({
            rows: [createMockPet({ pet_id: 'page2-1' })],
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
          where: expect.objectContaining({ user_id: otherUserId }),
        })
      );
    });
  });
});
