import { Op } from 'sequelize';
import { vi } from 'vitest';
import { AuditLog } from '../../models/AuditLog';
import Breed from '../../models/Breed';
import Pet, {
  AgeGroup,
  EnergyLevel,
  Gender,
  PetStatus,
  PetType,
  Size,
  SpayNeuterStatus,
  VaccinationStatus,
} from '../../models/Pet';
import Rescue from '../../models/Rescue';
import { PetService } from '../../services/pet.service';
import {
  BulkPetOperation,
  PetCreateData,
  PetImageData,
  PetSearchFilters,
  PetStatusUpdate,
  PetUpdateData,
} from '../../types/pet';

// Mock only non-database dependencies
// Logger is already mocked in setup-tests.ts
vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: vi.fn().mockResolvedValue({}),
  },
}));

// Import Report model for real database operations
import Report from '../../models/Report';
import User, { UserStatus, UserType } from '../../models/User';
import StaffMember from '../../models/StaffMember';

import { AuditLogService } from '../../services/auditLog.service';
const mockAuditLog = AuditLogService.log as vi.MockedFunction<typeof AuditLogService.log>;

describe('PetService', () => {
  let testRescue: Rescue;
  let testCallerId: string;
  let testCounter = 0;

  // Helper to generate unique IDs
  const uniqueId = (prefix: string) => `${prefix}-${Date.now()}-${testCounter++}`;

  // Plan 2.4 — pet.breed is now an FK into the breeds lookup table.
  // Tests that previously created pets with `breed: 'Golden Retriever'`
  // need to find-or-create the breed and use the FK. This helper
  // returns the breed_id for a (species, name) pair, creating the row
  // on first ask.
  const breedIdFor = async (species: PetType, name: string): Promise<string> => {
    const [row] = await Breed.findOrCreate({
      where: { species, name },
      defaults: { species, name },
    });
    return row.breed_id;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuditLog.mockResolvedValue({
      id: 1,
      service: 'test',
      user: 'test-user',
      action: 'test-action',
      level: 'INFO',
      timestamp: new Date(),
      metadata: null,
      category: 'test',
      ip_address: null,
      user_agent: null,
    } as AuditLog);

    // Create test rescue with unique values
    const timestamp = Date.now();
    testRescue = await Rescue.create({
      rescueId: `rescue-${timestamp}-${testCounter++}`,
      name: `Test Rescue ${timestamp}`,
      email: `rescue${timestamp}-${testCounter}@test.com`,
      address: '123 Test Street',
      city: 'Test City',
      postcode: 'TEST123',
      contactPerson: 'Test Contact',
      status: 'verified',
      country: 'GB',
    });

    // Create a verified rescue-staff user and associate them with the test rescue.
    // Mutating PetService methods enforce rescue ownership, so callers that
    // are not admins must have a verified StaffMember row.
    testCallerId = `caller-${timestamp}-${testCounter++}`;
    await User.create({
      userId: testCallerId,
      email: `caller-${timestamp}@test.com`,
      firstName: 'Test',
      lastName: 'Caller',
      password: 'hashed-password',
      userType: UserType.RESCUE_STAFF,
      emailVerified: true,
      status: UserStatus.ACTIVE,
    });
    await StaffMember.create({
      rescueId: testRescue.rescueId,
      userId: testCallerId,
      isVerified: true,
      addedBy: testCallerId,
      addedAt: new Date(),
    });
  });

  describe('searchPets', () => {
    let pet1Id: string;
    let pet2Id: string;

    beforeEach(async () => {
      pet1Id = uniqueId('search-pet1');
      pet2Id = uniqueId('search-pet2');

      const goldenId = await breedIdFor(PetType.DOG, 'Golden Retriever');
      const persianId = await breedIdFor(PetType.CAT, 'Persian');

      // Create test pets
      await Pet.create({
        petId: pet1Id,
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breedId: goldenId,
        size: Size.LARGE,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        featured: true,
        priorityListing: false,
        rescueId: testRescue.rescueId,
        archived: false,
      });

      await Pet.create({
        petId: pet2Id,
        name: 'Whiskers',
        type: PetType.CAT,
        status: PetStatus.AVAILABLE,
        breedId: persianId,
        size: Size.MEDIUM,
        ageGroup: AgeGroup.YOUNG,
        gender: Gender.FEMALE,
        energyLevel: EnergyLevel.LOW,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.SPAYED,
        featured: false,
        priorityListing: true,
        rescueId: testRescue.rescueId,
        archived: false,
      });
    });

    it('should search pets with basic filters', async () => {
      const filters: PetSearchFilters = {
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
      };

      const result = await PetService.searchPets(filters, { page: 1, limit: 20 });

      expect(result.pets).toHaveLength(1);
      expect(result.pets[0].name).toBe('Buddy');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should search pets with text search', async () => {
      const filters: PetSearchFilters = {
        search: 'Golden',
      };

      const result = await PetService.searchPets(filters);

      // Plan 2.4 — search resolves the term against the breeds
      // lookup, so a search for "Golden" finds the Buddy pet whose
      // breedId points at the "Golden Retriever" breed row.
      expect(result.pets).toHaveLength(1);
      expect(result.pets[0].name).toBe('Buddy');
    });

    it('should handle range filters', async () => {
      // Update pets with adoption fees (stored in minor units — pence).
      await Pet.update({ adoptionFeeMinor: 25_000 }, { where: { petId: pet1Id } });
      await Pet.update({ adoptionFeeMinor: 15_000 }, { where: { petId: pet2Id } });

      const filters: PetSearchFilters = {
        adoptionFeeMin: 100,
        adoptionFeeMax: 200,
      };

      const result = await PetService.searchPets(filters);

      expect(result.pets).toHaveLength(1);
      expect(result.pets[0].name).toBe('Whiskers');
    });

    it('should handle pagination correctly', async () => {
      // Create more pets to test pagination
      for (let i = 3; i <= 25; i++) {
        await Pet.create({
          petId: uniqueId(`search-pet${i}`),
          name: `Pet ${i}`,
          type: PetType.DOG,
          status: PetStatus.AVAILABLE,
          breed: 'Mixed',
          size: Size.MEDIUM,
          ageGroup: AgeGroup.ADULT,
          gender: Gender.MALE,
          energyLevel: EnergyLevel.MEDIUM,
          vaccinationStatus: VaccinationStatus.UP_TO_DATE,
          spayNeuterStatus: SpayNeuterStatus.NEUTERED,
          featured: false,
          priorityListing: false,
          rescueId: testRescue.rescueId,
          archived: false,
        });
      }

      const result = await PetService.searchPets({}, { page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(3);
      expect(result.pets).toHaveLength(5); // 25 total, page 3 of 10 per page = 5 items
    });

    it('should handle search errors', async () => {
      // Create an invalid filter that would cause an error
      const filters: PetSearchFilters = {
        // Using an invalid operator that Sequelize won't understand
        type: { invalid: 'data' } as unknown as PetType,
      };

      await expect(PetService.searchPets(filters)).rejects.toThrow('Failed to search pets');
    });
  });

  describe('getPetById', () => {
    let testPet: Pet;
    let petId: string;

    beforeEach(async () => {
      petId = uniqueId('getById-pet');
      testPet = await Pet.create({
        petId: petId,
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
        archived: false,
        viewCount: 0,
      });
    });

    it('should get pet by ID and increment view count', async () => {
      const result = await PetService.getPetById(petId, 'user1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Buddy');

      // Reload to check view count was incremented
      await testPet.reload();
      expect(testPet.viewCount).toBe(1);

      expect(mockAuditLog).toHaveBeenCalledWith({
        action: 'VIEW',
        entity: 'Pet',
        entityId: petId,
        details: { userId: 'user1' },
        userId: 'user1',
      });
    });

    it('should return null for non-existent pet', async () => {
      const result = await PetService.getPetById('nonexistent');

      expect(result).toBeNull();
      expect(mockAuditLog).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Force an error by closing the database connection temporarily
      const originalFindByPk = Pet.findByPk;
      Pet.findByPk = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(PetService.getPetById(petId)).rejects.toThrow('Failed to retrieve pet');

      // Restore
      Pet.findByPk = originalFindByPk;
    });
  });

  describe('createPet', () => {
    it('should create a new pet successfully', async () => {
      const mockPetData: PetCreateData = {
        name: 'New Pet',
        type: PetType.DOG,
        ageGroup: AgeGroup.YOUNG,
        gender: Gender.MALE,
        status: PetStatus.AVAILABLE,
        size: Size.MEDIUM,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
      };

      const result = await PetService.createPet(mockPetData, testRescue.rescueId, 'user1');

      expect(result).toBeDefined();
      expect(result.name).toBe('New Pet');
      expect(result.type).toBe(PetType.DOG);
      expect(result.rescueId).toBe(testRescue.rescueId);

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entity: 'Pet',
          entityId: result.petId,
          userId: 'user1',
        })
      );
    });

    it('should handle validation errors', async () => {
      const mockPetData: PetCreateData = {
        name: '',
        type: PetType.DOG,
        ageGroup: AgeGroup.YOUNG,
        gender: Gender.MALE,
        status: PetStatus.AVAILABLE,
        size: Size.MEDIUM,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
      };

      // The service doesn't validate empty names but the model does
      await expect(
        PetService.createPet(mockPetData, testRescue.rescueId, 'user1')
      ).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      const mockPetData: PetCreateData = {
        name: 'New Pet',
        type: PetType.DOG,
        ageGroup: AgeGroup.YOUNG,
        gender: Gender.MALE,
        status: PetStatus.AVAILABLE,
        size: Size.MEDIUM,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
      };

      // Force an error
      const originalCreate = Pet.create;
      Pet.create = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(PetService.createPet(mockPetData, testRescue.rescueId, 'user1')).rejects.toThrow(
        'Database error'
      );

      // Restore
      Pet.create = originalCreate;
    });
  });

  describe('updatePet', () => {
    let testPet: Pet;
    let petId: string;

    beforeEach(async () => {
      petId = uniqueId('update-pet');
      testPet = await Pet.create({
        petId: petId,
        name: 'Original Name',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
        archived: false,
      });
    });

    const updateData: PetUpdateData = {
      name: 'Updated Name',
      shortDescription: 'Updated description',
    };

    it('should update pet successfully', async () => {
      const result = await PetService.updatePet(petId, updateData, testCallerId);

      expect(result.name).toBe('Updated Name');
      expect(result.shortDescription).toBe('Updated description');

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          entity: 'Pet',
          entityId: petId,
          userId: testCallerId,
        })
      );
    });

    it('should throw error for non-existent pet', async () => {
      await expect(PetService.updatePet('nonexistent', updateData, 'user1')).rejects.toThrow(
        'Pet not found'
      );
    });

    it('should allow updates to adopted pets (service permits it)', async () => {
      await testPet.update({ status: PetStatus.ADOPTED });

      const result = await PetService.updatePet(petId, updateData, testCallerId);
      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Name');
    });

    // ADS-367: previously the snake_case → camelCase mapping was a
    // tautological no-op (identical key/value strings) and snake_case
    // input was silently dropped before reaching the DB write whitelist.
    it('writes through snake_case keys for snake-cased clients [ADS-367]', async () => {
      const snakeUpdate = {
        short_description: 'Snake case wrote through',
        age_years: 7,
        good_with_children: true,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
      } as unknown as PetUpdateData;

      const result = await PetService.updatePet(petId, snakeUpdate, testCallerId);

      expect(result.shortDescription).toBe('Snake case wrote through');
      expect(result.ageYears).toBe(7);
      expect(result.goodWithChildren).toBe(true);
      expect(result.spayNeuterStatus).toBe(SpayNeuterStatus.NEUTERED);
    });

    it('prefers the camelCase value when both casings are sent [ADS-367]', async () => {
      const mixed = {
        shortDescription: 'camel wins',
        short_description: 'should be ignored',
      } as unknown as PetUpdateData;

      const result = await PetService.updatePet(petId, mixed, testCallerId);

      expect(result.shortDescription).toBe('camel wins');
    });
  });

  describe('updatePetStatus', () => {
    let testPet: Pet;
    let petId: string;

    beforeEach(async () => {
      petId = uniqueId('updateStatus-pet');
      testPet = await Pet.create({
        petId: petId,
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
        archived: false,
      });
    });

    const statusUpdate: PetStatusUpdate = {
      status: PetStatus.ADOPTED,
      reason: 'Successful adoption',
      effectiveDate: new Date(),
    };

    it('should update pet status successfully', async () => {
      const result = await PetService.updatePetStatus(petId, statusUpdate, testCallerId);

      expect(result.status).toBe(PetStatus.ADOPTED);
      expect(result.adoptedDate).toBeDefined();

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_STATUS',
          entity: 'Pet',
          entityId: petId,
          details: expect.objectContaining({
            originalStatus: PetStatus.AVAILABLE,
            newStatus: PetStatus.ADOPTED,
            reason: statusUpdate.reason,
            updatedBy: testCallerId,
          }),
          userId: testCallerId,
        })
      );
    });

    it('should throw error for non-existent pet', async () => {
      await expect(
        PetService.updatePetStatus('nonexistent', statusUpdate, 'user1')
      ).rejects.toThrow('Pet not found');
    });
  });

  describe('deletePet', () => {
    let testPet: Pet;
    let petId: string;

    beforeEach(async () => {
      petId = uniqueId('delete-pet');
      testPet = await Pet.create({
        petId: petId,
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
        archived: false,
      });
    });

    it('should soft delete pet successfully', async () => {
      const result = await PetService.deletePet(petId, testCallerId, 'No longer available');

      expect(result.message).toBe('Pet deleted successfully');

      // Verify soft delete
      const deletedPet = await Pet.findByPk(petId);
      expect(deletedPet).toBeNull();

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          entity: 'Pet',
          entityId: petId,
          details: expect.objectContaining({
            reason: 'No longer available',
            deletedBy: testCallerId,
          }),
          userId: testCallerId,
        })
      );
    });

    it('should throw error for non-existent pet', async () => {
      await expect(PetService.deletePet('nonexistent', 'user1')).rejects.toThrow('Pet not found');
    });

    it('should delete adopted pets (service allows it)', async () => {
      await testPet.update({ status: PetStatus.ADOPTED });

      const result = await PetService.deletePet(petId, testCallerId);
      expect(result.message).toBe('Pet deleted successfully');
    });
  });

  describe('addPetImages', () => {
    let testPet: Pet;
    let petId: string;

    beforeEach(async () => {
      petId = uniqueId('addImages-pet');
      testPet = await Pet.create({
        petId: petId,
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
        archived: false,
      });
    });

    const newImages: PetImageData[] = [
      {
        url: 'https://example.com/image1.jpg',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        caption: 'Main photo',
        isPrimary: true,
        orderIndex: 0,
      },
    ];

    it('should add images to pet successfully', async () => {
      // Pet.images JSONB extracted to pet_media (plan 2.1) — assert that
      // the row was inserted into PetMedia rather than that the JSONB
      // column on the pet was mutated.
      const { default: PetMedia, PetMediaType } = await import('../../models/PetMedia');

      await PetService.addPetImages(petId, newImages, 'user1');

      const rows = await PetMedia.findAll({ where: { pet_id: petId } });
      expect(rows).toHaveLength(1);
      expect(rows[0].url).toBe('https://example.com/image1.jpg');
      expect(rows[0].is_primary).toBe(true);
      expect(rows[0].type).toBe(PetMediaType.IMAGE);

      expect(mockAuditLog).toHaveBeenCalled();
    });

    it('should throw error for non-existent pet', async () => {
      await expect(PetService.addPetImages('nonexistent', newImages, 'user1')).rejects.toThrow(
        'Pet not found'
      );
    });

    it('should handle empty URL (service does not validate)', async () => {
      const invalidImages = [{ url: '', isPrimary: false, orderIndex: 0 }];

      const result = await PetService.addPetImages(petId, invalidImages, 'user1');
      expect(result).toBeDefined();
    });
  });

  describe('getPetsByRescue', () => {
    beforeEach(async () => {
      await Pet.create({
        petId: uniqueId('byRescue-pet1'),
        name: 'Pet 1',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.MEDIUM,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
        archived: false,
      });

      await Pet.create({
        petId: 'pet2',
        name: 'Pet 2',
        type: PetType.CAT,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.SMALL,
        ageGroup: AgeGroup.YOUNG,
        gender: Gender.FEMALE,
        energyLevel: EnergyLevel.LOW,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.SPAYED,
        rescueId: testRescue.rescueId,
        archived: false,
      });
    });

    it('should get pets by rescue with pagination', async () => {
      const result = await PetService.getPetsByRescue(testRescue.rescueId, 1, 20);

      expect(result.pets).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getFeaturedPets', () => {
    beforeEach(async () => {
      await Pet.create({
        petId: uniqueId('featured-pet1'),
        name: 'Featured Pet 1',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.MEDIUM,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
        featured: true,
        archived: false,
      });

      await Pet.create({
        petId: uniqueId('featured-pet2'),
        name: 'Featured Pet 2',
        type: PetType.CAT,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.SMALL,
        ageGroup: AgeGroup.YOUNG,
        gender: Gender.FEMALE,
        energyLevel: EnergyLevel.LOW,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.SPAYED,
        rescueId: testRescue.rescueId,
        featured: true,
        archived: false,
      });
    });

    it('should get featured pets', async () => {
      const result = await PetService.getFeaturedPets(5);

      expect(result).toHaveLength(2);
      expect(result.every(pet => pet.featured)).toBe(true);
    });
  });

  describe('getPetStatistics', () => {
    beforeEach(async () => {
      // Create a variety of pets for statistics
      await Pet.bulkCreate([
        {
          petId: uniqueId('stats-pet1'),
          name: 'Dog 1',
          type: PetType.DOG,
          status: PetStatus.AVAILABLE,
          breed: 'Labrador',
          size: Size.LARGE,
          ageGroup: AgeGroup.ADULT,
          gender: Gender.MALE,
          energyLevel: EnergyLevel.HIGH,
          vaccinationStatus: VaccinationStatus.UP_TO_DATE,
          spayNeuterStatus: SpayNeuterStatus.NEUTERED,
          rescueId: testRescue.rescueId,
          featured: true,
          specialNeeds: false,
          archived: false,
        },
        {
          petId: uniqueId('stats-pet2'),
          name: 'Cat 1',
          type: PetType.CAT,
          status: PetStatus.ADOPTED,
          breed: 'Persian',
          size: Size.MEDIUM,
          ageGroup: AgeGroup.YOUNG,
          gender: Gender.FEMALE,
          energyLevel: EnergyLevel.LOW,
          vaccinationStatus: VaccinationStatus.UP_TO_DATE,
          spayNeuterStatus: SpayNeuterStatus.SPAYED,
          rescueId: testRescue.rescueId,
          specialNeeds: true,
          archived: false,
        },
        {
          petId: uniqueId('stats-pet3'),
          name: 'Dog 2',
          type: PetType.DOG,
          status: PetStatus.FOSTER,
          breed: 'Golden Retriever',
          size: Size.LARGE,
          ageGroup: AgeGroup.ADULT,
          gender: Gender.MALE,
          energyLevel: EnergyLevel.MEDIUM,
          vaccinationStatus: VaccinationStatus.UP_TO_DATE,
          spayNeuterStatus: SpayNeuterStatus.NEUTERED,
          rescueId: testRescue.rescueId,
          archived: false,
        },
      ]);
    });

    it('should get pet statistics', async () => {
      const result = await PetService.getPetStatistics();

      expect(result.totalPets).toBe(3);
      expect(result.availablePets).toBe(1);
      expect(result.adoptedPets).toBe(1);
      expect(result.fosterPets).toBe(1);
      expect(result.featuredPets).toBe(1);
      expect(result.specialNeedsPets).toBe(1);

      expect(result.petsByType).toBeDefined();
      expect(result.petsByType[PetType.DOG]).toBe(2);
      expect(result.petsByType[PetType.CAT]).toBe(1);
    });
  });

  describe('bulkUpdatePets', () => {
    let pet1: Pet;
    let pet2: Pet;
    let pet1Id: string;
    let pet2Id: string;

    beforeEach(async () => {
      pet1Id = uniqueId('bulk-pet1');
      pet2Id = uniqueId('bulk-pet2');
      pet1 = await Pet.create({
        petId: pet1Id,
        name: 'Pet 1',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.MEDIUM,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
        archived: false,
      });

      pet2 = await Pet.create({
        petId: pet2Id,
        name: 'Pet 2',
        type: PetType.CAT,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.SMALL,
        ageGroup: AgeGroup.YOUNG,
        gender: Gender.FEMALE,
        energyLevel: EnergyLevel.LOW,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.SPAYED,
        rescueId: testRescue.rescueId,
        archived: false,
      });
    });

    it('should perform bulk status update successfully', async () => {
      const operation: BulkPetOperation = {
        petIds: [pet1Id, pet2Id],
        operation: 'update_status',
        data: { status: PetStatus.ADOPTED, reason: 'Bulk adoption' },
        reason: 'Bulk adoption',
      };

      const result = await PetService.bulkUpdatePets(operation, testCallerId);

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify updates
      await pet1.reload();
      await pet2.reload();
      expect(pet1.status).toBe(PetStatus.ADOPTED);
      expect(pet2.status).toBe(PetStatus.ADOPTED);
    });

    it('should handle partial failures in bulk operation', async () => {
      const operation: BulkPetOperation = {
        petIds: [pet1Id, 'nonexistent'],
        operation: 'archive',
        reason: 'Bulk archive',
      };

      const result = await PetService.bulkUpdatePets(operation, testCallerId);

      // ADS-372: archive now runs assertCallerOwnsPet per pet, which loads
      // the row and throws 404 for missing IDs — surfacing the failure
      // instead of silently no-op-ing the Pet.update against zero rows.
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0]).toMatchObject({ petId: 'nonexistent' });
    });

    it('rejects bulk archive of pets owned by another rescue [ADS-372]', async () => {
      // Set up a second rescue with its own pet, then attempt to archive it
      // from testCallerId (who is staff of testRescue, not the second one).
      const otherRescue = await Rescue.create({
        rescueId: uniqueId('rescue-other'),
        name: 'Other Rescue',
        email: `other-${Date.now()}@test.com`,
        address: '999 Other St',
        city: 'Other City',
        postcode: 'OTHER1',
        contactPerson: 'Other Contact',
        status: 'verified',
        country: 'GB',
      });
      const foreignPetId = uniqueId('foreign-pet');
      await Pet.create({
        petId: foreignPetId,
        name: 'Foreign Pet',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.MEDIUM,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: otherRescue.rescueId,
        archived: false,
      });

      const operation: BulkPetOperation = {
        petIds: [foreignPetId],
        operation: 'archive',
      };

      // The pre-flight ownership check on the bulk operation rejects the
      // whole batch — the caller should not be able to archive a pet they
      // don't own.
      await expect(PetService.bulkUpdatePets(operation, testCallerId)).rejects.toThrow(
        /Access denied/
      );

      const foreign = await Pet.findByPk(foreignPetId);
      expect(foreign?.archived).toBe(false);
    });

    it('rejects bulk feature toggle on pets owned by another rescue [ADS-372]', async () => {
      const otherRescue = await Rescue.create({
        rescueId: uniqueId('rescue-other-2'),
        name: 'Other Rescue 2',
        email: `other2-${Date.now()}@test.com`,
        address: '888 Other St',
        city: 'Other City',
        postcode: 'OTHER2',
        contactPerson: 'Other Contact 2',
        status: 'verified',
        country: 'GB',
      });
      const foreignPetId = uniqueId('foreign-pet-feature');
      await Pet.create({
        petId: foreignPetId,
        name: 'Foreign Featured Pet',
        type: PetType.CAT,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.SMALL,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.FEMALE,
        energyLevel: EnergyLevel.LOW,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.SPAYED,
        rescueId: otherRescue.rescueId,
        archived: false,
        featured: false,
      });

      const operation: BulkPetOperation = {
        petIds: [foreignPetId],
        operation: 'feature',
        data: { featured: true },
      };

      await expect(PetService.bulkUpdatePets(operation, testCallerId)).rejects.toThrow(
        /Access denied/
      );

      const foreign = await Pet.findByPk(foreignPetId);
      expect(foreign?.featured).toBe(false);
    });

    it('should handle unsupported operation by returning error result', async () => {
      const operation: BulkPetOperation = {
        petIds: ['pet1'],
        operation: 'invalid_operation' as 'archive',
      };

      const result = await PetService.bulkUpdatePets(operation, testCallerId);

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0].error).toContain('Unknown operation: invalid_operation');
    });
  });

  describe('getPetActivity', () => {
    let testPet: Pet;
    let petId: string;

    beforeEach(async () => {
      petId = uniqueId('activity-pet');
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      testPet = await Pet.create({
        petId: petId,
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
        archived: false,
        viewCount: 50,
        favoriteCount: 10,
        applicationCount: 3,
        createdAt: sevenDaysAgo,
      });
    });

    it('should get pet activity statistics', async () => {
      const result = await PetService.getPetActivity(petId);

      expect(result.petId).toBe(petId);
      expect(result.viewCount).toBe(50);
      expect(result.favoriteCount).toBe(10);
      expect(result.applicationCount).toBe(3);
      expect(result.daysSincePosted).toBe(7);
      expect(result.averageViewsPerDay).toBeCloseTo(7.14, 1);
    });

    it('should throw error for non-existent pet', async () => {
      await expect(PetService.getPetActivity('nonexistent')).rejects.toThrow(
        'Failed to retrieve pet activity'
      );
    });
  });

  describe('getRecentPets', () => {
    beforeEach(async () => {
      await Pet.bulkCreate([
        {
          petId: uniqueId('recent-pet1'),
          name: 'Buddy',
          type: PetType.DOG,
          status: PetStatus.AVAILABLE,
          breed: 'Golden Retriever',
          size: Size.LARGE,
          ageGroup: AgeGroup.ADULT,
          gender: Gender.MALE,
          energyLevel: EnergyLevel.MEDIUM,
          vaccinationStatus: VaccinationStatus.UP_TO_DATE,
          spayNeuterStatus: SpayNeuterStatus.NEUTERED,
          rescueId: testRescue.rescueId,
          archived: false,
          createdAt: new Date('2025-07-08T10:00:00Z'),
        },
        {
          petId: uniqueId('recent-pet2'),
          name: 'Whiskers',
          type: PetType.CAT,
          status: PetStatus.AVAILABLE,
          breed: 'Persian',
          size: Size.MEDIUM,
          ageGroup: AgeGroup.YOUNG,
          gender: Gender.FEMALE,
          energyLevel: EnergyLevel.LOW,
          vaccinationStatus: VaccinationStatus.UP_TO_DATE,
          spayNeuterStatus: SpayNeuterStatus.SPAYED,
          rescueId: testRescue.rescueId,
          archived: false,
          createdAt: new Date('2025-07-08T09:00:00Z'),
        },
      ]);
    });

    it('should return recent pets with default limit', async () => {
      const result = await PetService.getRecentPets();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Buddy'); // Most recent first
    });

    it('should return recent pets with custom limit', async () => {
      const result = await PetService.getRecentPets(1);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Buddy');
    });

    it('should handle errors gracefully', async () => {
      const originalFindAll = Pet.findAll;
      Pet.findAll = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(PetService.getRecentPets()).rejects.toThrow('Failed to retrieve recent pets');

      Pet.findAll = originalFindAll;
    });
  });

  describe('getPetBreedsByType', () => {
    // Plan 2.4 — breeds live in the typed table now. The endpoint
    // returns the catalogue of breed names per species, so the test
    // setup seeds the breeds table directly rather than seeding pets
    // and inferring breeds from them.
    beforeEach(async () => {
      await breedIdFor(PetType.DOG, 'Golden Retriever');
      await breedIdFor(PetType.DOG, 'Labrador Retriever');
      await breedIdFor(PetType.DOG, 'German Shepherd');
    });

    it('should return breeds for valid pet type', async () => {
      const result = await PetService.getPetBreedsByType('dog');

      expect(result).toHaveLength(3);
      expect(result).toContain('German Shepherd');
      expect(result).toContain('Golden Retriever');
      expect(result).toContain('Labrador Retriever');
    });

    it('should not return breeds from other species', async () => {
      // Cat breeds shouldn't leak into a dog query (plan 2.4 — the
      // species discriminator gates the result set).
      await breedIdFor(PetType.CAT, 'Persian');
      await breedIdFor(PetType.CAT, 'Siamese');

      const result = await PetService.getPetBreedsByType('dog');

      expect(result).not.toContain('Persian');
      expect(result).not.toContain('Siamese');
      expect(result).toHaveLength(3);
    });

    it('should throw error for invalid pet type', async () => {
      await expect(PetService.getPetBreedsByType('invalid')).rejects.toThrow(
        'Invalid pet type: invalid'
      );
    });

    it('should handle database errors', async () => {
      // Mock the new lookup target — Breed.findAll, not Pet.findAll.
      // Use try/finally so a failed assertion doesn't leak the mock
      // into downstream tests (the previous version did, breaking
      // every later test that called Pet.findAll).
      const originalFindAll = Breed.findAll;
      Breed.findAll = vi.fn().mockRejectedValue(new Error('Database error'));
      try {
        await expect(PetService.getPetBreedsByType('dog')).rejects.toThrow(
          'Failed to retrieve breeds for pet type: dog'
        );
      } finally {
        Breed.findAll = originalFindAll;
      }
    });
  });

  describe('getPetTypes', () => {
    it('should return all pet types', async () => {
      const result = await PetService.getPetTypes();

      expect(result).toEqual([
        'dog',
        'cat',
        'rabbit',
        'bird',
        'reptile',
        'small_mammal',
        'fish',
        'other',
      ]);
    });
  });

  describe('getSimilarPets', () => {
    let referencePet: Pet;
    let refPetId: string;
    let goldenId: string;
    let labradorId: string;

    beforeEach(async () => {
      // Plan 2.4 — pets reference breeds by FK; resolve names to ids
      // first so the similarity query can match on breed_id.
      goldenId = await breedIdFor(PetType.DOG, 'Golden Retriever');
      labradorId = await breedIdFor(PetType.DOG, 'Labrador Retriever');

      refPetId = uniqueId('similar-ref');
      referencePet = await Pet.create({
        petId: refPetId,
        name: 'Reference Dog',
        type: PetType.DOG,
        breedId: goldenId,
        status: PetStatus.AVAILABLE,
        size: Size.LARGE,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
        archived: false,
      });

      await Pet.bulkCreate([
        {
          petId: uniqueId('similar-1'),
          name: 'Similar Dog 1',
          type: PetType.DOG,
          breedId: goldenId,
          status: PetStatus.AVAILABLE,
          size: Size.LARGE,
          ageGroup: AgeGroup.ADULT,
          gender: Gender.FEMALE,
          energyLevel: EnergyLevel.MEDIUM,
          vaccinationStatus: VaccinationStatus.UP_TO_DATE,
          spayNeuterStatus: SpayNeuterStatus.SPAYED,
          rescueId: testRescue.rescueId,
          archived: false,
        },
        {
          petId: uniqueId('similar-2'),
          name: 'Similar Dog 2',
          type: PetType.DOG,
          breedId: labradorId,
          status: PetStatus.AVAILABLE,
          size: Size.LARGE,
          ageGroup: AgeGroup.YOUNG,
          gender: Gender.MALE,
          energyLevel: EnergyLevel.HIGH,
          vaccinationStatus: VaccinationStatus.UP_TO_DATE,
          spayNeuterStatus: SpayNeuterStatus.NEUTERED,
          rescueId: testRescue.rescueId,
          archived: false,
        },
      ]);
    });

    it('should return similar pets based on breed, type, size, and age', async () => {
      const result = await PetService.getSimilarPets(refPetId, 6);

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(6);
      expect(result.every(pet => pet.petId !== refPetId)).toBe(true);
    });

    it('should throw error for non-existent pet', async () => {
      await expect(PetService.getSimilarPets('nonexistent')).rejects.toThrow('Pet not found');
    });

    it('should handle database errors', async () => {
      // try/finally so a failed assertion doesn't leak mocks into
      // downstream tests (the previous version did and broke
      // unrelated tests downstream).
      const originalFindByPk = Pet.findByPk;
      const originalFindAll = Pet.findAll;
      Pet.findByPk = vi.fn().mockResolvedValue(referencePet);
      Pet.findAll = vi.fn().mockRejectedValue(new Error('Database error'));
      try {
        await expect(PetService.getSimilarPets(refPetId)).rejects.toThrow(
          'Failed to retrieve similar pets'
        );
      } finally {
        Pet.findByPk = originalFindByPk;
        Pet.findAll = originalFindAll;
      }
    });

    it('should safely handle pets whose breed has SQL-injection-y characters', async () => {
      // The breed name itself can't contain malicious SQL anymore —
      // it's a row in the breeds catalogue. The id is a UUID. So the
      // SQL-injection vector from the JSONB era is structurally
      // closed. This test now just sanity-checks that a pet with an
      // exotic breed name doesn't break the similar-pets query.
      const exoticBreedId = await breedIdFor(PetType.DOG, "O'Reilly's Hound");
      const exoticPetId = uniqueId('sqli-ref');
      await Pet.create({
        petId: exoticPetId,
        name: 'Exotic Pet',
        type: PetType.DOG,
        breedId: exoticBreedId,
        status: PetStatus.AVAILABLE,
        size: Size.LARGE,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
        archived: false,
      });

      const result = await PetService.getSimilarPets(exoticPetId, 6);
      expect(Array.isArray(result)).toBe(true);

      const petCount = await Pet.count();
      expect(petCount).toBeGreaterThan(0);
    });
  });

  describe('reportPet', () => {
    let testPet: Pet;
    let petId: string;
    let testUser: User;
    let userId: string;

    beforeEach(async () => {
      userId = uniqueId('user');

      // Create a test user for reporting
      testUser = await User.create({
        userId,
        email: `reporter-${Date.now()}-${testCounter}@test.com`,
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'Reporter',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        rescueId: null,
      });

      const goldenId = await breedIdFor(PetType.DOG, 'Golden Retriever');

      petId = uniqueId('report-pet');
      testPet = await Pet.create({
        petId: petId,
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breedId: goldenId,
        size: Size.LARGE,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: testRescue.rescueId,
        archived: false,
      });
    });

    it('should create a pet report successfully', async () => {
      const result = await PetService.reportPet(
        petId,
        userId,
        'inappropriate_content',
        'This pet listing contains inappropriate images'
      );

      expect(result).toHaveProperty('reportId');
      expect(result).toHaveProperty('message', 'Report submitted successfully');

      // Verify the report was created
      const reports = await Report.findAll({ where: { reportedEntityId: petId } });
      expect(reports).toHaveLength(1);
      expect(reports[0].reportedEntityType).toBe('pet');
      expect(reports[0].reporterId).toBe(userId);
      expect(reports[0].category).toBe('inappropriate_content');
    });

    it('should throw error for non-existent pet', async () => {
      await expect(PetService.reportPet('nonexistent', userId, 'spam')).rejects.toThrow(
        'Pet not found'
      );
    });

    it('should handle report creation errors', async () => {
      // Force an error by temporarily breaking the create method
      const originalCreate = Report.create;
      Report.create = vi.fn().mockRejectedValue(new Error('Report creation failed'));

      await expect(PetService.reportPet(petId, 'user-456', 'spam')).rejects.toThrow(
        'Failed to submit pet report'
      );

      // Restore
      Report.create = originalCreate;
    });
  });

  // ADS-348: Cross-rescue IDOR — staff of rescue A must not mutate pets
  // belonging to rescue B. Every mutating PetService method must enforce this.
  describe('cross-rescue ownership enforcement', () => {
    let rescueA: Rescue;
    let rescueB: Rescue;
    let staffAUserId: string;
    let petOfRescueB: Pet;
    let petIdB: string;

    beforeEach(async () => {
      // testRescue is already created by the outer beforeEach; use it as rescue A
      rescueA = testRescue;
      staffAUserId = testCallerId; // verified staff of rescue A

      const ts = Date.now();
      const counter = testCounter++;

      // Create a second rescue (rescue B)
      rescueB = await Rescue.create({
        rescueId: `rescue-b-${ts}-${counter}`,
        name: `Rescue B ${ts}`,
        email: `rescue-b-${ts}@test.com`,
        address: '456 Other Street',
        city: 'Other City',
        postcode: 'OTH456',
        contactPerson: 'Other Contact',
        status: 'verified',
        country: 'GB',
      });

      const goldenId = await breedIdFor(PetType.DOG, 'Golden Retriever');

      // Create a pet that belongs to rescue B
      petIdB = `pet-b-${ts}-${counter}`;
      petOfRescueB = await Pet.create({
        petId: petIdB,
        name: 'Rescue B Pet',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breedId: goldenId,
        size: Size.LARGE,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: rescueB.rescueId,
        archived: false,
      });
    });

    it('updatePet: rescue A staff cannot update a rescue B pet', async () => {
      await expect(
        PetService.updatePet(petIdB, { name: 'Hacked Name' }, staffAUserId)
      ).rejects.toMatchObject({ statusCode: 403 });

      // The pet must be unchanged
      await petOfRescueB.reload();
      expect(petOfRescueB.name).toBe('Rescue B Pet');
    });

    it('updatePetStatus: rescue A staff cannot change status of a rescue B pet', async () => {
      await expect(
        PetService.updatePetStatus(
          petIdB,
          { status: PetStatus.ADOPTED, reason: 'IDOR attempt' },
          staffAUserId
        )
      ).rejects.toMatchObject({ statusCode: 403 });

      await petOfRescueB.reload();
      expect(petOfRescueB.status).toBe(PetStatus.AVAILABLE);
    });

    it('deletePet: rescue A staff cannot delete a rescue B pet', async () => {
      await expect(PetService.deletePet(petIdB, staffAUserId)).rejects.toMatchObject({
        statusCode: 403,
      });

      // The pet must still exist (soft-delete was not applied)
      const stillThere = await Pet.findByPk(petIdB);
      expect(stillThere).not.toBeNull();
    });

    it('updatePetImages: rescue A staff cannot replace images of a rescue B pet', async () => {
      await expect(
        PetService.updatePetImages(
          petIdB,
          [{ url: 'https://evil.com/img.jpg', isPrimary: true }],
          staffAUserId
        )
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('removePetImage: rescue A staff cannot remove an image from a rescue B pet', async () => {
      await expect(
        PetService.removePetImage(petIdB, 'some-image-id', staffAUserId)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('bulkUpdatePets: mixed-rescue payload is rejected with no mutations applied', async () => {
      // pet of rescue A (belongs to staffA's rescue) + pet of rescue B
      const petIdA = uniqueId('pet-a-bulk');
      await Pet.create({
        petId: petIdA,
        name: 'Rescue A Pet',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breedId: await breedIdFor(PetType.DOG, 'Golden Retriever'),
        size: Size.LARGE,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: rescueA.rescueId,
        archived: false,
      });

      await expect(
        PetService.bulkUpdatePets({ petIds: [petIdA, petIdB], operation: 'archive' }, staffAUserId)
      ).rejects.toMatchObject({ statusCode: 403 });

      // Neither pet should have been archived
      const petA = await Pet.findByPk(petIdA);
      const petB = await Pet.findByPk(petIdB);
      expect(petA?.archived).toBe(false);
      expect(petB?.archived).toBe(false);
    });

    it('admin user bypasses cross-rescue check and can mutate any pet', async () => {
      const ts = Date.now();
      const adminId = `admin-${ts}-${testCounter++}`;
      await User.create({
        userId: adminId,
        email: `admin-${ts}@test.com`,
        firstName: 'Admin',
        lastName: 'User',
        password: 'hashed-password',
        userType: UserType.ADMIN,
        emailVerified: true,
      });

      const result = await PetService.updatePet(petIdB, { name: 'Admin Updated' }, adminId);
      expect(result.name).toBe('Admin Updated');
    });

    it('unverified staff cannot mutate even their own rescue pets', async () => {
      const ts = Date.now();
      const unverifiedId = `unverified-${ts}-${testCounter++}`;
      await User.create({
        userId: unverifiedId,
        email: `unverified-${ts}@test.com`,
        firstName: 'Unverified',
        lastName: 'Staff',
        password: 'hashed-password',
        userType: UserType.RESCUE_STAFF,
        emailVerified: true,
      });
      // Staff member row for rescue A but isVerified = false
      await StaffMember.create({
        rescueId: rescueA.rescueId,
        userId: unverifiedId,
        isVerified: false,
        addedBy: testCallerId,
        addedAt: new Date(),
      });

      // Create a pet belonging to rescue A (the unverified user's own rescue)
      const ownRescuePetId = uniqueId('own-rescue-pet');
      await Pet.create({
        petId: ownRescuePetId,
        name: 'Own Rescue Pet',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breedId: await breedIdFor(PetType.DOG, 'Golden Retriever'),
        size: Size.LARGE,
        ageGroup: AgeGroup.ADULT,
        gender: Gender.MALE,
        energyLevel: EnergyLevel.MEDIUM,
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        rescueId: rescueA.rescueId,
        archived: false,
      });

      await expect(
        PetService.updatePet(ownRescuePetId, { name: 'Hacked' }, unverifiedId)
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
